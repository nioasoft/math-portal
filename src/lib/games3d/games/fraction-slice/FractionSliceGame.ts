import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
  popIn,
  punch,
  shake,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
import {
  createFractionSliceGenerator,
  MIN_DENOMINATOR,
  MAX_DENOMINATOR,
  type FractionSliceProblem,
  type SliceAnswer,
} from './problems';

// Theme: a round PIZZA on a board, facing the viewer in the XY plane. The
// DENOMINATOR control slices the pie into `slices` EQUAL sectors; the NUMERATOR
// control (or dragging UP/DOWN) shades `shaded` of them with saturated topping —
// the rest stay pale dough. The child builds the target fraction n/d by slicing
// the pie into exactly d parts and shading exactly n of them. בדוק grades the
// built slicing STRICTLY (slices === d AND shaded === n) — equivalent fractions
// do NOT count: the task is literally "slice into d, shade n". Procedural only.
//
// SECTOR ANGLE CONVENTION: a THREE.CircleGeometry sector lies in the XY plane
// facing +Z (toward the locked camera) and spans [thetaStart, thetaStart+thetaLength)
// measured CCW from +X. We lay sector 0 starting at the TOP (+Y) and fill
// CLOCKWISE so shading reads like a clock filling up: sector k occupies the
// clockwise wedge starting at angle (π/2 − k·step).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

const PIE_RADIUS = 3.6; // sector radius (XY plane)
const PLATE_RADIUS = PIE_RADIUS + 0.45; // dark plate/crust behind — also paints slice borders
const PLATE_Z = -0.12; // plate sits just behind the sectors
const SECTOR_Z = 0; // sectors at z=0, facing the camera
const SECTOR_SEGMENTS = 24; // smooth arc per wedge
const SLICE_GAP = 0.05; // angular gap (radians) between wedges → dark crust shows = visible cut lines
const TWO_PI = Math.PI * 2;

// Pizza palette: a dark crust plate for strong border contrast, saturated
// tomato-red "topping" for shaded sectors, pale dough for the rest. High
// contrast (§12) — never faint light-on-light.
const PLATE_COLOR = 0x5a3a1e; // dark baked crust / board
const SHADED_COLOR = PALETTE.coral; // saturated topping (sauce + pepperoni feel)
const PALE_COLOR = 0xf3e2b8; // pale dough

export const fractionSliceGame: Game3D = {
  meta: {
    id: 'fraction-slice',
    i18nKey: 'games3d.fractionSlice',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // The pizza faces the viewer: lock the camera straight in front of the XY
    // plane looking at the origin, so "up" on screen is +Y and dragging up reads
    // naturally as "shade one more". Distance fits the full plate with margin.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 0));

    // Warm pizzeria ambience. No ground plane (the pie hangs in front of the
    // gradient backdrop); the engine still casts the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f6d9b0',
      bottomColor: '#e8b27a',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createFractionSliceGenerator();
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

    // ---- Shared, reused resources ----
    // Two shared sector materials (shaded vs pale) reused by every wedge — only
    // the per-sector GEOMETRY differs (each wedge has its own thetaStart), so we
    // track sector geometries in an array and dispose them on every reslice.
    const shadedMat = new THREE.MeshStandardMaterial({ color: SHADED_COLOR, roughness: 0.6, metalness: 0.04 });
    const paleMat = new THREE.MeshStandardMaterial({ color: PALE_COLOR, roughness: 0.85, metalness: 0.02 });

    // Dark crust plate behind the sectors: paints the gaps between wedges as
    // visible slice lines and frames the pie. One full-circle disc, shared.
    const plateGeo = new THREE.CircleGeometry(PLATE_RADIUS, 64);
    const plateMat = new THREE.MeshStandardMaterial({ color: PLATE_COLOR, roughness: 0.8, metalness: 0.05 });

    // The whole pie lives in a group (uniform scale only → popIn/punch safe, §13b).
    const pie = new THREE.Group();
    pie.scale.setScalar(1);
    ctx.scene.add(pie);

    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.z = PLATE_Z;
    plate.receiveShadow = true;
    pie.add(plate);

    // Sectors live in their own group, cleared + rebuilt on reslice.
    const sectorsGroup = new THREE.Group();
    pie.add(sectorsGroup);

    // Per-sector geometries currently allocated (disposed before each rebuild +
    // on teardown — never allocate-and-forget).
    let sectorGeos: THREE.CircleGeometry[] = [];

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as FractionSliceProblem,
      slices: MIN_DENOMINATOR, // current equal-part count (2..8)
      shaded: 0, // current shaded count (0..slices)
      streak: 0,
      answered: 0,
    };

    /**
     * (Re)build the pie's wedges for the current `slices`, shading the first
     * `shaded` of them. Disposes the previous sector geometries first (each wedge
     * needs its own thetaStart geometry), reusing the two shared materials. Sector
     * k fills the CLOCKWISE wedge starting at the top: thetaStart = π/2 − (k+1)·step
     * + gap/2, length = step − gap (the gap reveals the dark plate as a cut line).
     */
    function rebuildSectors(): void {
      sectorsGroup.clear();
      for (const g of sectorGeos) g.dispose();
      sectorGeos = [];

      const step = TWO_PI / state.slices;
      for (let k = 0; k < state.slices; k++) {
        // Clockwise wedge from the top. thetaStart is the wedge's CCW-min edge.
        const thetaStart = Math.PI / 2 - (k + 1) * step + SLICE_GAP / 2;
        const thetaLength = step - SLICE_GAP;
        const geo = new THREE.CircleGeometry(PIE_RADIUS, SECTOR_SEGMENTS, thetaStart, thetaLength);
        sectorGeos.push(geo);
        const sector = new THREE.Mesh(geo, k < state.shaded ? shadedMat : paleMat);
        sector.position.z = SECTOR_Z;
        sector.castShadow = true;
        sector.receiveShadow = true;
        sectorsGroup.add(sector);
      }
    }

    function showPrompt(): void {
      // TASK ONLY — shows the target n and d (telling the child the goal). Never
      // echoes the live built slices/shaded or whether it is correct (§11).
      ctx.prompt.set(ctx.t('fractionSlice.prompt', { n: state.problem.n, d: state.problem.d }));
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

    /** Set the slice count (clamp 2..8), clamp shaded ≤ slices, then rebuild. */
    function setSlices(slices: number): void {
      state.slices = Math.max(MIN_DENOMINATOR, Math.min(MAX_DENOMINATOR, slices));
      if (state.shaded > state.slices) state.shaded = state.slices;
      rebuildSectors();
    }

    /** Set the shaded count (clamp 0..slices), then rebuild (re-colors wedges). */
    function setShaded(shaded: number): void {
      state.shaded = Math.max(0, Math.min(state.slices, shaded));
      rebuildSectors();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'den-dec',
          label: `${ctx.t('controls.denominator')} −`,
          onPress: () => setSlices(state.slices - 1),
        },
        {
          id: 'den-inc',
          label: `${ctx.t('controls.denominator')} +`,
          onPress: () => setSlices(state.slices + 1),
        },
        {
          id: 'num-dec',
          label: `${ctx.t('controls.numerator')} −`,
          onPress: () => setShaded(state.shaded - 1),
        },
        {
          id: 'num-inc',
          label: `${ctx.t('controls.numerator')} +`,
          onPress: () => setShaded(state.shaded + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetPie,
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

    /** Reset to a guaranteed-UNSOLVED start: 2 slices, 0 shaded (n ≥ 1 always). */
    function resetPie(): void {
      state.slices = MIN_DENOMINATOR;
      state.shaded = 0;
      rebuildSectors();
    }

    function startNewProblem(): void {
      // Keep the built pie between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('fractionSlice.correct', { n: state.problem.n, d: state.problem.d }));
      // Punch the whole pie group (uniform scale → safe; §13b).
      track(punch(pie, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('fractionSlice.wrong'));
      track(shake(pie, 0.06, 280));
    }

    function confirm(): void {
      const answer: SliceAnswer = { slices: state.slices, shaded: state.shaded };
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

      // Practice: correct → score + next problem; wrong → KEEP the built pie to fix.
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

    /**
     * Drag = shade by sweeping. Vertical drag UP shades one more sector, DOWN
     * shades one fewer (clamped 0..slices) — never inverted. The locked camera
     * looks straight down −Z with no roll, so NDC +y is up = more shaded. We map
     * the pointer's NDC-y (−1..1) directly to the shaded count across the pie.
     */
    function pointerToShaded(ndcY: number): number {
      const t = (ndcY + 1) / 2; // 0 (bottom) .. 1 (top)
      const clamped = Math.max(0, Math.min(1, t));
      return Math.round(clamped * state.slices); // 0..slices
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const newShaded = pointerToShaded(p.y);
      if (newShaded === state.shaded) return;
      setShaded(newShaded);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: 2 slices, 0 shaded (never already solved). popIn the whole
    // pie group ONCE (uniform scale; engine-driven). stopAllTweens stays in
    // dispose() only, so this entrance grow-back is never cut short (§13c).
    rebuildSectors();
    track(popIn(pie, { scale: 1 }));
    setControls();
    startNewProblem();

    return {
      onResize() {},
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        sectorsGroup.clear();
        pie.clear();
        ctx.scene.remove(pie);

        for (const g of sectorGeos) g.dispose();
        sectorGeos = [];
        shadedMat.dispose();
        paleMat.dispose();
        plateGeo.dispose();
        plateMat.dispose();
      },
    };
  },
};
