import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, popIn, punch, shake, celebrate, bigCelebrate, computeStars } from '@/lib/games3d/kit';
import { createFractionGenerator, type FractionProblem } from './problems';

// Theme: a PIZZA viewed top-down, split into `denominator` wedge meshes.
//
// EMPTY wedge  → pale baked DOUGH. A thin gap is carved between wedges (each
//   wedge's thetaLength is reduced) so the N-way split is always visible — the
//   child sees the pizza is cut into N equal slices even before topping it.
// FILLED wedge → a TOPPED slice: the wedge surface turns melted-cheese gold
//   (with a thin tomato-sauce rim tint underneath) and 2–3 pepperoni discs plus
//   a couple of herb specks "land" on it (popIn). Toggling off removes the
//   toppings and returns the wedge to dough.
//
// A golden-brown crust torus frames the whole pie. Tapping a wedge toggles its
// topping; the overlay בדוק / נקה controls confirm / clear.
const RADIUS = 3;
const HEIGHT = 0.5;
const RAISE = 0.18; // a filled slice sits slightly proud of the dough
const RIM_TUBE = 0.2; // crust rim thickness
const RADIAL_SEGMENTS = 40;
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Slice cut: shrink each wedge's central angle by this fraction of the gap so a
// thin dark "cut" shows between neighbouring slices, making the division visible.
const SLICE_GAP = 0.04; // radians trimmed off each wedge's thetaLength

// Topping layout (relative to RADIUS) — kept inside the wedge, off the crust.
const SAUCE_RADIUS = RADIUS - RIM_TUBE * 0.5; // sauce tint reaches under the crust
const PEPPERONI_RADIUS = 0.34;
const PEPPERONI_HEIGHT = 0.06;
const SPECK_RADIUS = 0.08;
const SPECK_HEIGHT = 0.04;
const TOPPING_LIFT = 0.06; // toppings sit just above the cheese surface

// Pizza palette.
const DOUGH_COLOR = 0xf3e0b8; // pale baked dough (empty slice)
const CHEESE_COLOR = 0xe8b84b; // melted golden cheese (filled slice surface)
const SAUCE_COLOR = 0xc0392b; // tomato sauce rim tint under the cheese
const PEPPERONI_COLOR = 0xb22222; // deep-red pepperoni
const HERB_COLOR = 0x4f7a3a; // basil/oregano specks
const CRUST_COLOR = 0xd9a35a; // golden-brown crust rim

/**
 * Deterministic pepperoni + speck placements for a wedge, in the wedge's own
 * angular span. Returns local XZ offsets (pizza lies in the XZ plane). Varying by
 * slice index means toppings never line up identically across slices.
 */
interface ToppingSpot {
  x: number;
  z: number;
}
function pepperoniSpots(idx: number, midAngle: number): ToppingSpot[] {
  // 2 or 3 pepperoni, nudged along + across the wedge by a slice-dependent seed.
  const count = 2 + (idx % 2); // alternate 2 / 3
  const seed = (idx * 0.37) % 1; // stable per slice
  const spots: ToppingSpot[] = [];
  for (let k = 0; k < count; k++) {
    // Spread along the radius (inner → outer) and jitter the angle deterministically.
    const radial = RADIUS * (0.34 + 0.24 * k + 0.12 * seed);
    const angle = midAngle + (k - (count - 1) / 2) * 0.22 + (seed - 0.5) * 0.18;
    spots.push({ x: Math.cos(angle) * radial, z: Math.sin(angle) * radial });
  }
  return spots;
}
function speckSpots(idx: number, midAngle: number): ToppingSpot[] {
  // 2 tiny herb specks at a different radius so they read as separate from pepperoni.
  const seed = (idx * 0.61) % 1;
  return [0, 1].map((k) => {
    const radial = RADIUS * (0.5 + 0.22 * k + 0.1 * seed);
    const angle = midAngle + (k === 0 ? 0.34 : -0.3) + (seed - 0.5) * 0.2;
    return { x: Math.cos(angle) * radial, z: Math.sin(angle) * radial };
  });
}

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

    // ---- Shared materials (one of each — cheap + leak-free) ----
    const doughMat = new THREE.MeshStandardMaterial({ color: DOUGH_COLOR, roughness: 0.85, metalness: 0.02 });
    const cheeseMat = new THREE.MeshStandardMaterial({ color: CHEESE_COLOR, roughness: 0.5, metalness: 0.04 });
    const sauceMat = new THREE.MeshStandardMaterial({ color: SAUCE_COLOR, roughness: 0.7, metalness: 0.02 });
    const pepperoniMat = new THREE.MeshStandardMaterial({ color: PEPPERONI_COLOR, roughness: 0.55, metalness: 0.03 });
    const herbMat = new THREE.MeshStandardMaterial({ color: HERB_COLOR, roughness: 0.8, metalness: 0.0 });

    // ---- Shared topping geometries (instanced once, reused across slices) ----
    const pepperoniGeo = new THREE.CylinderGeometry(
      PEPPERONI_RADIUS,
      PEPPERONI_RADIUS,
      PEPPERONI_HEIGHT,
      16
    );
    const speckGeo = new THREE.CylinderGeometry(SPECK_RADIUS, SPECK_RADIUS, SPECK_HEIGHT, 8);

    // Crust rim: a torus framing the pie's outer edge.
    const rimGeo = new THREE.TorusGeometry(RADIUS, RIM_TUBE, 16, RADIAL_SEGMENTS);
    const rimMat = new THREE.MeshStandardMaterial({ color: CRUST_COLOR, roughness: 0.8, metalness: 0.03 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2; // lie flat in the XZ plane
    rim.castShadow = true;
    rim.receiveShadow = true;
    ctx.scene.add(rim);

    // ---- Per-problem geometry/mesh tracking (disposed on every rebuild) ----
    const wedgeGeos: THREE.CylinderGeometry[] = []; // one cylinder sector per slice
    const sauceGeos: THREE.CircleGeometry[] = []; // one sauce sector disc per slice
    let wedges: THREE.Mesh[] = [];
    let toppingGroups: THREE.Group[] = []; // per-slice container for sauce + pepperoni + specks
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

    /**
     * Build the toppings (tomato-sauce sector + pepperoni discs + herb specks) for
     * one slice and add them to its topping group. Geometry that depends on the
     * slice angle (the sauce sector) is created here and tracked for disposal;
     * pepperoni/speck reuse the shared instanced geometries.
     */
    function buildToppings(idx: number): void {
      const tg = toppingGroups[idx];
      const n = state.problem.denominator;
      const theta = (Math.PI * 2) / n;
      const start = idx * theta + SLICE_GAP / 2;
      const span = theta - SLICE_GAP;
      const mid = start + span / 2;

      // Tomato-sauce sector tint, sitting just above the cheese surface so a warm
      // reddish ring peeks at the slice edges. CircleGeometry sits in the XY plane;
      // rotate it flat into XZ.
      const sauceGeo = new THREE.CircleGeometry(SAUCE_RADIUS, RADIAL_SEGMENTS, start, span);
      sauceGeos.push(sauceGeo);
      const sauce = new THREE.Mesh(sauceGeo, sauceMat);
      sauce.rotation.x = -Math.PI / 2;
      sauce.position.y = HEIGHT / 2 + 0.01;
      sauce.receiveShadow = true;
      tg.add(sauce);

      // Pepperoni discs.
      for (const spot of pepperoniSpots(idx, mid)) {
        const pep = new THREE.Mesh(pepperoniGeo, pepperoniMat);
        pep.position.set(spot.x, HEIGHT / 2 + TOPPING_LIFT, spot.z);
        pep.castShadow = true;
        tg.add(pep);
      }

      // Herb specks for life.
      for (const spot of speckSpots(idx, mid)) {
        const speck = new THREE.Mesh(speckGeo, herbMat);
        speck.position.set(spot.x, HEIGHT / 2 + TOPPING_LIFT, spot.z);
        tg.add(speck);
      }
    }

    /** Remove + dispose only the per-slice (angle-dependent) sauce geometry of a topping group, then clear it. */
    function clearToppings(idx: number): void {
      const tg = toppingGroups[idx];
      tg.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CircleGeometry) {
          const gi = sauceGeos.indexOf(child.geometry);
          if (gi !== -1) sauceGeos.splice(gi, 1);
          child.geometry.dispose(); // sauce sector is per-slice; pepperoni/speck geo are shared (do NOT dispose)
        }
      });
      tg.clear();
    }

    /** Sync a wedge to its filled/empty state: cheese vs dough material, raise, toppings. */
    function applyWedgeLook(idx: number): void {
      const wedge = wedges[idx];
      const tg = toppingGroups[idx];
      if (filled.has(idx)) {
        wedge.material = cheeseMat;
        wedge.position.y = RAISE;
        tg.position.y = RAISE;
        tg.visible = true;
      } else {
        wedge.material = doughMat;
        wedge.position.y = 0;
        tg.visible = false;
      }
    }

    /** Dispose every per-problem geometry and reset the pie containers. */
    function disposePieGeometry(): void {
      wedgeGeos.forEach((g) => g.dispose());
      wedgeGeos.length = 0;
      sauceGeos.forEach((g) => g.dispose());
      sauceGeos.length = 0;
    }

    /** Build the wedge meshes for the current problem's denominator. */
    function buildPie(): void {
      stopAllTweens();
      group.clear();
      disposePieGeometry();
      wedges = [];
      toppingGroups = [];
      filled.clear();
      const n = state.problem.denominator;
      const theta = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        // A pie wedge = a partial cylinder; thetaLength is trimmed by SLICE_GAP so a
        // thin dark cut shows between slices (the N-way split is always visible).
        const geo = new THREE.CylinderGeometry(
          RADIUS,
          RADIUS,
          HEIGHT,
          RADIAL_SEGMENTS,
          1,
          false,
          i * theta + SLICE_GAP / 2,
          theta - SLICE_GAP
        );
        wedgeGeos.push(geo);
        const wedge = new THREE.Mesh(geo, doughMat);
        wedge.userData.index = i;
        wedge.castShadow = true;
        wedge.receiveShadow = true;
        group.add(wedge);
        wedges.push(wedge);

        // Each slice owns a topping group; built lazily when the slice is filled.
        const tg = new THREE.Group();
        tg.visible = false;
        tg.userData.index = i;
        group.add(tg);
        toppingGroups.push(tg);
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
      wasFilled.forEach((idx) => {
        applyWedgeLook(idx);
        clearToppings(idx);
      });
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

    // Tapping a wedge toggles its topping (a topped slice "appears"/disappears).
    const offTap = ctx.input.on('tap', (p) => {
      const idx = p.picked?.userData?.index;
      if (typeof idx !== 'number') return;
      if (filled.has(idx)) {
        filled.delete(idx);
        applyWedgeLook(idx);
        clearToppings(idx);
      } else {
        filled.add(idx);
        buildToppings(idx);
        applyWedgeLook(idx);
        // The topped slice + its toppings pop into place (toppings "land").
        track(popIn(wedges[idx], { scale: 1 }));
        track(popIn(toppingGroups[idx], { scale: 1 }));
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

        // Dispose per-slice sauce sectors still attached, then tear down the pie.
        toppingGroups.forEach((_, idx) => clearToppings(idx));
        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(rim);

        // Per-problem geometry.
        disposePieGeometry();

        // Shared topping geometry + every shared material + the crust.
        pepperoniGeo.dispose();
        speckGeo.dispose();
        doughMat.dispose();
        cheeseMat.dispose();
        sauceMat.dispose();
        pepperoniMat.dispose();
        herbMat.dispose();
        rimGeo.dispose();
        rimMat.dispose();
      },
    };
  },
};
