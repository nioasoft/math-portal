import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
  roundedBox,
  popIn,
  punch,
  shake,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createFactrisGenerator,
  MAX_WIDTH,
  MAX_HEIGHT,
  type FactrisProblem,
} from './problems';

// Theme: a colorful block WAREHOUSE (פקטריס / Factris). A fixed AREA of cheerful
// unit cubes can be RESHAPED — set the block's WIDTH and the cubes auto-arrange
// into W columns, filling complete rows bottom-up. If area % W !== 0 the top row
// is RAGGED (incomplete) so it visibly is NOT a clean rectangle. A glowing shelf
// SLOT frame (width = slotW, a proper divisor of area) shows the target footprint.
// When W === slotW the cubes form a clean slotW × (area/slotW) rectangle that
// exactly fills the slot. The child READS the slot width from the scene (it is
// NOT in the prompt) and reshapes the block to fill it, then בדוק to check.
//
// CAMERA: a straight-on locked camera in front of the XY plane looking at the
// origin → screen +x is world +x, so dragging RIGHT widens (never inverted) and
// NDC→world stays monotonic.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Cube/grid geometry, laid out in the XY plane facing the camera (z≈0).
const CELL = 1; // grid step (one unit per cube)
const CUBE = 0.92; // visual cube footprint (a small gap reads the grid)
const CUBE_DEPTH = 0.9;
const START_WIDTH = 1; // never opens solved (slotW ≥ 2)

// Shelf slot frame: a glowing outline one row tall × slotW wide that the clean
// rectangle must fill. Its bars are thin scaled cubes (one geo + one material).
const FRAME_BAR = 0.16;
const FRAME_DEPTH = 0.7;
const FRAME_PAD = 0.06; // frame sits a touch outside the cube footprint

// Warehouse palette: warm crate cubes cycled per column for a stacked-crate feel,
// a dark steel shelf back-plate (catches shadow, high contrast under the cubes),
// and a saturated glowing-yellow slot frame so the target footprint stands out.
const CRATE_COLORS = [PALETTE.coral, PALETTE.sun, PALETTE.sky, PALETTE.mint, PALETTE.grape] as const;
const SHELF_COLOR = 0x37475a; // dark steel back-plate
const FRAME_COLOR = PALETTE.sun; // glowing slot outline
// (cubes keep their crate color; raggedness reads from the GAP on the top row.)

/**
 * Map a normalized pointer x (NDC, -1..1) to an integer width 1..MAX_WIDTH.
 * Left edge → 1, right edge → MAX (linear, no inversion: drag right = wider).
 */
function pointerToWidth(ndcX: number): number {
  const t = (ndcX + 1) / 2; // 0..1
  const w = Math.round(t * (MAX_WIDTH - 1)) + 1;
  return Math.max(1, Math.min(MAX_WIDTH, w));
}

export const factrisBlocksGame: Game3D = {
  meta: {
    id: 'factris-blocks',
    i18nKey: 'games3d.factris',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera: screen-right = world +x (drag right → wider),
    // and the whole warehouse shelf + block fill the central viewport. Distance
    // sized to the largest footprint (widest MAX_WIDTH × tallest MAX_HEIGHT).
    const fitExtent = Math.max(MAX_WIDTH, MAX_HEIGHT) * CELL; // ≈12 units
    function reframe(): void {
      const f = lockedCameraFrame(fitExtent / 2, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Warehouse ambience. No ground plane (the dark shelf back-plate reads as the
    // surface behind the floating crates); the engine still provides soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cdd6e0',
      bottomColor: '#9aa7b6',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createFactrisGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    // popIn/punch animate a `{ s }` scale proxy; shake animates a `{ t }` proxy.
    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material per kind) ----
    const cubeGeo = roundedBox(CUBE, CUBE, CUBE_DEPTH, 0.12, 3);
    const cubeMats = CRATE_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 })
    );
    // Slot frame bars: one unit cube geo scaled per bar, one emissive-ish material.
    const frameGeo = roundedBox(1, 1, FRAME_DEPTH, 0.04, 2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: FRAME_COLOR,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(FRAME_COLOR),
      emissiveIntensity: 0.55,
    });
    // Shelf back-plate: a large dark slab behind everything (catches the shadow,
    // gives the saturated crates a high-contrast backdrop). Sized once to the max.
    const plateW = MAX_WIDTH * CELL + 1.2;
    const plateH = MAX_HEIGHT * CELL + 1.2;
    const plateGeo = roundedBox(plateW, plateH, 0.4, 0.3, 3);
    const plateMat = new THREE.MeshStandardMaterial({ color: SHELF_COLOR, roughness: 0.9, metalness: 0.1 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.z = -1.1;
    plate.receiveShadow = true;
    ctx.scene.add(plate);

    // Cubes and the slot frame live in their own groups so each can be punched/cleared.
    const cubeGroup = new THREE.Group();
    const frameGroup = new THREE.Group();
    ctx.scene.add(frameGroup);
    ctx.scene.add(cubeGroup);

    const first = (quiz ? quiz.state().current : generator.next()) as FactrisProblem;
    const state = {
      problem: first,
      width: START_WIDTH,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY: gives the AREA but NOT the slot width (the child reads slotW
      // off the glowing shelf frame in the scene). Never echoes the live width.
      ctx.prompt.set(ctx.t('factris.prompt', { area: state.problem.area }));
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

    /** Number of full rows + a possibly-ragged top row for `count` cubes in `w` columns. */
    function rowsFor(count: number, w: number): number {
      return Math.ceil(count / w);
    }

    // Center a w-wide, h-tall block on the origin so the camera frames it whatever
    // its shape. Column c → x; row r (0 at bottom) → y.
    function cellX(c: number, w: number): number {
      return (c - (w - 1) / 2) * CELL;
    }
    function cellY(r: number, h: number): number {
      return (r - (h - 1) / 2) * CELL;
    }

    /**
     * Lay out the AREA cubes into `state.width` columns, filling complete rows
     * BOTTOM-UP. The final (top) row is RAGGED — fewer than `width` cubes — exactly
     * when area % width !== 0, so a non-divisor width visibly is NOT a clean
     * rectangle (a gap on the top row). When width === slotW the layout is a clean
     * slotW × (area/slotW) rectangle that fills the frame.
     *
     * `prevCount` lets newly-placed cubes pop in while existing ones stay put.
     */
    function buildCubes(prevCount: number): void {
      cubeGroup.clear();
      const area = state.problem.area;
      const w = state.width;
      const h = rowsFor(area, w);
      let placed = 0;
      let newOrdinal = 0;
      for (let r = 0; r < h; r++) {
        const inThisRow = Math.min(w, area - r * w); // top row may be < w (ragged)
        const y = cellY(r, h);
        for (let c = 0; c < inThisRow; c++) {
          const cube = new THREE.Mesh(cubeGeo, cubeMats[c % cubeMats.length]);
          cube.position.set(cellX(c, w), y, 0);
          cube.castShadow = true;
          cube.receiveShadow = true;
          if (placed >= prevCount) {
            track(popIn(cube, { delay: newOrdinal * 14 }));
            newOrdinal += 1;
          }
          cubeGroup.add(cube);
          placed += 1;
        }
      }
    }

    /**
     * Draw the glowing shelf SLOT: a one-row-tall, slotW-wide rectangular outline
     * the clean rectangle must fill. Four bars (top/bottom/left/right) frame the
     * bottom row's footprint so the child can read the target WIDTH directly off
     * the scene. Static across resizes (the target never changes within a problem).
     */
    function buildFrame(animate: boolean): void {
      frameGroup.clear();
      const slotW = state.problem.slotW;
      const slotH = state.problem.area / slotW; // integer (slotW divides area)
      // Footprint of the clean rectangle, centered on the origin.
      const innerW = slotW * CELL;
      const innerH = slotH * CELL;
      const halfW = innerW / 2 + FRAME_PAD;
      const halfH = innerH / 2 + FRAME_PAD;
      const lenX = innerW + 2 * FRAME_PAD + FRAME_BAR;
      const lenY = innerH + 2 * FRAME_PAD + FRAME_BAR;
      const bars: Array<{ sx: number; sy: number; x: number; y: number }> = [
        { sx: lenX, sy: FRAME_BAR, x: 0, y: halfH }, // top
        { sx: lenX, sy: FRAME_BAR, x: 0, y: -halfH }, // bottom
        { sx: FRAME_BAR, sy: lenY, x: -halfW, y: 0 }, // left
        { sx: FRAME_BAR, sy: lenY, x: halfW, y: 0 }, // right
      ];
      for (const b of bars) {
        const bar = new THREE.Mesh(frameGeo, frameMat);
        bar.scale.set(b.sx, b.sy, 1);
        bar.position.set(b.x, b.y, -0.2); // just behind the cubes' front faces
        frameGroup.add(bar);
      }
      if (animate) track(popIn(frameGroup, { scale: 1 }));
    }

    /**
     * Apply a new block width: re-arrange the AREA cubes (the slot frame is fixed
     * for the problem) + refresh the prompt. The cube COUNT is constant (= area);
     * `keep` suppresses re-popping every cube on each resize — existing cubes stay,
     * only the genuinely-new ones (when widening shifts the layout) pop in.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function setWidth(width: number, animate: boolean): void {
      const prevCount = cubeGroup.children.length;
      state.width = Math.max(1, Math.min(MAX_WIDTH, width));
      buildCubes(prevCount);
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'width-dec',
          label: `${ctx.t('controls.width')} −`,
          onPress: () => setWidth(state.width - 1, true),
        },
        {
          id: 'width-inc',
          label: `${ctx.t('controls.width')} +`,
          onPress: () => setWidth(state.width + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setWidth(START_WIDTH, true),
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
      state.width = START_WIDTH;
      buildFrame(true);
      buildCubes(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('factris.correct', {
        area: state.problem.area,
        slotW: state.problem.slotW,
        height: state.problem.area / state.problem.slotW,
      })
      );
      track(punch(cubeGroup, 0.14));
      track(punch(frameGroup, 0.12));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('factris.wrong'));
      track(shake(cubeGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = state.width;
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
        state.problem = qs.current as FactrisProblem;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → KEEP the block to fix.
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

    // Drag = fast reshape: sweep RIGHT to widen, LEFT to narrow. The locked
    // straight-on camera makes NDC-x → world-x monotonic, so this is never inverted.
    const offDrag = ctx.input.on('drag', (p) => {
      const w = pointerToWidth(p.x);
      if (w === state.width) return;
      setWidth(w, false);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: frame for this problem, block at START_WIDTH, controls + status.
    buildFrame(true);
    setWidth(START_WIDTH, false);
    setControls();
    showStatus();
    showPrompt();

    return {
      onResize() { reframe(); },
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        cubeGroup.clear();
        frameGroup.clear();
        ctx.scene.remove(cubeGroup);
        ctx.scene.remove(frameGroup);
        ctx.scene.remove(plate);

        cubeGeo.dispose();
        cubeMats.forEach((m) => m.dispose());
        frameGeo.dispose();
        frameMat.dispose();
        plateGeo.dispose();
        plateMat.dispose();
      },
    };
  },
};
