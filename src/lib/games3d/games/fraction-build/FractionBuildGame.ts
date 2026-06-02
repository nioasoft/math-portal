import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createFractionGenerator, type FractionProblem } from './problems';

// Theme: a PIZZA / PIE viewed top-down. The pie is split into `denominator`
// wedge meshes. Empty wedges read as plain pale dough; a filled wedge becomes a
// topped slice (warm sauce/cheese red) that pops into place and sits slightly
// raised. A thin crust rim frames the whole pie. Tapping a wedge toggles its
// topping; the overlay בדוק / נקה controls confirm / clear (consistent with the
// sibling games).
const RADIUS = 3;
const HEIGHT = 0.5;
const RAISE = 0.18; // a filled slice sits slightly proud of the dough
const RIM_TUBE = 0.18; // crust rim thickness
const RADIAL_SEGMENTS = 40;
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Pizza palette: pale dough for empty wedges, warm sauce/cheese for filled.
const DOUGH_COLOR = 0xf3e0b8; // pale baked dough
const TOPPING_COLOR = PALETTE.coral; // warm sauce/cheese red
const CRUST_COLOR = 0xd9a35a; // golden-brown crust rim

export const fractionBuildGame: Game3D = {
  meta: {
    id: 'fraction-build',
    i18nKey: 'games3d.fractionBuild',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Top-down view straight onto the pie.
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 9);

    // Clay/toy look — warm pizzeria ambience. Ground disabled (top-down view: the
    // pie itself reads as the surface). The engine provides the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#ffe9c7',
      bottomColor: '#f6d9a8',
      ground: false,
      shadowArea: 7,
      fog: false,
    });

    const generator = createFractionGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // Pie wedges live in this group; rebuilt each problem.
    const group = new THREE.Group();
    ctx.scene.add(group);

    // Shared materials for every wedge (dough vs topping). Disposed once.
    const doughMat = new THREE.MeshStandardMaterial({
      color: DOUGH_COLOR,
      roughness: 0.85,
      metalness: 0.02,
    });
    const toppingMat = new THREE.MeshStandardMaterial({
      color: TOPPING_COLOR,
      roughness: 0.55,
      metalness: 0.04,
    });

    // Crust rim: a torus framing the pie's outer edge.
    const rimGeo = new THREE.TorusGeometry(RADIUS, RIM_TUBE, 14, RADIAL_SEGMENTS);
    const rimMat = new THREE.MeshStandardMaterial({ color: CRUST_COLOR, roughness: 0.8, metalness: 0.03 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2; // lie flat in the XZ plane
    rim.castShadow = true;
    rim.receiveShadow = true;
    ctx.scene.add(rim);

    // Per-problem wedge geometries (one per slice) — tracked so we can dispose all.
    const wedgeGeos: THREE.CylinderGeometry[] = [];
    let wedges: THREE.Mesh[] = [];
    const filled = new Set<number>();

    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as FractionProblem,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('fractionBuild.prompt', {
          num: state.problem.numerator,
          den: state.problem.denominator,
        })
      );
    }

    function showStatus(): void {
      if (quiz) {
        ctx.status.set({ streak: state.streak, progress: { current: state.answered, total: QUIZ_LENGTH } });
      } else {
        ctx.status.set({
          streak: state.streak,
          stars: Math.min(3, Math.floor(state.streak / 3)),
          maxStars: 3,
        });
      }
    }

    /** Visually sync a wedge to its filled/empty state (material, height, raise). */
    function applyWedgeLook(idx: number): void {
      const wedge = wedges[idx];
      if (filled.has(idx)) {
        wedge.material = toppingMat;
        wedge.position.y = RAISE;
      } else {
        wedge.material = doughMat;
        wedge.position.y = 0;
      }
    }

    /** Build the wedge meshes for the current problem's denominator. */
    function buildPie(): void {
      stopAllTweens();
      group.clear();
      wedgeGeos.forEach((g) => g.dispose());
      wedgeGeos.length = 0;
      wedges = [];
      filled.clear();
      const n = state.problem.denominator;
      const theta = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        // A pie wedge = a partial cylinder (thetaStart/thetaLength carve the slice).
        const geo = new THREE.CylinderGeometry(
          RADIUS,
          RADIUS,
          HEIGHT,
          RADIAL_SEGMENTS,
          1,
          false,
          i * theta,
          theta
        );
        wedgeGeos.push(geo);
        const wedge = new THREE.Mesh(geo, doughMat);
        wedge.userData.index = i;
        wedge.castShadow = true;
        wedge.receiveShadow = true;
        group.add(wedge);
        wedges.push(wedge);
      }
      showPrompt();
    }

    function refresh(): void {
      buildPie();
      showStatus();
    }

    function startNewProblem(): void {
      if (quiz) {
        state.problem = quiz.state().current;
      } else {
        state.problem = generator.next();
      }
      refresh();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('fractionBuild.correct', {
          num: state.problem.numerator,
          den: state.problem.denominator,
        })
      );
      track(punch(group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong();
      track(shake(group, 0.07, 280));
    }

    /** Submit the filled-slice count as the answer. The count can be wrong by design. */
    function confirm(): void {
      const answer = filled.size;
      const ok = generator.check(state.problem, answer);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(answer);
        const qs = quiz.state();
        state.answered = qs.index;
        ctx.score.set(qs.score);
        if (qs.finished) {
          const summary = quiz.summary();
          const stars = computeStars(summary.accuracy);
          ctx.status.set({
            stars,
            maxStars: 3,
            streak: state.streak,
            progress: { current: QUIZ_LENGTH, total: QUIZ_LENGTH },
          });
          bigCelebrate();
          ctx.complete(summary);
          return;
        }
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → keep the pie to adjust.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        state.problem = generator.next();
        refresh();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    function clearSlices(): void {
      if (filled.size === 0) return;
      const wasFilled = [...filled];
      filled.clear();
      wasFilled.forEach((idx) => applyWedgeLook(idx));
      ctx.audio.play('click');
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: clearSlices,
        },
        {
          id: 'check',
          label: ctx.t('controls.check'),
          variant: 'confirm',
          onPress: confirm,
        },
      ];
      ctx.controls.set(buttons);
    }

    // Tapping a wedge toggles its topping (a slice "appears"/disappears).
    const offTap = ctx.input.on('tap', (p) => {
      const idx = p.picked?.userData?.index;
      if (typeof idx !== 'number') return;
      if (filled.has(idx)) {
        filled.delete(idx);
        applyWedgeLook(idx);
      } else {
        filled.add(idx);
        applyWedgeLook(idx);
        // The slice pops into place from its raised resting position.
        track(popIn(wedges[idx], { scale: 1 }));
      }
      ctx.audio.play('click');
      showPrompt();
    });

    buildPie();
    setControls();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offTap();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(rim);

        wedgeGeos.forEach((g) => g.dispose());
        wedgeGeos.length = 0;
        doughMat.dispose();
        toppingMat.dispose();
        rimGeo.dispose();
        rimMat.dispose();
      },
    };
  },
};
