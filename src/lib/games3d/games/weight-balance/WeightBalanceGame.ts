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
} from '@/lib/games3d/kit';
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween group
// — used here to animate the beam pivot's rotation.z (popIn/punch/shake only touch
// scale/position), exactly like balance-scale-equations / algebra-balance.
import { tweenTo } from '@/lib/games3d/kit/juice';
import {
  createWeightBalanceGenerator,
  weightsTotal,
  emptyWeights,
  DENOMINATIONS,
  type Denomination,
  type FruitKind,
  type WeightCounts,
  type WeightBalanceProblem,
  type WeightBalanceAnswer,
} from './problems';

// Theme: a MARKET STALL with a brass two-pan WEIGHING balance on a wooden counter.
// The LEFT pan holds a procedural FRUIT (a colored ellipsoid + stem; watermelon /
// apple / pumpkin / melon) whose mass = the target T grams (given in the prompt —
// you can't derive it otherwise). The RIGHT pan is BUILT by the child from brass
// gram weights of denominations {1, 10, 100} via per-denomination −/+; each brass
// disc is stamped with its gram value via a CanvasTexture on its top face.
//
// The BEAM TILTS by (rightTotal − T): the heavier side dips, LEVEL when equal. The
// tilt shows the LIVE state, NOT a verdict — the celebratory success fires ONLY on
// Check. Right pan starts EMPTY (0 ≠ T) so it never opens already solved.
//
// TILT CONVENTION: diff = rightTotal − T. Right heavier (diff > 0) ⇒ right end DIPS
// ⇒ CLOCKWISE ⇒ negative Z rotation, so beamPivot.rotation.z = −tilt. Pans hang from
// the beam ends and are counter-rotated to stay visually level so items don't slide.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 22;
const MAX_PER_DENOM = 30; // plenty: a right pan up to 900 g fits (e.g. 9×100)

// ---- Procedural geometry layout (XY plane, facing a front camera at z≈0) ----
const BEAM_HALF_SPAN = 3.5; // fulcrum center → each pan hang-point
const BEAM_LENGTH = BEAM_HALF_SPAN * 2 + 0.6;
const BEAM_THICKNESS = 0.34;
const BEAM_DEPTH = 0.5;
const BEAM_Y = 3.1; // beam pivot height above the counter

const FULCRUM_WIDTH = 0.72;
const FULCRUM_DEPTH = 0.72;
const FULCRUM_HEIGHT = BEAM_Y;
const FULCRUM_Y = FULCRUM_HEIGHT / 2;

const HANGER_LENGTH = 1.2;
const HANGER_WIDTH = 0.08;
const PAN_RADIUS = 1.7;
const PAN_THICKNESS = 0.2;

// Brass gram-weight discs (cylinders). The top face carries a CanvasTexture digit.
// Size grows with the denomination so 1/10/100 read apart at a glance.
const WEIGHT_SPECS: Record<Denomination, { radius: number; height: number }> = {
  1: { radius: 0.3, height: 0.18 },
  10: { radius: 0.42, height: 0.24 },
  100: { radius: 0.56, height: 0.3 },
};
const WEIGHT_GAP = 0.78; // x-pitch when laying discs in a row on a pan
const MAX_PER_ROW = 5; // wrap into rows so big right counts fit on the pan
const ROW_PITCH = 0.78;

// Tilt animation.
const TILT_PER_GRAM = 0.0009; // radians of beam tilt per gram of difference
const MAX_TILT = 0.32; // clamp so the beam never flips absurdly
const TILT_TWEEN_MS = 440;

// Brass market palette. Warm brass for the structure; bright polished brass discs
// for the player weights. Digits are dark-on-cream for high contrast on the brass.
const BEAM_COLOR = 0xb08d3c;
const FULCRUM_COLOR = 0x8a6d28;
const PAN_COLOR = 0xc8a44e;
const HANGER_COLOR = 0x9a7a2e;
const WEIGHT_COLOR = 0xd9b65a; // polished brass discs
const COUNTER_COLOR = 0x6b4a26; // market-wood counter
const DIGIT_FG = '#241a05'; // dark espresso digits
const DIGIT_PATCH = '#f4ead0'; // light cream patch behind the digit → contrast on brass

// Procedural fruit appearance per kind: body color, vertical squash (1 = sphere),
// and a stem/leaf color. All saturated so the fruit reads on the light clay.
interface FruitSpec {
  body: number;
  squashY: number; // y-scale of the body ellipsoid relative to radius
  stem: number;
}
const FRUIT_SPECS: Record<FruitKind, FruitSpec> = {
  watermelon: { body: 0x2e8b3d, squashY: 0.82, stem: 0x6b4a26 },
  apple: { body: 0xc62828, squashY: 0.92, stem: 0x6b4a26 },
  pumpkin: { body: 0xd8772a, squashY: 0.7, stem: 0x4e7a2e },
  melon: { body: 0xc9b85a, squashY: 0.9, stem: 0x4e7a2e },
};
const FRUIT_RADIUS = 0.95;

/**
 * Render a gram value as a CanvasTexture for a disc's top face: a dark digit on a
 * light cream rounded patch (so it reads under scene lighting) over a transparent
 * background. Cached per number and disposed in dispose() — CanvasTextures are NOT
 * GC'd by three otherwise (def. 14).
 */
function makeDigitTexture(n: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    // Light cream rounded patch → high contrast for the digit.
    const inset = 12;
    const r = 24;
    const x0 = inset;
    const y0 = inset;
    const w = size - inset * 2;
    const h = size - inset * 2;
    g.beginPath();
    g.moveTo(x0 + r, y0);
    g.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    g.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    g.arcTo(x0, y0 + h, x0, y0, r);
    g.arcTo(x0, y0, x0 + w, y0, r);
    g.closePath();
    g.fillStyle = DIGIT_PATCH;
    g.fill();

    g.fillStyle = DIGIT_FG;
    const fontSize = n >= 100 ? 50 : n >= 10 ? 62 : 76;
    g.font = `bold ${fontSize}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const weightBalanceGame: Game3D = {
  meta: {
    id: 'weight-balance',
    i18nKey: 'games3d.weightBalance',
    topic: 'units',
    difficulty: 2,
    gradeRange: [2, 3],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera: "up" on screen is +Y so the tilt reads naturally
    // and drag-x → world-x stays monotonic. Distance sized to FILL the viewport with
    // the full scale (≈8.6 wide incl. pans, ≈5 tall from pans to beam top).
    ctx.presets.camera.locked(
      new THREE.Vector3(0, BEAM_Y * 0.42, 13.5),
      new THREE.Vector3(0, BEAM_Y * 0.42, 0)
    );

    // Warm market ambience. The scale stands on a counter modeled below, so the clay
    // ground plane (y≈0) would occlude the pans → disable it (def. 12b).
    const clayLook = applyClayLook(ctx, {
      topColor: '#f2e4c6',
      bottomColor: '#e3cb9a',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createWeightBalanceGenerator();
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

    // ---- Digit texture / top-material cache (lazy, one per gram value, disposed) ----
    const digitTextures = new Map<number, THREE.CanvasTexture>();
    const digitTopMats = new Map<number, THREE.MeshStandardMaterial>();
    function digitTexture(n: number): THREE.CanvasTexture {
      let tex = digitTextures.get(n);
      if (!tex) {
        tex = makeDigitTexture(n);
        digitTextures.set(n, tex);
      }
      return tex;
    }
    /** Top-face material for a disc: brass + the stamped gram digit (cached per value). */
    function topMat(n: number): THREE.MeshStandardMaterial {
      let mat = digitTopMats.get(n);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color: WEIGHT_COLOR,
          roughness: 0.35,
          metalness: 0.7,
          map: digitTexture(n),
        });
        digitTopMats.set(n, mat);
      }
      return mat;
    }

    // ---- Shared, reused resources (ONE geometry/material per kind) ----
    // CylinderGeometry exposes 3 material groups in the order [0:side, 1:top(+y),
    // 2:bottom(−y)], so a material ARRAY takes effect per face — we stamp the digit
    // on the TOP face (index 1) facing the slightly-downward camera. The side reuses
    // ONE shared brass side material across all discs of all sizes.
    const weightSideMat = new THREE.MeshStandardMaterial({ color: WEIGHT_COLOR, roughness: 0.4, metalness: 0.65 });
    const weightGeo: Record<Denomination, THREE.CylinderGeometry> = {} as Record<Denomination, THREE.CylinderGeometry>;
    for (const d of DENOMINATIONS) {
      const s = WEIGHT_SPECS[d];
      weightGeo[d] = new THREE.CylinderGeometry(s.radius, s.radius, s.height, 28);
    }

    const beamGeo = roundedBox(BEAM_LENGTH, BEAM_THICKNESS, BEAM_DEPTH, 0.1, 3);
    const beamMat = new THREE.MeshStandardMaterial({ color: BEAM_COLOR, roughness: 0.4, metalness: 0.7 });
    const fulcrumGeo = roundedBox(FULCRUM_WIDTH, FULCRUM_HEIGHT, FULCRUM_DEPTH, 0.12, 3);
    const fulcrumMat = new THREE.MeshStandardMaterial({ color: FULCRUM_COLOR, roughness: 0.5, metalness: 0.6 });
    const hangerGeo = roundedBox(HANGER_WIDTH, HANGER_LENGTH, HANGER_WIDTH, 0.03, 2);
    const hangerMat = new THREE.MeshStandardMaterial({ color: HANGER_COLOR, roughness: 0.5, metalness: 0.6 });
    const panGeo = new THREE.CylinderGeometry(PAN_RADIUS, PAN_RADIUS * 0.8, PAN_THICKNESS, 30);
    const panMat = new THREE.MeshStandardMaterial({ color: PAN_COLOR, roughness: 0.4, metalness: 0.6 });
    const counterGeo = roundedBox(11, 0.5, 3.2, 0.2, 3);
    const counterMat = new THREE.MeshStandardMaterial({ color: COUNTER_COLOR, roughness: 0.9, metalness: 0.04 });

    // Fruit body (a unit sphere reused for every fruit, squashed per kind via scale)
    // + a small stem cylinder. One geo + one mat each; the mat color is set per kind.
    const fruitBodyGeo = new THREE.SphereGeometry(FRUIT_RADIUS, 28, 20);
    const fruitBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.04 });
    const fruitStemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.45, 12);
    const fruitStemMat = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.8, metalness: 0.02 });

    // ---- Assemble the static structure ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, -0.25, 0);
    counter.receiveShadow = true;
    counter.castShadow = true;
    root.add(counter);

    const fulcrum = new THREE.Mesh(fulcrumGeo, fulcrumMat);
    fulcrum.position.set(0, FULCRUM_Y, 0);
    fulcrum.castShadow = true;
    fulcrum.receiveShadow = true;
    root.add(fulcrum);

    // Beam pivots about Z at the fulcrum top — the signature tilt motion.
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, BEAM_Y, 0);
    root.add(beamPivot);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.castShadow = true;
    beamPivot.add(beam);

    interface SideView {
      pan: THREE.Group; // counter-rotated to stay visually level
      content: THREE.Group; // fruit (left) or weight discs (right)
    }
    function makeSide(sign: number): SideView {
      const hangPoint = new THREE.Group();
      hangPoint.position.set(sign * BEAM_HALF_SPAN, -BEAM_THICKNESS / 2, 0);
      beamPivot.add(hangPoint);

      const hanger = new THREE.Mesh(hangerGeo, hangerMat);
      hanger.position.set(0, -HANGER_LENGTH / 2, 0);
      hanger.castShadow = true;
      hangPoint.add(hanger);

      const pan = new THREE.Group();
      pan.position.set(0, -HANGER_LENGTH, 0);
      hangPoint.add(pan);

      const dish = new THREE.Mesh(panGeo, panMat);
      dish.castShadow = true;
      dish.receiveShadow = true;
      pan.add(dish);

      const content = new THREE.Group();
      pan.add(content);
      return { pan, content };
    }
    const left = makeSide(-1);
    const right = makeSide(1);

    const first = (quiz ? quiz.state().current : generator.next()) as WeightBalanceProblem;
    const state = {
      problem: first,
      counts: emptyWeights() as WeightCounts, // right pan starts EMPTY
      streak: 0,
      answered: 0,
    };

    function rightTotal(): number {
      return weightsTotal(state.counts);
    }

    /** Build the procedural FRUIT on the LEFT pan for the current problem. */
    function rebuildFruit(animate: boolean): void {
      left.content.clear();
      const spec = FRUIT_SPECS[state.problem.fruit];
      const fruit = new THREE.Group();

      // Only ONE fruit is ever on the left pan, so we recolor the SHARED body/stem
      // materials in place (no per-fruit material allocation → nothing to leak).
      fruitBodyMat.color.setHex(spec.body);
      fruitStemMat.color.setHex(spec.stem);

      const body = new THREE.Mesh(fruitBodyGeo, fruitBodyMat);
      body.scale.set(1, spec.squashY, 1);
      body.position.y = PAN_THICKNESS / 2 + FRUIT_RADIUS * spec.squashY;
      body.castShadow = true;
      body.receiveShadow = true;
      fruit.add(body);

      const stem = new THREE.Mesh(fruitStemGeo, fruitStemMat);
      stem.position.y = body.position.y + FRUIT_RADIUS * spec.squashY + 0.12;
      stem.rotation.z = 0.18;
      stem.castShadow = true;
      fruit.add(stem);

      left.content.add(fruit);
      if (animate) track(popIn(fruit, { scale: 1 }));
    }

    // ---- Weight disc layout on the right pan (centered rows of MAX_PER_ROW) ----
    function layoutPosition(index: number, total: number): { x: number; y: number } {
      const row = Math.floor(index / MAX_PER_ROW);
      const col = index % MAX_PER_ROW;
      const inThisRow = Math.min(MAX_PER_ROW, total - row * MAX_PER_ROW);
      const rowWidth = (inThisRow - 1) * WEIGHT_GAP;
      const x = col * WEIGHT_GAP - rowWidth / 2;
      const y = row * ROW_PITCH;
      return { x, y };
    }

    /**
     * Rebuild the RIGHT pan to match the current per-denomination counts. Discs are
     * laid out largest→smallest so the pile reads. Items at index ≥ prevCount pop in.
     * Every disc reuses the shared per-size geo + shared brass side material + a
     * cached per-value top material — never allocate-and-forget per weight.
     */
    function rebuildRight(prevCount: number, animate: boolean): void {
      right.content.clear();
      const values: Denomination[] = [];
      for (const d of [...DENOMINATIONS].reverse()) {
        for (let i = 0; i < state.counts[d]; i++) values.push(d);
      }
      const total = values.length;
      let newOrdinal = 0;
      values.forEach((value, i) => {
        const pos = layoutPosition(i, total);
        const spec = WEIGHT_SPECS[value];
        //            side             top(+y)          bottom(−y)
        const faces = [weightSideMat, topMat(value), weightSideMat];
        const disc = new THREE.Mesh(weightGeo[value], faces);
        disc.position.set(pos.x, PAN_THICKNESS / 2 + spec.height / 2 + pos.y, 0);
        disc.castShadow = true;
        disc.receiveShadow = true;
        if (animate && i >= prevCount) {
          track(popIn(disc, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        right.content.add(disc);
      });
    }

    function totalCount(counts: WeightCounts): number {
      return DENOMINATIONS.reduce((sum, d) => sum + counts[d], 0);
    }

    // ---- Beam tilt: diff = rightTotal − T grams; right heavier ⇒ right dips ----
    function renderTilt(animate: boolean): void {
      const diff = rightTotal() - state.problem.target;
      const target = THREE.MathUtils.clamp(diff * TILT_PER_GRAM, -MAX_TILT, MAX_TILT);
      const beamTarget = -target; // right-heavier (diff>0) ⇒ clockwise ⇒ negative Z

      const applyLevelPans = () => {
        left.pan.rotation.z = -beamPivot.rotation.z;
        right.pan.rotation.z = -beamPivot.rotation.z;
      };
      if (!animate || ctx.prefersReducedMotion) {
        beamPivot.rotation.z = beamTarget;
        applyLevelPans();
        return;
      }
      const from = beamPivot.rotation.z;
      const t = tweenTo(from, beamTarget, TILT_TWEEN_MS, (v) => {
        beamPivot.rotation.z = v;
        applyLevelPans();
      });
      track(t);
    }

    function showPrompt(): void {
      // TASK ONLY — the fruit's known weight (you can't derive it). Never echoes the
      // live right total; the discs + the beam tilt show the state.
      ctx.prompt.set(ctx.t('weightBalance.prompt', { weight: state.problem.target }));
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

    /** Add `delta` weights of a denomination to the RIGHT pan; clamps to [0, cap]. */
    function changeDenom(denom: Denomination, delta: number): void {
      const prevTotal = totalCount(state.counts);
      const next = state.counts[denom] + delta;
      if (next < 0 || next > MAX_PER_DENOM) return;
      state.counts = { ...state.counts, [denom]: next };
      rebuildRight(prevTotal, true);
      renderTilt(true);
    }

    function resetRight(): void {
      state.counts = emptyWeights();
      rebuildRight(0, false);
      renderTilt(true);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [];
      for (const denom of DENOMINATIONS) {
        // Label literally with the gram value (digits read across all locales), like
        // money-shop / balance-scale-equations.
        buttons.push({ id: `d${denom}-dec`, label: `${denom} −`, onPress: () => changeDenom(denom, -1) });
        buttons.push({ id: `d${denom}-inc`, label: `${denom} +`, onPress: () => changeDenom(denom, 1) });
      }
      buttons.push({ id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetRight });
      buttons.push({ id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm });
      ctx.controls.set(buttons);
    }

    /** Load a fresh problem: rebuild the fruit, empty the right pan, reset prompt/status. */
    function startNewProblem(): void {
      state.counts = emptyWeights();
      rebuildFruit(true);
      rebuildRight(0, false);
      renderTilt(true);
      showPrompt();
      showStatus();
    }

    function buildAnswer(): WeightBalanceAnswer {
      return { counts: { ...state.counts }, total: rightTotal() };
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      // Reveal the matched value only AFTER Check (the success toast).
      ctx.feedback.correct(ctx.t('weightBalance.correct', { weight: state.problem.target }));
      track(punch(left.content, 0.16));
      track(punch(right.content, 0.16));
      track(punch(beamPivot, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('weightBalance.wrong'));
      track(shake(root, 0.05, 280));
    }

    function confirm(): void {
      const answer = buildAnswer();
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
        state.problem = qs.current as WeightBalanceProblem;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next; wrong → KEEP the right pan so the child fixes it.
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

    // Drag = fast build: dragging UP adds a +10 g weight, down removes one (natural:
    // up = more, never inverted). Precise control + other denoms are the −/+ buttons.
    // dragEnd is a SECONDARY submit path; the Check button is primary.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changeDenom(10, 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changeDenom(10, -1);
        lastDragY = p.y;
      }
    });
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial build.
    track(popIn(beamPivot, { scale: 1 }));
    startNewProblem();
    setControls();

    return {
      onResize() {},
      dispose() {
        offDragStart();
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        // Detach every object added to the scene.
        left.content.clear();
        right.content.clear();
        beamPivot.clear();
        root.clear();
        ctx.scene.remove(root);

        // Dispose every geometry + material created (one per kind, shared).
        for (const d of DENOMINATIONS) weightGeo[d].dispose();
        weightSideMat.dispose();
        beamGeo.dispose();
        beamMat.dispose();
        fulcrumGeo.dispose();
        fulcrumMat.dispose();
        hangerGeo.dispose();
        hangerMat.dispose();
        panGeo.dispose();
        panMat.dispose();
        counterGeo.dispose();
        counterMat.dispose();
        fruitBodyGeo.dispose();
        fruitBodyMat.dispose();
        fruitStemGeo.dispose();
        fruitStemMat.dispose();

        // Dispose every cached digit material AND CanvasTexture (mandatory).
        digitTopMats.forEach((m) => m.dispose());
        digitTopMats.clear();
        digitTextures.forEach((t) => t.dispose());
        digitTextures.clear();
      },
    };
  },
};
