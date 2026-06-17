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
import { tweenTo } from '@/lib/games3d/kit/juice';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createRulerMeasureGenerator,
  RULER_MAX,
  type RulerProblem,
  type MarkerAnswer,
} from './problems';

// Theme: a wooden RULER lying on a school desk, facing the viewer in the XY plane.
// A 0..20 cm ruler with NUMBERED cm ticks (dark, readable) + smaller mm subticks.
// A colored PENCIL lies above the ruler from `start` to `start+length` cm — note
// its left end is usually NOT at 0, so length = (right reading − left reading).
// Two draggable EDGE FLAGS (green = left, magenta = right) snap to cm marks; the
// child aligns each flag to the matching end of the pencil, then presses בדוק.
// CHECK passes only when BOTH flags sit on the object's true ends, so reading the
// length as the right-hand number alone is WRONG (the misconception this teaches).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Ruler geometry (XY plane, facing the locked camera at +Z). The ruler body spans
// the full 0..RULER_MAX cm; one cm maps to CM world units along X.
const CM = 0.56; // world units per cm
const LINE_HALF = (RULER_MAX * CM) / 2; // world-x at cm 0 is -LINE_HALF, at RULER_MAX is +LINE_HALF
const RULER_HEIGHT = 1.5; // ruler body height (Y)
const RULER_DEPTH = 0.4;
const RULER_Y = -1.1; // ruler sits below center; the pencil rests above it
const RULER_Z = 0;

const CM_TICK_W = 0.07;
const CM_TICK_H = 0.62; // tall cm ticks
const MM_TICK_W = 0.035;
const MM_TICK_H = 0.3; // shorter mm subticks
const TICK_DEPTH = 0.12;
const TICK_TOP_Y = RULER_Y + RULER_HEIGHT / 2; // ticks hang down from the top edge
const TICK_Z = RULER_Z + RULER_DEPTH / 2 + 0.03;

// Number labels: small dark cm-digit plates rendered procedurally as canvas
// textures on tiny planes (geometry only — no asset files).
const LABEL_SIZE = 0.5;
const LABEL_Y = RULER_Y; // centered on the ruler face
const LABEL_Z = RULER_Z + RULER_DEPTH / 2 + 0.04;

// The pencil (object being measured) floats above the ruler.
const PENCIL_Y = RULER_Y + RULER_HEIGHT / 2 + 0.95;
const PENCIL_Z = RULER_Z + 0.2;
const PENCIL_THICK = 0.5;

// Edge flags stand above the pencil; each marks one chosen cm.
const FLAG_Y = PENCIL_Y + 1.05;
const FLAG_Z = RULER_Z + 0.45;
const FLAG_POLE_H = 1.5;
const FLAG_W = 0.55;
const FLAG_H = 0.42;
const MARKER_TWEEN_MS = 200;

// Palette: warm wood ruler, dark ticks/labels (high contrast on the light wood),
// a saturated pencil, and two distinct flag colors the child tracks.
const RULER_COLOR = 0xd9b483; // light maple wood
const TICK_COLOR = 0x2a1c10; // near-black cocoa ticks
const LABEL_BG = '#d9b483';
const LABEL_FG = '#2a1c10';
const PENCIL_COLOR = PALETTE.sky;
const PENCIL_TIP_COLOR = 0x3a2a18;
const LEFT_FLAG_COLOR = 0x2f7d4f; // green left flag
const RIGHT_FLAG_COLOR = 0xb23a78; // magenta right flag
const POLE_COLOR = 0x4a3526; // wooden flag pole

/** cm (0..RULER_MAX) → world-x. Monotonic increasing → drag-right = larger cm. */
function cmToX(cm: number): number {
  return -LINE_HALF + cm * CM;
}

/** Pointer NDC-x (−1..1) → nearest cm (0..RULER_MAX). Right = larger (never inverted). */
function pointerToCm(ndcX: number): number {
  // The locked camera looks straight down −Z with no roll, so world-x increases
  // monotonically with NDC-x. The ruler fills most of the horizontal view, so we
  // map the NDC span linearly onto 0..RULER_MAX and snap to the nearest cm.
  const t = (ndcX + 1) / 2; // 0..1 left→right
  const cm = Math.round(t * RULER_MAX);
  return Math.max(0, Math.min(RULER_MAX, cm));
}

export const rulerMeasureGame: Game3D = {
  meta: {
    id: 'ruler-measure',
    i18nKey: 'games3d.rulerMeasure',
    topic: 'units',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front view of the ruler: lock the camera in front of the XY plane so "right"
    // on screen is +X (larger cm) and the ruler reads horizontally, undistorted.
    const RULER_HALF_W = 5.6; // 20cm ruler ≈ 11.2 units wide
    function reframe(): void {
      const f = lockedCameraFrame(RULER_HALF_W, -0.15, ctx.camera.aspect, 3);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Warm desk ambience. A ground plane reads as the desk surface; the engine
    // casts the soft shadow under the ruler.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f3e3c6',
      bottomColor: '#d8bd92',
      ground: true,
      shadowArea: 11,
      fog: false,
    });

    const generator = createRulerMeasureGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material per KIND) ----
    const rulerGeo = roundedBox(RULER_MAX * CM + CM, RULER_HEIGHT, RULER_DEPTH, 0.12, 3);
    const rulerMat = new THREE.MeshStandardMaterial({ color: RULER_COLOR, roughness: 0.78, metalness: 0.03 });

    // ONE cm-tick geo+mat and ONE mm-tick geo+mat, reused for every tick.
    const cmTickGeo = roundedBox(CM_TICK_W, CM_TICK_H, TICK_DEPTH, 0.02, 1);
    const mmTickGeo = roundedBox(MM_TICK_W, MM_TICK_H, TICK_DEPTH, 0.01, 1);
    const tickMat = new THREE.MeshStandardMaterial({ color: TICK_COLOR, roughness: 0.5, metalness: 0.05 });

    // Number-label plates: ONE shared plane geo; each cm gets its own small texture
    // (0..RULER_MAX) created once up front and reused for the whole session.
    const labelGeo = new THREE.PlaneGeometry(LABEL_SIZE, LABEL_SIZE);
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMats: THREE.MeshBasicMaterial[] = [];
    for (let n = 0; n <= RULER_MAX; n++) {
      const tex = makeNumberTexture(n);
      labelTextures.push(tex);
      labelMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    }

    // Pencil: a body (scaled per problem) + a fixed tip cone. Body is a unit-length
    // box scaled along X; one geo+mat reused.
    const pencilBodyGeo = roundedBox(1, PENCIL_THICK, PENCIL_THICK, 0.16, 3);
    const pencilBodyMat = new THREE.MeshStandardMaterial({ color: PENCIL_COLOR, roughness: 0.5, metalness: 0.06 });
    const pencilTipGeo = new THREE.ConeGeometry(PENCIL_THICK / 2, CM * 0.9, 16);
    const pencilTipMat = new THREE.MeshStandardMaterial({ color: PENCIL_TIP_COLOR, roughness: 0.6, metalness: 0.04 });

    // Two edge flags: a shared pole geo + per-flag flag geo/mat (only 2 of each).
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, FLAG_POLE_H, 10);
    const poleMat = new THREE.MeshStandardMaterial({ color: POLE_COLOR, roughness: 0.7, metalness: 0.04 });
    const flagGeo = roundedBox(FLAG_W, FLAG_H, 0.08, 0.04, 1);
    const leftFlagMat = new THREE.MeshStandardMaterial({ color: LEFT_FLAG_COLOR, roughness: 0.45, metalness: 0.08 });
    const rightFlagMat = new THREE.MeshStandardMaterial({ color: RIGHT_FLAG_COLOR, roughness: 0.45, metalness: 0.08 });

    // ---- Assemble the scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const ruler = new THREE.Mesh(rulerGeo, rulerMat);
    ruler.position.set(0, RULER_Y, RULER_Z);
    ruler.castShadow = true;
    ruler.receiveShadow = true;
    root.add(ruler);

    // Static ticks + labels (the ruler never changes).
    const ticksGroup = new THREE.Group();
    root.add(ticksGroup);
    for (let cm = 0; cm <= RULER_MAX; cm++) {
      const x = cmToX(cm);
      const cmTick = new THREE.Mesh(cmTickGeo, tickMat);
      cmTick.position.set(x, TICK_TOP_Y - CM_TICK_H / 2, TICK_Z);
      ticksGroup.add(cmTick);
      // Number label below each cm tick.
      const label = new THREE.Mesh(labelGeo, labelMats[cm]);
      label.position.set(x, LABEL_Y, LABEL_Z);
      ticksGroup.add(label);
      // mm subticks between this cm and the next.
      if (cm < RULER_MAX) {
        for (let mm = 1; mm < 10; mm++) {
          const mmTick = new THREE.Mesh(mmTickGeo, tickMat);
          mmTick.position.set(x + (mm / 10) * CM, TICK_TOP_Y - MM_TICK_H / 2, TICK_Z);
          ticksGroup.add(mmTick);
        }
      }
    }

    // Pencil group (body + tip), repositioned/scaled per problem.
    const pencilGroup = new THREE.Group();
    const pencilBody = new THREE.Mesh(pencilBodyGeo, pencilBodyMat);
    pencilBody.castShadow = true;
    const pencilTip = new THREE.Mesh(pencilTipGeo, pencilTipMat);
    pencilTip.rotation.z = -Math.PI / 2; // point the cone toward +X (right end)
    pencilTip.castShadow = true;
    pencilGroup.add(pencilBody);
    pencilGroup.add(pencilTip);
    root.add(pencilGroup);

    // Two edge flags (pole + flag), each a small group moved to its chosen cm.
    function makeFlag(mat: THREE.MeshStandardMaterial): THREE.Group {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 0, 0);
      pole.castShadow = true;
      const flag = new THREE.Mesh(flagGeo, mat);
      flag.position.set(FLAG_W / 2 + 0.05, FLAG_POLE_H / 2 - FLAG_H / 2, 0);
      flag.castShadow = true;
      g.add(pole);
      g.add(flag);
      g.position.y = FLAG_Y;
      g.position.z = FLAG_Z;
      return g;
    }
    const leftFlag = makeFlag(leftFlagMat);
    const rightFlag = makeFlag(rightFlagMat);
    root.add(leftFlag);
    root.add(rightFlag);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as RulerProblem,
      // Markers START misaligned so the puzzle never opens solved.
      left: 0,
      right: 0,
      streak: 0,
      answered: 0,
    };

    /** Lay the pencil from `start` to `start+length` cm above the ruler. */
    function layPencil(animate: boolean): void {
      const x0 = cmToX(state.problem.start);
      const x1 = cmToX(state.problem.start + state.problem.length);
      const bodyLen = x1 - x0;
      pencilBody.scale.set(bodyLen, 1, 1);
      pencilBody.position.set((x0 + x1) / 2, PENCIL_Y, PENCIL_Z);
      pencilTip.position.set(x1 + (CM * 0.9) / 2, PENCIL_Y, PENCIL_Z);
      if (animate && !ctx.prefersReducedMotion) track(popIn(pencilGroup, { scale: 1 }));
    }

    /** Move a flag group to its current cm (tweened unless reduced-motion). */
    function renderFlag(flag: THREE.Group, cm: number, animate: boolean): void {
      const targetX = cmToX(cm);
      if (!animate || ctx.prefersReducedMotion) {
        flag.position.x = targetX;
        return;
      }
      track(
        tweenTo(flag.position.x, targetX, MARKER_TWEEN_MS, (v) => {
          flag.position.x = v;
        })
      );
    }

    function showPrompt(): void {
      // TASK ONLY — never echoes the live marker positions or whether it's correct.
      ctx.prompt.set(ctx.t('rulerMeasure.prompt'));
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

    function setLeft(cm: number, animate: boolean): void {
      state.left = Math.max(0, Math.min(RULER_MAX, cm));
      renderFlag(leftFlag, state.left, animate);
    }
    function setRight(cm: number, animate: boolean): void {
      state.right = Math.max(0, Math.min(RULER_MAX, cm));
      renderFlag(rightFlag, state.right, animate);
    }

    function resetMarkers(): void {
      setLeft(0, true);
      setRight(0, true);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'left-dec',
          label: `${ctx.t('controls.left')} −`,
          onPress: () => setLeft(state.left - 1, true),
        },
        {
          id: 'left-inc',
          label: `${ctx.t('controls.left')} +`,
          onPress: () => setLeft(state.left + 1, true),
        },
        {
          id: 'right-dec',
          label: `${ctx.t('controls.right')} −`,
          onPress: () => setRight(state.right - 1, true),
        },
        {
          id: 'right-inc',
          label: `${ctx.t('controls.right')} +`,
          onPress: () => setRight(state.right + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetMarkers,
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
      layPencil(true);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('rulerMeasure.correct', { length: state.problem.length }));
      track(punch(pencilGroup, 0.18));
      track(punch(leftFlag, 0.18));
      track(punch(rightFlag, 0.18));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('rulerMeasure.wrong'));
      track(shake(leftFlag, 0.07, 280));
      track(shake(rightFlag, 0.07, 280));
    }

    function confirm(): void {
      const answer: MarkerAnswer = { left: state.left, right: state.right };
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
        state.problem = qs.current as RulerProblem;
        // Reset markers between problems so the next one doesn't open solved.
        resetMarkers();
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → KEEP the markers to fix.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        state.problem = generator.next();
        resetMarkers();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = grab the NEAREST flag and slide it to the pointer's cm. NDC-x maps
    // monotonically to cm (right → larger); snaps to whole cm. Never inverted.
    const offDrag = ctx.input.on('drag', (p) => {
      const cm = pointerToCm(p.x);
      // Pick whichever flag is closest to the pointer so a single drag controls it.
      const dLeft = Math.abs(cm - state.left);
      const dRight = Math.abs(cm - state.right);
      if (dLeft <= dRight) {
        if (cm !== state.left) setLeft(cm, false);
      } else if (cm !== state.right) {
        setRight(cm, false);
      }
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: pencil laid, flags at 0/0 (misaligned), controls + status up.
    layPencil(false);
    renderFlag(leftFlag, state.left, false);
    renderFlag(rightFlag, state.right, false);
    track(popIn(root, { scale: 1 }));
    setControls();
    showPrompt();
    showStatus();

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

        ticksGroup.clear();
        root.clear();
        ctx.scene.remove(root);

        rulerGeo.dispose();
        rulerMat.dispose();
        cmTickGeo.dispose();
        mmTickGeo.dispose();
        tickMat.dispose();
        labelGeo.dispose();
        labelTextures.forEach((t) => t.dispose());
        labelMats.forEach((m) => m.dispose());
        pencilBodyGeo.dispose();
        pencilBodyMat.dispose();
        pencilTipGeo.dispose();
        pencilTipMat.dispose();
        poleGeo.dispose();
        poleMat.dispose();
        flagGeo.dispose();
        leftFlagMat.dispose();
        rightFlagMat.dispose();
      },
    };
  },
};

/**
 * Render a number (0..RULER_MAX) as a small dark-on-wood canvas texture for a cm
 * label. Created once per cm at init and reused; disposed in dispose().
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    g.fillStyle = LABEL_BG;
    g.globalAlpha = 0; // transparent background; only the digits show
    g.fillRect(0, 0, size, size);
    g.globalAlpha = 1;
    g.fillStyle = LABEL_FG;
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
