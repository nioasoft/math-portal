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
import { createEstimationGenerator, type EstimationProblem } from './problems';

// Theme: a sunny FIELD strewn with scattered berries — far too many to count one
// by one. Off to the side a small fenced REFERENCE PATCH holds EXACTLY 10 berries
// (labelled "10") so the child can scale their eye: "the big field looks like
// about four of those patches → ~40". The child dials an estimate with −/+ or by
// dragging (up/right = more), then בדוק. A close-enough guess (±20%) counts — the
// skill is a good ESTIMATE, not the exact tally. On a miss the feedback nudges
// "too high"/"too low" so the child converges.
//
// Front-facing locked camera (XY plane, like clock-builder/subitize-dots): screen
// "up" is +Y and drag-x → world-x is monotonic, so drag directions stay natural.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const MAX_GUESS = 99; // estimate input clamp
const REFERENCE_COUNT = 10; // the scale-guide patch always holds exactly ten

// --- Field / layout (world units, centered on the origin, all above the camera's line) ---
const FIELD_W = 13; // wide grassy backdrop panel
const FIELD_H = 9.5;
const FIELD_Z = -0.6; // sits behind the berries
// The main scatter occupies the LEFT ~70% of the field; the reference patch the right.
const SCATTER_MIN_X = -5.7;
const SCATTER_MAX_X = 1.7;
const SCATTER_MIN_Y = -3.1;
const SCATTER_MAX_Y = 3.3;
const BERRY_RADIUS = 0.26;
const BERRY_Z = 0.1; // berries sit just in front of the field

// Reference patch (right side): a darker framed plot with ten berries in a tidy
// 5×2 grid + a "10" label above it, in a DISTINCT berry color for contrast.
const REF_CENTER_X = 4.55;
const REF_CENTER_Y = -0.4;
const REF_COLS = 5;
const REF_ROWS = 2;
const REF_CELL = 0.92;
const REF_PAD = 0.7;

// Guess readout board (bottom-center): a dark slate showing the dialed estimate
// in big light digits — the in-scene progress display (never revealed in the prompt).
const BOARD_W = 3.1;
const BOARD_H = 1.7;
const BOARD_Y = -3.85;
const BOARD_Z = 0.5;

// Palette: scattered field berries cycle warm reds/corals on green; the reference
// ten are a saturated BLUE so the guide group reads as a separate, countable set.
const FIELD_BERRY_COLORS = [PALETTE.coral, 0xe0533b, PALETTE.sun] as const;
const REF_BERRY_COLOR = PALETTE.sky;
const FIELD_COLOR = 0x6fae54; // saturated grass
const REF_PLOT_COLOR = 0x3c6b2e; // darker soil-green plot, frames the ten
const BOARD_COLOR = 0x241a33; // dark slate (light digits sit on it → strong contrast)

/**
 * Deterministic-per-problem pseudo-random scatter so a problem's field is stable
 * across rebuilds within its lifetime but differs between problems. Uses a small
 * LCG seeded by the problem's true count + a salt, returning clustered points
 * (NOT a tidy grid) so the field is genuinely estimate-only, not countable.
 */
function scatterPositions(n: number, seed: number): Array<[number, number]> {
  let s = (seed * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = (): number => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  // A few cluster centers so berries clump (harder to count → must estimate).
  const clusters = 3 + (n % 3);
  const centers: Array<[number, number]> = [];
  for (let c = 0; c < clusters; c++) {
    centers.push([
      SCATTER_MIN_X + rnd() * (SCATTER_MAX_X - SCATTER_MIN_X),
      SCATTER_MIN_Y + rnd() * (SCATTER_MAX_Y - SCATTER_MIN_Y),
    ]);
  }
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const [cx, cy] = centers[i % centers.length];
    // Gaussian-ish jitter around the cluster center (sum of two uniforms).
    const jx = (rnd() + rnd() - 1) * 1.7;
    const jy = (rnd() + rnd() - 1) * 1.45;
    const x = Math.max(SCATTER_MIN_X, Math.min(SCATTER_MAX_X, cx + jx));
    const y = Math.max(SCATTER_MIN_Y, Math.min(SCATTER_MAX_Y, cy + jy));
    pts.push([x, y]);
  }
  return pts;
}

export const estimationLandGame: Game3D = {
  meta: {
    id: 'estimation-land',
    i18nKey: 'games3d.estimationLand',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera sized to fit the field's WIDTH (~13) with margin:
    // a wide scene is width-bound, so distance ≈ halfWidth / (tan(fov/2)*aspect).
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 13.5), new THREE.Vector3(0, 0, 0));

    // Sunny clay ambience. No ground plane (front-facing scene; the field panel is
    // the surface) so the horizontal clay plane never occludes the content.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cdeeff',
      bottomColor: '#eaf7d6',
      ground: false,
      shadowArea: 11,
      fog: false,
    });

    const generator = createEstimationGenerator();
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

    // ---- Shared, reused resources (ONE geometry + a few mats reused for ALL N berries) ----
    const berryGeo = new THREE.SphereGeometry(BERRY_RADIUS, 16, 12);
    const fieldBerryMats = FIELD_BERRY_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05 })
    );
    const refBerryMat = new THREE.MeshStandardMaterial({
      color: REF_BERRY_COLOR,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Field backdrop panel (the grass), explicit static scale (NOT popIn → always visible).
    const fieldGeo = roundedBox(FIELD_W, FIELD_H, 0.4, 0.5, 4);
    const fieldMat = new THREE.MeshStandardMaterial({ color: FIELD_COLOR, roughness: 0.9, metalness: 0.02 });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.set(0, 0, FIELD_Z);
    field.receiveShadow = true;
    field.scale.setScalar(1);
    ctx.scene.add(field);

    // Reference plot panel (frames the ten), explicit static scale.
    const refPlotW = (REF_COLS - 1) * REF_CELL + REF_PAD * 2;
    const refPlotH = (REF_ROWS - 1) * REF_CELL + REF_PAD * 2;
    const refPlotGeo = roundedBox(refPlotW, refPlotH, 0.3, 0.3, 4);
    const refPlotMat = new THREE.MeshStandardMaterial({ color: REF_PLOT_COLOR, roughness: 0.9, metalness: 0.02 });
    const refPlot = new THREE.Mesh(refPlotGeo, refPlotMat);
    refPlot.position.set(REF_CENTER_X, REF_CENTER_Y, FIELD_Z + 0.15);
    refPlot.receiveShadow = true;
    refPlot.scale.setScalar(1);
    ctx.scene.add(refPlot);

    // "10" label above the reference plot (dark-on-light decal → strong contrast).
    const labelTex = makeLabelTexture(String(REFERENCE_COUNT), '#f4f0e2', '#241a33');
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const labelGeo = new THREE.PlaneGeometry(1.5, 0.8);
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(REF_CENTER_X, REF_CENTER_Y + refPlotH / 2 + 0.7, FIELD_Z + 0.4);
    label.scale.setScalar(1);
    ctx.scene.add(label);

    // Guess readout board (dark slate + a live digit decal) — the in-scene display
    // of the DIALED estimate (success is never shown here; only the entered value).
    const boardGeo = roundedBox(BOARD_W, BOARD_H, 0.3, 0.25, 4);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.7, metalness: 0.05 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, BOARD_Y, BOARD_Z);
    board.castShadow = true;
    board.scale.setScalar(1);
    ctx.scene.add(board);
    // Digit decal sits on the slate; its texture is regenerated (and the old one
    // disposed) whenever the guess changes — only ONE texture is alive at a time.
    let digitTex: THREE.CanvasTexture = makeLabelTexture('0', '#241a33', '#fdf3c2');
    const digitMat = new THREE.MeshBasicMaterial({ map: digitTex, transparent: true });
    const digitGeo = new THREE.PlaneGeometry(BOARD_W * 0.82, BOARD_H * 0.72);
    const digit = new THREE.Mesh(digitGeo, digitMat);
    digit.position.set(0, BOARD_Y, BOARD_Z + 0.18);
    digit.scale.setScalar(1);
    ctx.scene.add(digit);

    // Groups for the rebuilt berry sets (cleared/repopulated per problem & on resize).
    const fieldBerryGroup = new THREE.Group();
    const refBerryGroup = new THREE.Group();
    ctx.scene.add(fieldBerryGroup);
    ctx.scene.add(refBerryGroup);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as EstimationProblem,
      guess: 0, // estimate starts at 0 (< n − tol always, since n ≥ 20 → never opens solved)
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — asks the question, never reveals the count or correctness.
      ctx.prompt.set(ctx.t('estimationLand.prompt'));
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

    /** Redraw the dialed-estimate digits on the slate (dispose the old texture). */
    function updateDigit(): void {
      const old = digitTex;
      digitTex = makeLabelTexture(String(state.guess), '#241a33', '#fdf3c2');
      digitMat.map = digitTex;
      digitMat.needsUpdate = true;
      old.dispose();
    }

    /** Scatter the field berries for the current problem (shared geo/mats, no popIn snap risk). */
    function buildFieldBerries(): void {
      fieldBerryGroup.clear();
      const positions = scatterPositions(state.problem.n, state.problem.n * 7 + 11);
      positions.forEach(([x, y], i) => {
        const berry = new THREE.Mesh(berryGeo, fieldBerryMats[i % fieldBerryMats.length]);
        berry.position.set(x, y, BERRY_Z);
        berry.castShadow = true;
        fieldBerryGroup.add(berry);
      });
    }

    /** The reference patch: exactly ten berries in a tidy 5×2 grid (the scale guide). */
    function buildReferenceBerries(): void {
      refBerryGroup.clear();
      for (let r = 0; r < REF_ROWS; r++) {
        for (let c = 0; c < REF_COLS; c++) {
          const x = REF_CENTER_X + (c - (REF_COLS - 1) / 2) * REF_CELL;
          const y = REF_CENTER_Y + (r - (REF_ROWS - 1) / 2) * REF_CELL;
          const berry = new THREE.Mesh(berryGeo, refBerryMat);
          berry.position.set(x, y, BERRY_Z);
          berry.castShadow = true;
          refBerryGroup.add(berry);
        }
      }
    }

    function setControls(): void {
      const valueLabel = ctx.t('controls.value');
      const buttons: ControlButton[] = [
        { id: 'value-dec', label: `${valueLabel} −`, onPress: () => stepGuess(-1) },
        { id: 'value-inc', label: `${valueLabel} +`, onPress: () => stepGuess(1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetGuess },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Adjust the dialed estimate, clamped 0..MAX_GUESS, refresh the slate. */
    function stepGuess(delta: number): void {
      const next = Math.max(0, Math.min(MAX_GUESS, state.guess + delta));
      if (next !== state.guess) {
        state.guess = next;
        updateDigit();
      }
    }

    /** Set the dialed estimate to an absolute value (drag path), clamped + refresh. */
    function setGuess(next: number): void {
      const clamped = Math.max(0, Math.min(MAX_GUESS, Math.round(next)));
      if (clamped !== state.guess) {
        state.guess = clamped;
        updateDigit();
      }
    }

    /** Reset the estimate to 0 (never the solved value — 0 < n − tol always). */
    function resetGuess(): void {
      if (state.guess !== 0) {
        state.guess = 0;
        updateDigit();
      }
    }

    function startNewProblem(): void {
      resetGuess();
      buildFieldBerries();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('estimationLand.correct', { n: state.problem.n }));
      // Punch the whole field group (uniform scale → safe for punch).
      track(punch(fieldBerryGroup, 0.12));
      celebrate();
    }

    /** Wrong → gentle shake + a DIRECTIONAL hint so the child can converge. */
    function onWrong(): void {
      ctx.audio.play('fail');
      const hint =
        state.guess > state.problem.n + state.problem.tolerance
          ? ctx.t('estimationLand.tooHigh')
          : ctx.t('estimationLand.tooLow');
      ctx.feedback.wrong(hint);
      track(shake(fieldBerryGroup, 0.06, 280));
    }

    function confirm(): void {
      const answer = state.guess;
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

      // Practice: correct → score + next problem; wrong → KEEP the estimate so the
      // child can nudge it toward the band (no fail-out).
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

    // Drag = fast estimate. Map the pointer up/right toward MAX_GUESS (NATURAL §9:
    // right and up = more, no inversion). We use the combined right+up travel from
    // the field's bottom-left so a child can sweep up-and-right to raise the guess.
    const offDrag = ctx.input.on('drag', (p) => {
      // NDC −1..1 → 0..1 for each axis, average so both directions raise the value.
      const tx = (p.x + 1) / 2; // left→right
      const ty = (p.y + 1) / 2; // down→up
      const t = Math.max(0, Math.min(1, (tx + ty) / 2));
      setGuess(t * MAX_GUESS);
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: build both berry sets, controls, prompt, status. Static props
    // (field, ref plot, label, board, digit) have explicit scale 1 — NOT popIn —
    // because no stopAllTweens() runs mid-init here, but keeping them static is the
    // safe pattern (§13c) so the scene can never freeze near-zero.
    buildReferenceBerries();
    buildFieldBerries();
    updateDigit();
    setControls();
    showPrompt();
    showStatus();
    // The newly-planted field can pop in once for life (uniform group scale → safe).
    track(popIn(fieldBerryGroup, { scale: 1 }));
    track(popIn(refBerryGroup, { scale: 1 }));

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

        fieldBerryGroup.clear();
        refBerryGroup.clear();
        ctx.scene.remove(fieldBerryGroup);
        ctx.scene.remove(refBerryGroup);
        ctx.scene.remove(field);
        ctx.scene.remove(refPlot);
        ctx.scene.remove(label);
        ctx.scene.remove(board);
        ctx.scene.remove(digit);

        berryGeo.dispose();
        fieldBerryMats.forEach((m) => m.dispose());
        refBerryMat.dispose();
        fieldGeo.dispose();
        fieldMat.dispose();
        refPlotGeo.dispose();
        refPlotMat.dispose();
        labelGeo.dispose();
        labelMat.dispose();
        labelTex.dispose();
        boardGeo.dispose();
        boardMat.dispose();
        digitGeo.dispose();
        digitMat.dispose();
        digitTex.dispose();
      },
    };
  },
};

/**
 * A crisp dark-on-light (or light-on-dark) glyph on a transparent canvas, used for
 * the "10" reference label and the live guess digits. Created once per value and
 * disposed by the caller — kept legible against the clay/slate backgrounds (§12).
 */
function makeLabelTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, w, h);
    // Rounded pill background so the glyph never floats as bare light-on-light.
    g.fillStyle = bg;
    const r = 28;
    g.beginPath();
    g.moveTo(r, 6);
    g.lineTo(w - r, 6);
    g.quadraticCurveTo(w - 6, 6, w - 6, r);
    g.lineTo(w - 6, h - r);
    g.quadraticCurveTo(w - 6, h - 6, w - r, h - 6);
    g.lineTo(r, h - 6);
    g.quadraticCurveTo(6, h - 6, 6, h - r);
    g.lineTo(6, r);
    g.quadraticCurveTo(6, 6, r, 6);
    g.closePath();
    g.fill();
    g.fillStyle = fg;
    g.font = 'bold 84px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
