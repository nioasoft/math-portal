import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createArrayMultiplyGenerator, MAX_SIDE, type ArrayMultiplyProblem } from './problems';

// Theme: a GARDEN FRUIT TRAY viewed straight-on (front camera). The problem is a
// rectangular ARRAY of identical glowing fruits (rows × columns) resting in a
// dark wooden tray, so the array reads as a multiplication. The child does NOT
// build the array — it IS the problem — they COUNT it and enter the TOTAL with
// −/+ or by dragging up (more). A "slice" control sweeps a glowing highlight bar
// through the rows one at a time, revealing the product as repeated addition
// (row 1 = 1×cols, rows 1–2 = 2×cols, …). The slice is a pure visual scaffold
// and never changes the answer. CHECK commits the entered total. Consistent with
// the sibling array/area games but inverted: read the array, don't build it.

const CELL = 1.15; // spacing between fruit centers (small gap reads as rows/cols)
const FRUIT_RADIUS = 0.42; // glowing fruit radius
const FRUIT_Z = 0.18; // fruits sit a touch proud of the tray face
const MAX_COUNT = 40; // clamp the entered total (product maxes at 36)
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 14; // gentle per-fruit delay when the array appears

// Fruits cycle a warm, saturated palette per item so the array is vivid against
// the dark tray (CONTRAST). The tray + slice bar are darker/saturated so nothing
// is faint-light-on-light.
const FRUIT_COLORS = [PALETTE.coral, PALETTE.sun, PALETTE.mint, PALETTE.grape, PALETTE.sky] as const;
const TRAY_COLOR = 0x4a2f1c; // dark wood tray (sets off the bright fruits)
const SLICE_COLOR = 0x2fd6c3; // bright teal highlight for the active row(s)

// Camera distance: with a straight-on locked camera at (0,0,D) and a ~60° vertical
// FOV at ~1.4 aspect, a 6×6 array spans (5·CELL + fruit) ≈ 6.6 units each way. We
// frame the WIDTH (the binding dimension at this aspect) with margin so even a full
// 6×6 array fills the central viewport without floating as specks.
const CAMERA_DISTANCE = 11.5;

/** World position of the fruit at grid (row r from TOP, col c from LEFT). */
function fruitPosition(r: number, c: number, rows: number, cols: number): THREE.Vector3 {
  const gridW = (cols - 1) * CELL;
  const gridH = (rows - 1) * CELL;
  // Row 0 is the TOP row → highest y. Col 0 is the LEFT → lowest x.
  const x = c * CELL - gridW / 2;
  const y = gridH / 2 - r * CELL;
  return new THREE.Vector3(x, y, FRUIT_Z);
}

export const arrayMultiplySliceGame: Game3D = {
  meta: {
    id: 'array-multiply-slice',
    i18nKey: 'games3d.arrayMultiply',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [2, 3],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on front camera (like clock-builder): keeps drag-x → world-x and
    // drag-y → world-y monotonic so "up = more" is natural, and frames the array.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, CAMERA_DISTANCE), new THREE.Vector3(0, 0, 0));

    // Clay/toy look (also installs the soft daylight rig). ground:false — the scene is front-facing and centered on the
    // origin, so a horizontal clay ground plane at y≈0 would slice through it.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe9ff',
      bottomColor: '#ffe3c2',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createArrayMultiplyGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target; stop only on dispose) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (ONE geometry/material per visual kind) ----
    const fruitGeo = new THREE.SphereGeometry(FRUIT_RADIUS, 22, 16);
    const fruitMats = FRUIT_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.05, emissive: new THREE.Color(color), emissiveIntensity: 0.18 })
    );
    // Tray plate sized to hold up to a full MAX_SIDE × MAX_SIDE array.
    const traySpan = (MAX_SIDE - 1) * CELL + FRUIT_RADIUS * 2 + 0.7;
    const trayGeo = roundedBox(traySpan, traySpan, 0.4, 0.18, 3);
    const trayMat = new THREE.MeshStandardMaterial({ color: TRAY_COLOR, roughness: 0.9, metalness: 0.02 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, 0, -0.25);
    tray.receiveShadow = true;
    tray.scale.setScalar(1); // STATIC prop — explicit scale, never popIn (§13c)
    ctx.scene.add(tray);

    // Slice highlight: ONE shared thin glowing bar, scaled per row span. Lives in a
    // GROUP so popIn/punch act uniformly on the group (§13b) while the inner bar
    // carries the non-uniform width/height scale.
    const sliceGeo = roundedBox(1, 1, 0.16, 0.08, 2);
    const sliceMat = new THREE.MeshStandardMaterial({
      color: SLICE_COLOR,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(SLICE_COLOR),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.55,
    });
    const sliceBar = new THREE.Mesh(sliceGeo, sliceMat);
    const sliceGroup = new THREE.Group();
    sliceGroup.add(sliceBar);
    sliceGroup.visible = false;
    sliceGroup.position.z = 0.02; // behind the fruits, above the tray face
    ctx.scene.add(sliceGroup);

    // Fruits rebuilt per problem (a fixed array per problem).
    const fruitGroup = new THREE.Group();
    ctx.scene.add(fruitGroup);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as ArrayMultiplyProblem,
      count: 0, // the entered total (starts at 0 — never the product since product≥4)
      sliceRows: 0, // how many rows the slice scaffold currently reveals (0 = off)
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — never echoes rows/cols/product or the entered count.
      ctx.prompt.set(ctx.t('arrayMultiply.prompt'));
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

    /** (Re)build the fruit array for the current problem; new fruits pop in. */
    function buildArray(): void {
      fruitGroup.clear();
      const { rows, cols } = state.problem;
      let ordinal = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const fruit = new THREE.Mesh(fruitGeo, fruitMats[(r * cols + c) % fruitMats.length]);
          fruit.position.copy(fruitPosition(r, c, rows, cols));
          fruit.castShadow = true;
          fruitGroup.add(fruit);
          track(popIn(fruit, { delay: ordinal * POP_STAGGER_MS }));
          ordinal += 1;
        }
      }
    }

    /**
     * Position + size the slice highlight to cover the TOP `rows` rows of the
     * array (cumulative repeated-addition scaffold). 0 → hide. The inner bar
     * carries the non-uniform width/height; the parent group is what we punch.
     */
    function updateSlice(animate: boolean): void {
      const { rows, cols } = state.problem;
      if (state.sliceRows <= 0 || state.sliceRows > rows) {
        sliceGroup.visible = false;
        return;
      }
      const gridH = (rows - 1) * CELL;
      const barW = (cols - 1) * CELL + FRUIT_RADIUS * 2 + 0.35;
      const barH = (state.sliceRows - 1) * CELL + FRUIT_RADIUS * 2 + 0.35;
      // Top of the covered band = top fruit row's top edge; center it.
      const topY = gridH / 2 + FRUIT_RADIUS;
      const centerY = topY - barH / 2;
      sliceBar.scale.set(barW, barH, 1);
      sliceGroup.position.set(0, centerY, 0.02);
      sliceGroup.visible = true;
      if (animate) track(punch(sliceGroup, 0.06));
    }

    /** Advance the slice scaffold by one row, wrapping back to off after the last. */
    function stepSlice(): void {
      const rows = state.problem.rows;
      state.sliceRows = state.sliceRows >= rows ? 0 : state.sliceRows + 1;
      updateSlice(true);
    }

    function setCount(next: number): void {
      state.count = Math.max(0, Math.min(MAX_COUNT, Math.round(next)));
      setControls(); // refresh the live count shown on the −/+ label
    }

    function setControls(): void {
      const totalLabel = ctx.t('controls.total');
      const buttons: ControlButton[] = [
        {
          id: 'total-dec',
          label: `${totalLabel} −`,
          onPress: () => setCount(state.count - 1),
        },
        {
          // The middle "button" doubles as a live readout of the entered total.
          id: 'total-display',
          label: `${totalLabel}: ${state.count}`,
          onPress: () => {},
        },
        {
          id: 'total-inc',
          label: `${totalLabel} +`,
          onPress: () => setCount(state.count + 1),
        },
        {
          id: 'slice',
          label: ctx.t('controls.slice'),
          onPress: stepSlice,
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => {
            state.sliceRows = 0;
            updateSlice(false);
            setCount(0);
          },
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

    /** Lay out a fresh problem: rebuild the array, reset count + slice. */
    function layoutForProblem(): void {
      state.sliceRows = 0;
      updateSlice(false);
      buildArray();
      state.count = 0;
      showPrompt();
      setControls();
    }

    function startNewProblem(): void {
      layoutForProblem();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('arrayMultiply.correct', {
          rows: state.problem.rows,
          cols: state.problem.cols,
          product: state.problem.product,
        })
      );
      track(punch(fruitGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('arrayMultiply.wrong'));
      track(shake(fruitGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = state.count;
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
        state.problem = qs.current as ArrayMultiplyProblem;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → KEEP the entered total
      // and the array so the child can recount and fix it (no fail-out).
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

    // Drag = fast entry of the total. Vertical sweep: dragging UP (NDC +y) raises
    // the count, DOWN lowers it — natural "up = more" (§8/§9). Maps the full
    // vertical range to 0..MAX_COUNT.
    const offDrag = ctx.input.on('drag', (p) => {
      const t = Math.min(1, Math.max(0, (p.y + 1) / 2)); // bottom 0 → top 1
      const target = Math.round(t * MAX_COUNT);
      if (target !== state.count) setCount(target);
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    layoutForProblem();
    setControls();
    showStatus();

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

        fruitGroup.clear();
        sliceGroup.clear();
        ctx.scene.remove(fruitGroup);
        ctx.scene.remove(sliceGroup);
        ctx.scene.remove(tray);

        fruitGeo.dispose();
        fruitMats.forEach((m) => m.dispose());
        trayGeo.dispose();
        trayMat.dispose();
        sliceGeo.dispose();
        sliceMat.dispose();
      },
    };
  },
};
