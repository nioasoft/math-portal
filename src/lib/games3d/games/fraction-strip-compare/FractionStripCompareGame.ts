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
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — we adapt it to animate the balance lever's `rotation.z` (the kit's
// popIn/punch/shake only touch scale/position), exactly like AlgebraBalanceGame.
import { tweenTo } from '@/lib/games3d/kit/juice';
import {
  createFractionStripGenerator,
  isEquivalentDifferentDen,
  RIGHT_DEN_MIN,
  RIGHT_DEN_MAX,
  type FractionStripProblem,
  type StripAnswer,
} from './problems';

// Theme: a WOODEN WORKSHOP. Two horizontal wood strips of the SAME length lie
// stacked, each saw-cut into equal pieces. The TOP strip is GIVEN (fixed):
// `leftDen` cut pieces with `leftNum` painted in a saturated color. The BOTTOM
// strip is the child's: −/+ buttons set its number of saw-cuts (denominator) and
// how many pieces are painted (numerator). A small wooden BALANCE LEVER sits
// between the two strips and TILTS toward the bigger FRACTION VALUE, leveling
// when the two values are equal — a live readout, not a success verdict.
//
// Task: build a fraction EQUAL to the given one but with a DIFFERENT number of
// cuts (an equivalent fraction). בדוק grades it; the prompt shows ONLY the
// target fraction.
//
// LEVER TILT CONVENTION: the lever pivots about Z at its center (between the
// strips). diff = rightValue − leftValue. The bigger side should dip. The TOP
// strip is the given/left fraction (above, +Y); the BOTTOM is the child's/right
// (below, −Y). We tilt toward whichever fraction is LARGER: when the child's
// (bottom) value is bigger, the lever should point down toward it. positive
// Z-rot is CCW in three.js; we map rotation.z = clamp(k·(leftValue − rightValue))
// so the bigger value pulls its end down.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// ---- Procedural geometry layout (XY plane, facing a front camera at z≈0) ----
const STRIP_WIDTH = 8; // both strips share this full length (equivalent SIZE = equal value)
const STRIP_HEIGHT = 1.5; // vertical thickness of a strip
const STRIP_DEPTH = 0.7;
const PIECE_GAP = 0.06; // visible saw-cut gap between pieces
const TOP_Y = 2.7; // center Y of the given (top) strip
const BOTTOM_Y = -2.7; // center Y of the child's (bottom) strip

// Balance lever (between the strips, centered at the origin).
const LEVER_LEN = 3.6;
const LEVER_THICK = 0.34;
const LEVER_DEPTH = 0.5;
const FULCRUM_W = 0.7;
const FULCRUM_H = 1.1;
const MAX_TILT = 0.42; // radians — visible but never flips
const TILT_PER_VALUE = 1.6; // how much value-difference maps to lever angle
const TILT_TWEEN_MS = 380;

// Wood-workshop colors. Plain (uncut/uncolored) wood vs. saturated PAINTED pieces.
const WOOD_PLANK = 0xc8975a; // warm sawn pine
const WOOD_CUT = 0x9a6b34; // darker board behind the cuts (gap backing)
const PAINT_TOP = PALETTE.coral; // given strip's painted pieces (saturated)
const PAINT_BOTTOM = PALETTE.sky; // child's strip's painted pieces (saturated, distinct)
const LEVER_COLOR = 0x7a4f25; // dark stained lever + fulcrum (high contrast)

export const fractionStripCompareGame: Game3D = {
  meta: {
    id: 'fraction-strip-compare',
    i18nKey: 'games3d.fractionStrip',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-on locked camera (clock-builder pattern): straight-on at (0,0,D) so
    // drag-x → world-x stays monotonic and both strips + lever fill the viewport.
    // Content spans ~8 wide × ~7 tall; D≈12.5 frames it with a little margin.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 12.5), new THREE.Vector3(0, 0, 0));

    // Warm workshop ambience. ground:false — content is centered on the origin
    // and the bottom strip sits below y=0, so a clay ground plane would occlude it.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f4e2c4',
      bottomColor: '#e9cfa3',
      ground: false,
      shadowArea: 11,
      fog: false,
    });

    const generator = createFractionStripGenerator();
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

    // ---- Shared, reused resources (ONE geometry/material per visual kind) ----
    // A unit piece geometry scaled per-strip (width depends on the denominator).
    const pieceGeo = roundedBox(1, STRIP_HEIGHT, STRIP_DEPTH, 0.1, 3);
    const plankMat = new THREE.MeshStandardMaterial({ color: WOOD_PLANK, roughness: 0.85, metalness: 0.02 });
    const paintTopMat = new THREE.MeshStandardMaterial({ color: PAINT_TOP, roughness: 0.5, metalness: 0.05 });
    const paintBottomMat = new THREE.MeshStandardMaterial({ color: PAINT_BOTTOM, roughness: 0.5, metalness: 0.05 });
    // Backing board behind each strip so saw-cut gaps read as cuts, not voids.
    const backGeo = roundedBox(STRIP_WIDTH + 0.3, STRIP_HEIGHT + 0.3, STRIP_DEPTH - 0.25, 0.14, 3);
    const backMat = new THREE.MeshStandardMaterial({ color: WOOD_CUT, roughness: 0.95, metalness: 0.0 });

    // Lever + fulcrum (dark stained — high contrast against the light clay bg).
    const leverGeo = roundedBox(LEVER_LEN, LEVER_THICK, LEVER_DEPTH, 0.12, 3);
    const leverMat = new THREE.MeshStandardMaterial({ color: LEVER_COLOR, roughness: 0.7, metalness: 0.04 });
    const fulcrumGeo = roundedBox(FULCRUM_W, FULCRUM_H, LEVER_DEPTH, 0.12, 3);

    // ---- Scene graph ----
    // Top (given) strip group, bottom (child's) strip group, lever pivot group.
    const topGroup = new THREE.Group();
    topGroup.position.y = TOP_Y;
    const bottomGroup = new THREE.Group();
    bottomGroup.position.y = BOTTOM_Y;
    const leverPivot = new THREE.Group(); // pivots about its own Z at the origin

    // Backing boards (one per strip, static).
    const topBack = new THREE.Mesh(backGeo, backMat);
    topBack.position.set(0, TOP_Y, -0.05);
    topBack.receiveShadow = true;
    const bottomBack = new THREE.Mesh(backGeo, backMat);
    bottomBack.position.set(0, BOTTOM_Y, -0.05);
    bottomBack.receiveShadow = true;

    // Fulcrum stands below the lever pivot (static).
    const fulcrum = new THREE.Mesh(fulcrumGeo, leverMat);
    fulcrum.position.set(0, -FULCRUM_H / 2, 0);
    fulcrum.castShadow = true;
    const lever = new THREE.Mesh(leverGeo, leverMat);
    lever.castShadow = true;
    leverPivot.add(lever);

    ctx.scene.add(topBack, bottomBack, topGroup, bottomGroup, fulcrum, leverPivot);

    const state = {
      problem: pickProblem(generator, quiz),
      rightNum: 0,
      rightDen: RIGHT_DEN_MIN,
      streak: 0,
      answered: 0,
    };

    // ---- Strip building ----
    /**
     * Rebuild one strip's saw-cut pieces into `group`. `den` pieces span
     * STRIP_WIDTH with PIECE_GAP saw-cuts between them; the first `num` are
     * painted with `paintMat`, the rest plain plank. Reuses the shared geometry —
     * pieces are added fresh each rebuild but the geometry/materials are shared.
     */
    function buildStrip(
      group: THREE.Group,
      num: number,
      den: number,
      paintMat: THREE.Material,
      animateNew: boolean
    ): void {
      group.clear();
      const pieceW = (STRIP_WIDTH - PIECE_GAP * (den - 1)) / den;
      const startX = -STRIP_WIDTH / 2 + pieceW / 2;
      for (let i = 0; i < den; i++) {
        const painted = i < num;
        const piece = new THREE.Mesh(pieceGeo, painted ? paintMat : plankMat);
        piece.scale.x = pieceW;
        piece.position.x = startX + i * (pieceW + PIECE_GAP);
        piece.castShadow = true;
        piece.receiveShadow = true;
        group.add(piece);
      }
      if (animateNew) track(popIn(group, { scale: 1 }));
    }

    function buildTop(animate: boolean): void {
      buildStrip(topGroup, state.problem.leftNum, state.problem.leftDen, paintTopMat, animate);
    }
    function buildBottom(animate: boolean): void {
      buildStrip(bottomGroup, state.rightNum, state.rightDen, paintBottomMat, animate);
    }

    // ---- Tilt lever (live readout of which fraction value is bigger) ----
    /**
     * Tilt the lever toward the LARGER fraction value (the top/given vs. the
     * bottom/child). Levels (rotation.z = 0) when the two VALUES are equal — the
     * live "they're the same size" signal — but leveling alone is NOT success
     * (a same-denominator copy also levels; the child must still press בדוק and a
     * different denominator is required). diff via integer cross-multiplication;
     * leftValue − rightValue mapped so the bigger side's end dips.
     */
    function renderTilt(animate: boolean): void {
      const left = state.problem;
      // Cross-multiply to compare without floats: leftNum/leftDen vs rightNum/rightDen.
      const cross = left.leftNum * state.rightDen - state.rightNum * left.leftDen;
      const denProduct = left.leftDen * state.rightDen || 1;
      const signed = cross / denProduct; // >0 → top (given) bigger; <0 → bottom bigger
      const target = THREE.MathUtils.clamp(signed * TILT_PER_VALUE, -MAX_TILT, MAX_TILT);
      if (!animate || ctx.prefersReducedMotion) {
        leverPivot.rotation.z = target;
        return;
      }
      const from = leverPivot.rotation.z;
      track(tweenTo(from, target, TILT_TWEEN_MS, (v) => {
        leverPivot.rotation.z = v;
      }));
    }

    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('fractionStrip.prompt', { num: state.problem.leftNum, den: state.problem.leftDen })
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

    /** Apply a new bottom-strip num/den (clamped), rebuild it + the lever. */
    function setRight(num: number, den: number, animate: boolean): void {
      state.rightDen = Math.max(RIGHT_DEN_MIN, Math.min(RIGHT_DEN_MAX, den));
      // Numerator clamps to 0..rightDen (color from none up to the whole strip).
      state.rightNum = Math.max(0, Math.min(state.rightDen, num));
      buildBottom(animate);
      renderTilt(animate);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'num-dec',
          label: `${ctx.t('controls.numerator')} −`,
          onPress: () => setRight(state.rightNum - 1, state.rightDen, false),
        },
        {
          id: 'num-inc',
          label: `${ctx.t('controls.numerator')} +`,
          onPress: () => setRight(state.rightNum + 1, state.rightDen, false),
        },
        {
          id: 'den-dec',
          label: `${ctx.t('controls.denominator')} −`,
          onPress: () => setRight(state.rightNum, state.rightDen - 1, true),
        },
        {
          id: 'den-inc',
          label: `${ctx.t('controls.denominator')} +`,
          onPress: () => setRight(state.rightNum, state.rightDen + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setRight(...startRight(state.problem), true),
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
      state.problem = pickProblem(generator, quiz);
      buildTop(true);
      setRight(...startRight(state.problem), true);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('fractionStrip.correct', {
          num: state.problem.leftNum,
          den: state.problem.leftDen,
          rnum: state.rightNum,
          rden: state.rightDen,
        })
      );
      track(punch(topGroup, 0.12));
      track(punch(bottomGroup, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('fractionStrip.wrong'));
      track(shake(bottomGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer: StripAnswer = { num: state.rightNum, den: state.rightDen };
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
        buildTop(true);
        setRight(...startRight(state.problem), true);
        showPrompt();
        showStatus();
        return;
      }

      // Practice: correct → score + next; wrong → KEEP the built strip to fix.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = fast build of the child's strip. Right → more painted pieces
    // (numerator up); up → more cuts (denominator up). Monotonic under the
    // front camera (NDC x→world x, NDC y→world y), so directions are natural.
    const offDrag = ctx.input.on('drag', (p) => {
      const den = Math.round(((p.y + 1) / 2) * (RIGHT_DEN_MAX - RIGHT_DEN_MIN)) + RIGHT_DEN_MIN;
      const clampedDen = Math.max(RIGHT_DEN_MIN, Math.min(RIGHT_DEN_MAX, den));
      const num = Math.round(((p.x + 1) / 2) * clampedDen);
      setRight(num, clampedDen, false);
    });
    // dragEnd is a secondary submit; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // ---- Initial build ----
    buildTop(true);
    setRight(...startRight(state.problem), true);
    showPrompt();
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

        topGroup.clear();
        bottomGroup.clear();
        leverPivot.clear();
        ctx.scene.remove(topGroup, bottomGroup, leverPivot, topBack, bottomBack, fulcrum);

        pieceGeo.dispose();
        plankMat.dispose();
        paintTopMat.dispose();
        paintBottomMat.dispose();
        backGeo.dispose();
        backMat.dispose();
        leverGeo.dispose();
        leverMat.dispose();
        fulcrumGeo.dispose();
      },
    };
  },
};

/** Pick the next given fraction (quiz reads the controller's current problem). */
function pickProblem(
  generator: ReturnType<typeof createFractionStripGenerator>,
  quiz: ReturnType<typeof createQuizController<FractionStripProblem>> | null
): FractionStripProblem {
  return quiz ? quiz.state().current : generator.next();
}

/**
 * Choose a START (num, den) for the child's strip that is NOT a correct answer,
 * so a problem never opens already-solved: 0/RIGHT_DEN_MIN has value 0 < the
 * given proper fraction, and is also never an equivalent. Guaranteed wrong.
 */
function startRight(problem: FractionStripProblem): [number, number] {
  const start: StripAnswer = { num: 0, den: RIGHT_DEN_MIN };
  // Defensive: 0/2 is always value 0 (given value > 0), so this is never solved,
  // but assert via the real predicate so any future change stays honest.
  if (isEquivalentDifferentDen(problem, start)) {
    return [1, RIGHT_DEN_MIN === problem.leftDen ? RIGHT_DEN_MIN + 1 : RIGHT_DEN_MIN];
  }
  return [start.num, start.den];
}
