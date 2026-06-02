import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
  roundedBox,
  punch,
  shake,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — we use it to fade the dots' material opacity and to slide the cloth
// cover (the kit's popIn/punch/shake only touch scale/position uniformly).
import { tweenTo } from '@/lib/games3d/kit/juice';
import { createSubitizeGenerator, type SubitizeProblem } from './problems';

// Theme: a MAGICIAN'S TABLE under a spotlight. A round dark-velvet tray holds
// glowing dot chips arranged in a recognizable pattern (dice 1–6, paired /
// ten-frame-ish groupings 7–10). On show, the dots FLASH bright for ~1.5s, then
// a velvet CLOTH slides up over the tray and the dots fade — the child must
// recall how many they saw (SUBITIZING) and enter the count with −/+. בדוק
// grades the entered count against the flashed number; the prompt shows ONLY the
// task. A front-facing locked camera keeps the dot pattern readable.
//
// The scene lives in the XY plane facing the camera at z≈0, like clock-builder:
// "up" on screen is +Y, drag-x → world-x is monotonic.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const FLASH_MS = 1500; // how long the dots stay visible before the cloth covers
const FADE_MS = 360; // fade/slide duration when hiding (and revealing)
const MAX_INPUT = 12; // count input clamp upper bound (a touch above MAX_DOTS)

// Tray + dot geometry (procedural, front-facing).
const TRAY_RADIUS = 4.6;
const TRAY_THICKNESS = 0.5;
const RIM_RADIUS = TRAY_RADIUS + 0.32;
const TRAY_Z = 0;
const DOT_RADIUS = 0.62;
const DOT_DEPTH = 0.4;
const DOT_Z = TRAY_Z + TRAY_THICKNESS / 2 + DOT_DEPTH / 2 + 0.02; // sit ON the felt
const PATTERN_SPREAD = 2.7; // half-extent of the dot grid in world units
const CLOTH_HIDDEN_Y = TRAY_RADIUS * 2 + 3; // cloth parks well above the tray
const CLOTH_COVER_Y = 0; // cloth centered over the tray when covering

// Magician palette: deep velvet felt + brass rim; dots glow GOLD on the dark
// felt for strong contrast (never faint light-on-light). The cloth is a darker
// velvet so it reads as "covered".
const FELT_COLOR = 0x2a1840; // deep purple velvet
const RIM_COLOR = 0xc99a3b; // brass rim
const DOT_COLOR = PALETTE.sun; // glowing gold chips
const DOT_EMISSIVE = 0x6b5410; // gentle self-glow so they pop on dark felt
const CLOTH_COLOR = 0x1d1030; // darker velvet cloth

/**
 * Dot positions for a given count, in tray-local units (−1..1 grid), arranged in
 * recognizable patterns: dice pips for 1–6, paired ten-frame-ish rows for 7–10.
 * Returned as [col(-1..1), row(-1..1)] pairs; the renderer scales by PATTERN_SPREAD.
 */
function dotLayout(count: number): Array<[number, number]> {
  // Dice pip patterns (classic) for 1..6 — instantly subitizable.
  const DICE: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [
      [-1, 1],
      [1, -1],
    ],
    3: [
      [-1, 1],
      [0, 0],
      [1, -1],
    ],
    4: [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ],
    5: [
      [-1, 1],
      [1, 1],
      [0, 0],
      [-1, -1],
      [1, -1],
    ],
    6: [
      [-1, 1],
      [1, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1],
    ],
  };
  if (count <= 6) return DICE[count];

  // 7..10: two rows of up to five (ten-frame-ish), top row filled first so the
  // grouping reads as "five and some more".
  const top = Math.min(5, count);
  const bottom = count - top;
  const positions: Array<[number, number]> = [];
  const xForRow = (n: number, i: number): number => {
    if (n === 1) return 0;
    // Spread n dots across the row symmetrically in −1..1.
    return -1 + (2 * i) / (n - 1);
  };
  for (let i = 0; i < top; i++) positions.push([xForRow(top, i), 0.55]);
  for (let i = 0; i < bottom; i++) positions.push([xForRow(bottom, i), -0.55]);
  return positions;
}

export const subitizeDotsGame: Game3D = {
  meta: {
    id: 'subitize-dots',
    i18nKey: 'games3d.subitize',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [1, 2],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera: the tray faces the viewer so the dot pattern
    // is fully readable; "up" on screen is +Y. Distance sized to fit the rim's
    // diameter (~10 units wide) with margin in the central viewport.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 14), new THREE.Vector3(0, 0, 0));

    // Dark, dramatic spotlight ambience fitting a magician's table. No ground
    // plane (the tray floats framed by the dark gradient); the engine still adds
    // the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#2a1840',
      bottomColor: '#0e0820',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createSubitizeGenerator();
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

    // ---- Flash/hide timeout tracking (a stray timer after dispose is a crash) ----
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    function later(fn: () => void, ms: number): void {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
    }
    function clearTimers(): void {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    }

    // ---- Shared, reused resources (one geometry + material per kind) ----
    const trayGeo = new THREE.CylinderGeometry(TRAY_RADIUS, TRAY_RADIUS, TRAY_THICKNESS, 48);
    trayGeo.rotateX(Math.PI / 2); // lay the disc to face +Z (camera)
    const trayMat = new THREE.MeshStandardMaterial({ color: FELT_COLOR, roughness: 0.95, metalness: 0.02 });

    const rimGeo = new THREE.TorusGeometry(RIM_RADIUS, 0.26, 16, 60);
    const rimMat = new THREE.MeshStandardMaterial({ color: RIM_COLOR, roughness: 0.45, metalness: 0.5 });

    // One dot geometry reused for every chip (a short glowing cylinder = a chip).
    const dotGeo = new THREE.CylinderGeometry(DOT_RADIUS, DOT_RADIUS, DOT_DEPTH, 28);
    dotGeo.rotateX(Math.PI / 2); // face the camera
    // ONE shared dot material; opacity is animated for the fade (all dots fade
    // together, so a single shared material is correct and cheap).
    const dotMat = new THREE.MeshStandardMaterial({
      color: DOT_COLOR,
      emissive: DOT_EMISSIVE,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    });

    // Velvet cloth cover: a rounded panel slightly larger than the tray that
    // slides down over the dots to hide them.
    const clothGeo = roundedBox(TRAY_RADIUS * 2 + 0.6, TRAY_RADIUS * 2 + 0.6, 0.3, 0.6, 4);
    const clothMat = new THREE.MeshStandardMaterial({ color: CLOTH_COLOR, roughness: 0.92, metalness: 0.03 });

    // ---- Assemble the table ----
    const table = new THREE.Group();
    ctx.scene.add(table);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = TRAY_Z;
    rim.castShadow = true;
    table.add(rim);

    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.z = TRAY_Z;
    tray.receiveShadow = true;
    table.add(tray);

    // Dots live in their own group so the whole pattern can be punched uniformly.
    const dotGroup = new THREE.Group();
    table.add(dotGroup);

    // Cloth slides on its own; starts parked above the tray (off the dots).
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(0, CLOTH_HIDDEN_Y, DOT_Z + 0.5); // in front of the dots
    cloth.castShadow = true;
    table.add(cloth);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as SubitizeProblem,
      answer: 0, // count input starts at 0 (≠ count, since count ≥ 1 — never opens solved)
      revealed: false, // are the dots currently visible?
      streak: 0,
      answered: 0,
    };

    /** Rebuild the dot chips for the current problem's count (shared geo/mat). */
    function buildDots(): void {
      dotGroup.clear();
      const positions = dotLayout(state.problem.count);
      for (const [cx, cy] of positions) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(cx * PATTERN_SPREAD, cy * PATTERN_SPREAD, DOT_Z);
        dot.castShadow = true;
        dotGroup.add(dot);
      }
    }

    /**
     * Flash the dots: snap the cloth away, build + fade the dots IN, hold for
     * FLASH_MS, then slide the cloth over and fade the dots OUT. All timers are
     * tracked so dispose can cancel a pending hide.
     */
    function flash(): void {
      // Stop any in-flight hide-fade / cloth-slide tweens FIRST so a re-flash
      // ("show again" / tap) starts from a clean tween state — otherwise stale
      // tweens fight the new flash-in fade for ~FADE_MS. We then hard-snap the
      // cloth open and the dot opacity below so flash() is deterministic.
      stopAllTweens();
      clearTimers();
      buildDots();
      state.revealed = true;
      cloth.position.y = CLOTH_HIDDEN_Y; // pull the cloth off (hard snap)
      if (ctx.prefersReducedMotion) {
        dotMat.opacity = 1;
      } else {
        dotMat.opacity = 0; // hard-snap to hidden, then fade IN cleanly
        track(tweenTo(0, 1, FADE_MS, (v) => (dotMat.opacity = v)));
      }
      later(hideDots, FLASH_MS);
    }

    /** Hide the dots: fade them out and slide the velvet cloth over the tray. */
    function hideDots(): void {
      state.revealed = false;
      if (ctx.prefersReducedMotion) {
        dotMat.opacity = 0;
        cloth.position.y = CLOTH_COVER_Y;
        return;
      }
      track(tweenTo(dotMat.opacity, 0, FADE_MS, (v) => (dotMat.opacity = v)));
      track(tweenTo(cloth.position.y, CLOTH_COVER_Y, FADE_MS, (v) => (cloth.position.y = v)));
    }

    function showPrompt(): void {
      // TASK ONLY — asks the question, never echoes the count or correctness.
      ctx.prompt.set(ctx.t('subitize.prompt'));
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

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'value-dec', label: `${ctx.t('controls.value')} −`, onPress: () => stepValue(-1) },
        { id: 'value-inc', label: `${ctx.t('controls.value')} +`, onPress: () => stepValue(1) },
        { id: 'show-again', label: ctx.t('controls.showAgain'), onPress: flash },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetCount },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Adjust the entered count, clamped 0..MAX_INPUT. */
    function stepValue(delta: number): void {
      state.answer = Math.max(0, Math.min(MAX_INPUT, state.answer + delta));
    }

    /** Reset the entered count to 0 (never the solved value, since count ≥ 1). */
    function resetCount(): void {
      state.answer = 0;
    }

    function startNewProblem(): void {
      resetCount();
      showPrompt();
      showStatus();
      flash(); // auto-flash the new pattern
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('subitize.correct', { count: state.problem.count }));
      // Reveal the dots so the child SEES the count they got right, then punch
      // the whole pattern group (uniform scale → safe for punch).
      revealForFeedback();
      track(punch(dotGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('subitize.wrong'));
      track(shake(table, 0.06, 280));
    }

    /** On grading, slide the cloth off and show the dots so the answer is visible. */
    function revealForFeedback(): void {
      clearTimers();
      buildDots();
      state.revealed = true;
      if (ctx.prefersReducedMotion) {
        dotMat.opacity = 1;
        cloth.position.y = CLOTH_HIDDEN_Y;
        return;
      }
      track(tweenTo(dotMat.opacity, 1, FADE_MS, (v) => (dotMat.opacity = v)));
      track(tweenTo(cloth.position.y, CLOTH_HIDDEN_Y, FADE_MS, (v) => (cloth.position.y = v)));
    }

    function confirm(): void {
      const answer = state.answer;
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

      // Practice: correct → score + next problem; wrong → KEEP the count so the
      // child can fix it (no fail-out). The dots are revealed for feedback either
      // way so they can re-examine the pattern.
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
        revealForFeedback();
        showStatus();
      }
    }

    // Tap re-flashes the dots (a natural "show me again" gesture); the on-screen
    // "Show again" button is the primary path. The InputAdapter only fires `tap`
    // on a near-stationary pointerup, so a small drag still reads as a drag (and
    // never as a re-flash).
    const offTap = ctx.input.on('tap', flash);

    // Drag = set the entered count, in addition to the −/+ buttons (DEFINITION §8).
    // Vertical drag with NATURAL mapping (§9): dragging UP steps the count up,
    // dragging DOWN steps it down, one step per ~0.08 NDC of travel, clamped to
    // the SAME 0..MAX_INPUT range stepValue() uses and writing the SAME
    // state.answer the buttons drive (§13b: the count display is the value
    // mechanism — no non-uniform mesh scale + popIn here).
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // NDC: +y is up → up = more (no inversion)
      if (dy > 0.08) {
        stepValue(1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        stepValue(-1);
        lastDragY = p.y;
      }
    });

    // Initial render: build pattern, show controls/prompt/status, flash once.
    // The static table (tray + rim) must be VISIBLE and opaque from frame 1, so
    // its scale is fixed at 1 — we do NOT pop the table in via a tracked tween,
    // because startNewProblem() → flash() calls stopAllTweens() synchronously on
    // this same frame: a tracked table popIn would be stopped while its scale is
    // still ~0 (popIn snaps scale to 0.001 immediately and only grows on the next
    // engine frame), freezing the whole table — tray, rim, dots, cloth — at near
    // zero and rendering the scene empty. Only the DOTS fade (FADE_MS) per §13b.
    table.scale.setScalar(1);
    setControls();
    startNewProblem();

    return {
      onResize() {},
      dispose() {
        offTap();
        offDragStart();
        offDrag();
        clearTimers();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        dotGroup.clear();
        table.clear();
        ctx.scene.remove(table);

        trayGeo.dispose();
        trayMat.dispose();
        rimGeo.dispose();
        rimMat.dispose();
        dotGeo.dispose();
        dotMat.dispose();
        clothGeo.dispose();
        clothMat.dispose();
      },
    };
  },
};
