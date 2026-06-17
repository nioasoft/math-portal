import * as THREE from 'three';
import { Easing } from '@tweenjs/tween.js';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, tweenTo, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import { createMeasureFillGenerator, type MeasureFillProblem } from './problems';

// Theme: a glass of JUICE / measuring jug, viewed from the side. The player
// pours warm orange juice up to a target line. Drag UP raises the level
// (natural), or use the ±50 ml buttons / נקה / בדוק.
const CONTAINER_H = 4; // world height of the glass interior (maps to capacityMl)
const RADIUS = 1.2;
const LIQUID_RADIUS = RADIUS * 0.93; // hugs the inner wall
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const STEP_ML = 50; // ±50 ml buttons
const FILL_TWEEN_MS = 420; // smooth liquid rise
const BUBBLE_COUNT = 5;
const BUBBLE_SPEED = 0.9; // world units / sec
const BUBBLE_MIN_Y = 0.05;

// Warm juice color (orange → red blend from the palette feel). PALETTE.sun is a
// warm yellow; we lean orange-red for "juice".
const JUICE_COLOR = 0xff7a33;
const GLASS_TINT = 0xbfe3ff;
const MARK_COLOR = 0xffffff;
const TARGET_MARK_COLOR = PALETTE.coral;

/** Convert a fill in ml to the liquid mesh's scale.y (unit-height cylinder). */
function mlToHeight(ml: number, capacityMl: number): number {
  const frac = capacityMl > 0 ? ml / capacityMl : 0;
  return Math.max(0.0001, frac * CONTAINER_H);
}

export const measureFillGame: Game3D = {
  meta: {
    id: 'measure-fill',
    i18nKey: 'games3d.measureFill',
    topic: 'units',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Side view of the glass sitting on a surface.
    function reframe(): void {
      const f = lockedCameraFrame(1.2, 1.6, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Clay/toy look — ground at y=0 so the glass reads as standing on a counter,
    // with the engine's soft shadow under it.
    const clayLook = applyClayLook(ctx, {
      topColor: '#dff1ff',
      bottomColor: '#fdf3e6',
      ground: true,
      groundY: 0,
      shadowArea: 8,
      fog: false,
    });

    const generator = createMeasureFillGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Glass: a clean transparent cylinder on the surface ----
    const glassGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, CONTAINER_H, 40, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({
      color: GLASS_TINT,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false, // transparent shell shouldn't occlude the liquid behind it
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = CONTAINER_H / 2;
    ctx.scene.add(glass);

    // Glass base (a little disc so it reads as resting on the counter).
    const baseGeo = new THREE.CylinderGeometry(RADIUS * 1.05, RADIUS * 1.1, 0.12, 40);
    const baseMat = new THREE.MeshStandardMaterial({
      color: GLASS_TINT,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.06;
    base.castShadow = true;
    base.receiveShadow = true;
    ctx.scene.add(base);

    // ---- Liquid (juice): unit-height cylinder scaled on Y ----
    const liquidGeo = new THREE.CylinderGeometry(LIQUID_RADIUS, LIQUID_RADIUS, 1, 40);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: JUICE_COLOR,
      roughness: 0.35,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.castShadow = true;
    ctx.scene.add(liquid);

    // ---- Graduation marks (thin rings) + highlighted target line ----
    const markGroup = new THREE.Group();
    ctx.scene.add(markGroup);
    const markGeos: THREE.BufferGeometry[] = [];
    const markMats: THREE.Material[] = [];
    // Reference capacity for fixed gradations (the generator uses 1000 ml).
    const capacityMl = (quiz ? quiz.state().current : generator.next()).capacityMl;
    const markStep = 250; // marks every 250 ml
    for (let ml = markStep; ml < capacityMl; ml += markStep) {
      const y = (ml / capacityMl) * CONTAINER_H;
      const ringGeo = new THREE.TorusGeometry(RADIUS * 1.02, 0.025, 8, 40);
      const ringMat = new THREE.MeshStandardMaterial({ color: MARK_COLOR, roughness: 0.6, transparent: true, opacity: 0.55 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      markGroup.add(ring);
      markGeos.push(ringGeo);
      markMats.push(ringMat);
    }
    // The highlighted target line (recolored/repositioned per problem).
    const targetGeo = new THREE.TorusGeometry(RADIUS * 1.06, 0.05, 10, 48);
    const targetMat = new THREE.MeshStandardMaterial({
      color: TARGET_MARK_COLOR,
      roughness: 0.4,
      emissive: TARGET_MARK_COLOR,
      emissiveIntensity: 0.35,
    });
    const targetRing = new THREE.Mesh(targetGeo, targetMat);
    targetRing.rotation.x = Math.PI / 2;
    ctx.scene.add(targetRing);

    // ---- Rising bubbles for life ----
    const bubbleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xfff0d0,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
    });
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = new THREE.Mesh(bubbleGeo, bubbleMat);
      resetBubble(b, true);
      ctx.scene.add(b);
      bubbles.push(b);
    }
    function resetBubble(b: THREE.Mesh, spread: boolean): void {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * LIQUID_RADIUS * 0.7;
      b.position.set(Math.cos(a) * r, spread ? Math.random() * BUBBLE_MIN_Y : BUBBLE_MIN_Y, Math.sin(a) * r);
    }

    // ---- State ----
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as MeasureFillProblem,
      fillMl: 0, // committed logical fill
      displayMl: 0, // animated value driving the mesh
      streak: 0,
      answered: 0,
    };

    function applyDisplay(): void {
      const h = mlToHeight(state.displayMl, state.problem.capacityMl);
      liquid.scale.y = h;
      liquid.position.y = h / 2;
    }

    function placeTarget(): void {
      targetRing.position.y = (state.problem.targetMl / state.problem.capacityMl) * CONTAINER_H;
    }

    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('measureFill.prompt', {
          target: state.problem.targetMl,
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

    /** Set the logical fill and smoothly animate the liquid to it. */
    function setFill(ml: number, animate: boolean): void {
      const clamped = Math.max(0, Math.min(state.problem.capacityMl, ml));
      state.fillMl = clamped;
      if (animate) {
        const from = state.displayMl;
        track(
          tweenTo(from, clamped, FILL_TWEEN_MS, (v) => {
            state.displayMl = v;
            applyDisplay();
          }, { easing: Easing.Cubic.Out })
        );
      } else {
        state.displayMl = clamped;
        applyDisplay();
      }
      showPrompt();
    }

    function setControls(): void {
      const unit = ctx.t('measureFill.unit');
      const buttons: ControlButton[] = [
        {
          id: 'minus-50',
          label: `−${STEP_ML} ${unit}`,
          onPress: () => setFill(state.fillMl - STEP_ML, true),
        },
        {
          id: 'plus-50',
          label: `+${STEP_ML} ${unit}`,
          onPress: () => setFill(state.fillMl + STEP_ML, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setFill(0, true),
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

    function startNewProblem(): void {
      placeTarget();
      setFill(0, false);
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('measureFill.correct', { target: state.problem.targetMl }));
      track(punch(glass, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('measureFill.wrong'));
      track(shake(glass, 0.07, 280));
    }

    function confirm(): void {
      const answer = Math.round(state.fillMl);
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
        state.problem = qs.current;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next; wrong → keep the level so they can fix.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        state.problem = generator.next();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = pour. p.y is NDC: +1 at the TOP of the canvas, -1 at the BOTTOM, so
    // (p.y + 1) / 2 ∈ [0,1] with 1 at the top → dragging UP raises the liquid
    // (natural). Drag updates the level live (no tween — it should track the
    // finger), then showPrompt reflects it.
    const offDrag = ctx.input.on('drag', (p) => {
      const frac = Math.min(1, Math.max(0, (p.y + 1) / 2));
      const ml = frac * state.problem.capacityMl;
      state.fillMl = ml;
      state.displayMl = ml;
      applyDisplay();
      showPrompt();
    });

    placeTarget();
    setFill(0, false);
    setControls();
    showStatus();

    return {
      onFrame(dt: number) {
        // Bubbles rise within the current liquid column; recycle at the surface.
        const surface = mlToHeight(state.displayMl, state.problem.capacityMl);
        for (const b of bubbles) {
          if (surface <= BUBBLE_MIN_Y + 0.02) {
            // No (or negligible) liquid: park bubbles at the bottom.
            b.visible = false;
            continue;
          }
          b.visible = true;
          b.position.y += BUBBLE_SPEED * dt;
          if (b.position.y >= surface - 0.05) resetBubble(b, false);
        }
      },
      onResize() { reframe(); },
      dispose() {
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        ctx.scene.remove(glass);
        ctx.scene.remove(base);
        ctx.scene.remove(liquid);
        ctx.scene.remove(targetRing);
        ctx.scene.remove(markGroup);
        markGroup.clear();
        for (const b of bubbles) ctx.scene.remove(b);

        glassGeo.dispose();
        glassMat.dispose();
        baseGeo.dispose();
        baseMat.dispose();
        liquidGeo.dispose();
        liquidMat.dispose();
        targetGeo.dispose();
        targetMat.dispose();
        markGeos.forEach((g) => g.dispose());
        markMats.forEach((m) => m.dispose());
        bubbleGeo.dispose();
        bubbleMat.dispose();
      },
    };
  },
};
