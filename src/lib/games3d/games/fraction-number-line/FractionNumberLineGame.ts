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
import {
  createFractionNumberLineGenerator,
  GRADE_4_MAX_DENOMINATOR,
  type FractionTarget,
} from './problems';

// Theme: a floating MEASURING TAPE / cloth ribbon stretched as the 0→1 number
// line, facing the viewer in the XY plane. The DENOMINATOR control subdivides the
// ribbon into N equal parts — N+1 dark tick blocks are (re-)drawn live across it.
// The NUMERATOR control and dragging place a bright MARKER BEAD on the ribbon at
// value = numerator/denominator. Dragging the bead RIGHT raises the value (never
// inverted); it snaps to the nearest current subdivision (= the numerator). בדוק
// grades the bead's VALUE against the target via integer cross-multiply, so an
// equivalent placement (2/4 for a 1/2 target) counts as correct. Procedural only.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

const MIN_DENOMINATOR = 2;
const MAX_DENOMINATOR = GRADE_4_MAX_DENOMINATOR; // 8

// Ribbon geometry (XY plane, facing the locked camera at +Z).
const LINE_HALF = 5.2; // world-x from -HALF (value 0) to +HALF (value 1)
const LINE_SPAN = LINE_HALF * 2;
const RIBBON_HEIGHT = 0.7; // tape height (Y)
const RIBBON_DEPTH = 0.28;
const RIBBON_Y = 0;
const RIBBON_Z = 0;

const TICK_WIDTH = 0.12;
const TICK_HEIGHT = RIBBON_HEIGHT + 0.55; // ticks rise above/below the tape
const TICK_DEPTH = 0.16;
const TICK_Z = RIBBON_Z + RIBBON_DEPTH / 2 + 0.04;

const END_WIDTH = 0.42; // chunky 0 and 1 end blocks (taller than ticks)
const END_HEIGHT = RIBBON_HEIGHT + 1.0;
const END_DEPTH = 0.3;

const MARKER_RADIUS = 0.55;
const MARKER_Z = RIBBON_Z + RIBBON_DEPTH / 2 + MARKER_RADIUS * 0.7;
const MARKER_TWEEN_MS = 220;

// Palette: warm cream tape, dark saturated ticks/ends (high contrast — never
// faint light-on-light), a vivid coral marker bead the child tracks.
const RIBBON_COLOR = PALETTE.cream;
const TICK_COLOR = 0x3d2817; // dark cocoa — strong contrast on the cream tape
const END_ZERO_COLOR = 0x2f6f4e; // deep green "0" post
const END_ONE_COLOR = 0x8a3b6b; // deep magenta "1" post
const MARKER_COLOR = PALETTE.coral;

/** value (0..1) → world-x on the ribbon. Monotonic increasing → drag-right = larger. */
function valueToX(value: number): number {
  return -LINE_HALF + value * LINE_SPAN;
}

/** NDC-x (−1..1) of the pointer → nearest numerator (0..den) at the current den. */
function pointerToNumerator(ndcX: number, den: number): number {
  // Map the visible ribbon span to NDC. The locked camera looks straight down −Z
  // with no roll, so world-x increases monotonically with NDC-x (no mirror).
  // Approximate value from NDC by treating the ribbon as filling most of the view;
  // we convert via the world-x the bead would need, using the camera-independent
  // fact that value is linear in x. We clamp to 0..1, then snap to k/den.
  const value = (ndcX + 1) / 2; // 0..1 across the screen → matches drag-right = up
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * den); // nearest subdivision = numerator
}

export const fractionNumberLineGame: Game3D = {
  meta: {
    id: 'fraction-number-line',
    i18nKey: 'games3d.fractionNumberLine',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // The ribbon faces the viewer: lock the camera in front of the XY plane so
    // "right" on screen is +X (larger value) and the line reads horizontally.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 12), new THREE.Vector3(0, 0, 0));

    // Soft cloth/craft ambience. No ground plane (the tape floats); the engine
    // still casts the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f3e9d8',
      bottomColor: '#dcc7a6',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    // Grade band 3–4 → allow denominators up to 8 (grade 4 end of the spec).
    const generator = createFractionNumberLineGenerator({ grade: 4 });
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

    // ---- Shared, reused resources (one geometry + material per KIND) ----
    // The ribbon is a single rounded box stretched along X.
    const ribbonGeo = roundedBox(LINE_SPAN + END_WIDTH, RIBBON_HEIGHT, RIBBON_DEPTH, 0.14, 3);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: RIBBON_COLOR, roughness: 0.85, metalness: 0.02 });

    // ONE shared tick geometry + material reused for every interior tick. The tick
    // group is cleared and repopulated when the denominator changes, but no new
    // geometry/material is ever allocated per tick — they all share these two.
    const tickGeo = roundedBox(TICK_WIDTH, TICK_HEIGHT, TICK_DEPTH, 0.04, 2);
    const tickMat = new THREE.MeshStandardMaterial({ color: TICK_COLOR, roughness: 0.6, metalness: 0.04 });

    // Distinct chunky end posts mark 0 (green) and 1 (magenta) — clearly the line's ends.
    const endGeo = roundedBox(END_WIDTH, END_HEIGHT, END_DEPTH, 0.08, 2);
    const endZeroMat = new THREE.MeshStandardMaterial({ color: END_ZERO_COLOR, roughness: 0.6, metalness: 0.05 });
    const endOneMat = new THREE.MeshStandardMaterial({ color: END_ONE_COLOR, roughness: 0.6, metalness: 0.05 });

    // Marker bead.
    const markerGeo = new THREE.SphereGeometry(MARKER_RADIUS, 28, 20);
    const markerMat = new THREE.MeshStandardMaterial({ color: MARKER_COLOR, roughness: 0.4, metalness: 0.12 });

    // ---- Assemble the scene graph ----
    const tape = new THREE.Group();
    ctx.scene.add(tape);

    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.position.set(0, RIBBON_Y, RIBBON_Z);
    ribbon.castShadow = true;
    ribbon.receiveShadow = true;
    tape.add(ribbon);

    const endZero = new THREE.Mesh(endGeo, endZeroMat);
    endZero.position.set(valueToX(0), RIBBON_Y, RIBBON_Z);
    endZero.castShadow = true;
    tape.add(endZero);

    const endOne = new THREE.Mesh(endGeo, endOneMat);
    endOne.position.set(valueToX(1), RIBBON_Y, RIBBON_Z);
    endOne.castShadow = true;
    tape.add(endOne);

    // Interior ticks live in their own group so we can clear/repopulate on retick.
    const ticksGroup = new THREE.Group();
    tape.add(ticksGroup);

    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(valueToX(0), RIBBON_Y, MARKER_Z);
    marker.castShadow = true;
    tape.add(marker);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as FractionTarget,
      num: 0, // current marker numerator (0..den)
      den: MIN_DENOMINATOR, // current subdivision count
      streak: 0,
      answered: 0,
    };

    function currentValue(): number {
      return state.den > 0 ? state.num / state.den : 0;
    }

    /**
     * (Re-)draw the interior subdivision ticks for the current denominator. The
     * line is divided into `den` equal parts → `den - 1` INTERIOR ticks (the ends
     * 0 and 1 are the dedicated end posts). Reuses the ONE shared tick geo+mat for
     * every tick; old tick meshes are just removed from the group (no per-tick
     * geometry to dispose because they all share `tickGeo`).
     */
    function retick(): void {
      ticksGroup.clear();
      for (let k = 1; k < state.den; k++) {
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.set(valueToX(k / state.den), RIBBON_Y, TICK_Z);
        tick.castShadow = true;
        ticksGroup.add(tick);
      }
    }

    /** Move the marker bead to the current value (tweened unless reduced-motion). */
    function renderMarker(animate: boolean): void {
      const targetX = valueToX(currentValue());
      if (!animate || ctx.prefersReducedMotion) {
        marker.position.x = targetX;
        return;
      }
      track(
        tweenTo(marker.position.x, targetX, MARKER_TWEEN_MS, (v) => {
          marker.position.x = v;
        })
      );
    }

    function showPrompt(): void {
      // TASK ONLY — shows the target fraction (digits LTR), never the live marker
      // value or whether it is correct.
      ctx.prompt.set(
        ctx.t('fractionNumberLine.prompt', { num: state.problem.num, den: state.problem.den })
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

    /** Set numerator, clamped to 0..den, and move the bead. */
    function setNumerator(num: number, animate: boolean): void {
      state.num = Math.max(0, Math.min(state.den, num));
      renderMarker(animate);
    }

    /**
     * Change the denominator, clamped to 2..MAX, re-tick the line LIVE, and keep
     * the marker at the SAME VALUE if it lands exactly on a subdivision of the new
     * denominator (e.g. 2/4 → 1/2); otherwise snap to the nearest subdivision.
     */
    function setDenominator(den: number, animate: boolean): void {
      const prevValue = currentValue();
      state.den = Math.max(MIN_DENOMINATOR, Math.min(MAX_DENOMINATOR, den));
      const exact = prevValue * state.den;
      const rounded = Math.round(exact);
      state.num = Math.max(0, Math.min(state.den, rounded));
      retick();
      renderMarker(animate);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'num-dec',
          label: `${ctx.t('controls.numerator')} −`,
          onPress: () => setNumerator(state.num - 1, true),
        },
        {
          id: 'num-inc',
          label: `${ctx.t('controls.numerator')} +`,
          onPress: () => setNumerator(state.num + 1, true),
        },
        {
          id: 'den-dec',
          label: `${ctx.t('controls.denominator')} −`,
          onPress: () => setDenominator(state.den - 1, true),
        },
        {
          id: 'den-inc',
          label: `${ctx.t('controls.denominator')} +`,
          onPress: () => setDenominator(state.den + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetLine,
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

    function resetLine(): void {
      state.den = MIN_DENOMINATOR;
      state.num = 0;
      retick();
      renderMarker(true);
    }

    function startNewProblem(): void {
      // Keep the marker/line where it is between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('fractionNumberLine.correct', { num: state.problem.num, den: state.problem.den })
      );
      track(punch(marker, 0.22));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('fractionNumberLine.wrong'));
      track(shake(tape, 0.06, 280));
    }

    function confirm(): void {
      const answer: FractionTarget = { num: state.num, den: state.den };
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

      // Practice: correct → score + next problem; wrong → KEEP the placed marker to fix.
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
     * Drag = grab the bead and slide it along the tape. The pointer's NDC-x maps
     * monotonically to value (right → larger), snapped to the nearest current
     * subdivision (= the numerator). Never inverted.
     */
    const offDrag = ctx.input.on('drag', (p) => {
      const newNum = pointerToNumerator(p.x, state.den);
      if (newNum === state.num) return;
      // Snap instantly while dragging so the bead tracks the finger.
      setNumerator(newNum, false);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: 2 subdivisions, marker at 0, prompt + status + controls up.
    retick();
    renderMarker(false);
    track(popIn(tape, { scale: 1 }));
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

        ticksGroup.clear();
        tape.clear();
        ctx.scene.remove(tape);

        ribbonGeo.dispose();
        ribbonMat.dispose();
        tickGeo.dispose();
        tickMat.dispose();
        endGeo.dispose();
        endZeroMat.dispose();
        endOneMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
      },
    };
  },
};
