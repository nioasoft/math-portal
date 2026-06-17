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
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — adapted here to animate the beam pivot's `rotation.z` (the kit's
// popIn/punch/shake only touch scale/position), exactly like algebra-balance.
import { tweenTo } from '@/lib/games3d/kit/juice';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createBalanceScaleGenerator,
  countsTotal,
  emptyCounts,
  DENOMINATIONS,
  type Denomination,
  type BalanceScaleProblem,
  type BalanceScaleAnswer,
} from './problems';

// Theme: מאזניים מפליז בחנות שיקויים — a BRASS beam balance in a potion shop.
// A horizontal BEAM pivots on a brass FULCRUM column; a brass PAN hangs from each
// end. The LEFT pan holds 1–3 GIVEN numbered weight-cubes (each brass cube shows
// its value on its top face via a runtime CanvasTexture) summing to the target L.
// The RIGHT pan is BUILT by the child from numbered weights {1,2,5,10} via per-
// denomination −/+. The right total must MATCH L (make both sides equal).
//
// The BEAM TILTS by (rightTotal − leftTotal): the heavier side dips, LEVEL when
// equal. The tilt shows the LIVE state, not a verdict — the celebratory potion-
// shop success (glow + confetti) fires ONLY on Check. This is DISTINCT from
// algebra-balance, where the scale starts balanced and the child REMOVES equal
// amounts to isolate an unknown; HERE the left is fixed+read and the right is
// matched from an EMPTY start (teaching the meaning of "=" + equivalence).
//
// TILT CONVENTION: diff = rightTotal − leftTotal. Right heavier (diff > 0) ⇒ right
// end DIPS ⇒ CLOCKWISE ⇒ negative Z rotation. So beamPivot.rotation.z = −tilt.
// Pans hang from the beam ends and are counter-rotated to stay visually level so
// the cubes don't slide.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 26;
const MAX_PER_DENOM = 30; // a right pan up to L=30 fits comfortably

// ---- Procedural geometry layout (XY plane, facing a front camera at z≈0) ----
const BEAM_HALF_SPAN = 3.5; // fulcrum center → each pan hang-point
const BEAM_LENGTH = BEAM_HALF_SPAN * 2 + 0.6;
const BEAM_THICKNESS = 0.34;
const BEAM_DEPTH = 0.5;
const BEAM_Y = 3.1; // beam pivot height above the shop counter

const FULCRUM_WIDTH = 0.72;
const FULCRUM_DEPTH = 0.72;
const FULCRUM_HEIGHT = BEAM_Y;
const FULCRUM_Y = FULCRUM_HEIGHT / 2;

const HANGER_LENGTH = 1.2;
const HANGER_WIDTH = 0.08;
const PAN_RADIUS = 1.7;
const PAN_THICKNESS = 0.2;

// Numbered weight-cubes (brass). Top face carries a CanvasTexture digit.
const CUBE_SIZE = 0.62;
const CUBE_GAP = 0.74; // x-pitch when laid in a row on a pan
const CUBE_Y = PAN_THICKNESS / 2 + CUBE_SIZE / 2 + 0.02; // rest height above a pan
const MAX_CUBES_PER_ROW = 5; // wrap into rows so big right counts fit on a pan
const ROW_PITCH = CUBE_SIZE * 1.18;

// Tilt animation.
const TILT_PER_UNIT = 0.022; // radians of beam tilt per unit of weight difference
const MAX_TILT = 0.32; // clamp so the beam never flips absurdly
const TILT_TWEEN_MS = 440;

// Brass potion-shop palette. Warm brass metals for the structure; the LEFT cubes a
// slightly darker antique brass, the RIGHT (player) cubes a brighter polished brass
// so the two sides read as distinct. Digits are dark-on-brass for contrast.
const BEAM_COLOR = 0xb08d3c; // brass beam
const FULCRUM_COLOR = 0x8a6d28; // darker antique-brass column
const PAN_COLOR = 0xc8a44e; // lighter brass pan (cubes read on top)
const HANGER_COLOR = 0x9a7a2e;
const LEFT_CUBE_COLOR = 0x9c7b34; // antique brass given-weights
const RIGHT_CUBE_COLOR = 0xd9b65a; // polished brass player-weights
const DIGIT_FG = '#241a05'; // dark espresso digits
const DIGIT_PATCH = '#f4ead0'; // light cream patch behind the digit → high contrast on brass

/**
 * Render a number as a CanvasTexture for a cube face: a dark espresso digit on a
 * light cream rounded patch (so it reads clearly against the brass under scene
 * lighting) over a transparent background (the brass cube shows around the patch).
 * Created lazily, cached per number, and disposed in dispose(). Disposing every
 * CanvasTexture is mandatory (def. 14) — they are not GC'd by three otherwise.
 */
function makeDigitTexture(n: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size); // transparent corners; brass shows around the patch

    // Light cream rounded patch centered on the face → high contrast for the digit.
    const inset = 14;
    const r = 26;
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
    g.font = `bold ${n >= 10 ? 64 : 80}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const balanceScaleEquationsGame: Game3D = {
  meta: {
    id: 'balance-scale-equations',
    i18nKey: 'games3d.balanceScale',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera: "up" on screen is +Y so the tilt reads naturally
    // and drag-x → world-x stays monotonic. Distance sized to FILL the viewport
    // with the full scale (≈8.6 wide incl. pans, ≈5 tall from pans to beam top).
    const lookY = BEAM_Y * 0.45;
    function reframe(): void {
      const f = lockedCameraFrame(4.3, lookY, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Warm potion-shop ambience. The scale stands on a counter modeled below, so
    // the clay ground plane (y≈0) would occlude the pans → disable it (def. 12b).
    const clayLook = applyClayLook(ctx, {
      topColor: '#3a2a1a',
      bottomColor: '#5a4326',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createBalanceScaleGenerator();
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

    // ---- Digit texture/material cache (lazy, one per number, disposed on dispose) ----
    // The faces material list reuses ONE shared brass side-material per cube color +
    // a per-number top material carrying the cached digit texture.
    const digitTextures = new Map<number, THREE.CanvasTexture>();
    const digitTopMats = new Map<string, THREE.MeshStandardMaterial>(); // key `${color}:${n}`

    function digitTexture(n: number): THREE.CanvasTexture {
      let tex = digitTextures.get(n);
      if (!tex) {
        tex = makeDigitTexture(n);
        digitTextures.set(n, tex);
      }
      return tex;
    }

    // ---- Shared, reused resources (ONE geometry/material per kind) ----
    // Plain BoxGeometry (NOT roundedBox): it exposes 6 per-face material groups in
    // the order [+x, −x, +y(top), −y, +z(FRONT), −z], so a material ARRAY actually
    // takes effect per face. RoundedBoxGeometry has a SINGLE group (materialIndex 0),
    // which silently ignores the array → the digit material never renders. Losing the
    // rounded silhouette on these small cubes is an acceptable trade for a legible
    // camera-facing number.
    const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    // Plain brass side material (shared by all non-top faces of every cube).
    const leftSideMat = new THREE.MeshStandardMaterial({ color: LEFT_CUBE_COLOR, roughness: 0.4, metalness: 0.65 });
    const rightSideMat = new THREE.MeshStandardMaterial({ color: RIGHT_CUBE_COLOR, roughness: 0.35, metalness: 0.7 });

    /** Material for a cube's digit faces (FRONT +z idx 4 + TOP +y idx 2): brass + digit. */
    function topMat(color: number, n: number): THREE.MeshStandardMaterial {
      const key = `${color}:${n}`;
      let mat = digitTopMats.get(key);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color,
          roughness: color === LEFT_CUBE_COLOR ? 0.4 : 0.35,
          metalness: 0.6,
          map: digitTexture(n),
        });
        digitTopMats.set(key, mat);
      }
      return mat;
    }

    /**
     * Build a numbered brass cube. BoxGeometry has 6 material groups in the order
     * [+x, −x, +y(top), −y, +z(FRONT), −z]. We put the digit material on the FRONT
     * (+z, index 4) — the camera sits on +z looking toward −z, so the front face is
     * the most legible no matter how the pan dips (the top face foreshortens and
     * falls into shadow when a pan tilts down). We also keep it on the TOP (+y,
     * index 2) — cheap (same cached material) and readable from the slight downward
     * camera angle. Sides reuse the shared brass side material.
     */
    function makeCube(value: number, color: number, sideMat: THREE.MeshStandardMaterial): THREE.Mesh {
      const digit = topMat(color, value);
      //            +x        −x        +y(top)  −y        +z(FRONT)  −z
      const faces = [sideMat, sideMat, digit, sideMat, digit, sideMat];
      const mesh = new THREE.Mesh(cubeGeo, faces);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Tilt slightly toward the camera so the top digit is readable head-on while
      // the front digit stays facing the camera.
      mesh.rotation.x = -0.42;
      return mesh;
    }

    const beamGeo = roundedBox(BEAM_LENGTH, BEAM_THICKNESS, BEAM_DEPTH, 0.1, 3);
    const beamMat = new THREE.MeshStandardMaterial({ color: BEAM_COLOR, roughness: 0.4, metalness: 0.7 });

    const fulcrumGeo = roundedBox(FULCRUM_WIDTH, FULCRUM_HEIGHT, FULCRUM_DEPTH, 0.12, 3);
    const fulcrumMat = new THREE.MeshStandardMaterial({ color: FULCRUM_COLOR, roughness: 0.5, metalness: 0.6 });

    const hangerGeo = roundedBox(HANGER_WIDTH, HANGER_LENGTH, HANGER_WIDTH, 0.03, 2);
    const hangerMat = new THREE.MeshStandardMaterial({ color: HANGER_COLOR, roughness: 0.5, metalness: 0.6 });

    const panGeo = new THREE.CylinderGeometry(PAN_RADIUS, PAN_RADIUS * 0.8, PAN_THICKNESS, 30);
    const panMat = new THREE.MeshStandardMaterial({ color: PAN_COLOR, roughness: 0.4, metalness: 0.6 });

    // Shop counter slab under the fulcrum (frames the scene, catches the shadow).
    const counterGeo = roundedBox(11, 0.5, 3.2, 0.2, 3);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.9, metalness: 0.04 });

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
      cubesRow: THREE.Group; // holds the numbered cubes
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

      const cubesRow = new THREE.Group();
      pan.add(cubesRow);

      return { pan, cubesRow };
    }

    const left = makeSide(-1);
    const right = makeSide(1);

    const first = (quiz ? quiz.state().current : generator.next()) as BalanceScaleProblem;
    const state = {
      problem: first,
      counts: emptyCounts() as Record<Denomination, number>, // right pan starts EMPTY
      streak: 0,
      answered: 0,
    };

    function rightTotal(): number {
      return countsTotal(state.counts);
    }

    // ---- Cube layout on a pan (centered rows of MAX_CUBES_PER_ROW) ----
    function layoutPosition(index: number, total: number): { x: number; y: number } {
      const row = Math.floor(index / MAX_CUBES_PER_ROW);
      const col = index % MAX_CUBES_PER_ROW;
      const inThisRow = Math.min(MAX_CUBES_PER_ROW, total - row * MAX_CUBES_PER_ROW);
      const rowWidth = (inThisRow - 1) * CUBE_GAP;
      const x = col * CUBE_GAP - rowWidth / 2;
      const y = CUBE_Y + row * ROW_PITCH;
      return { x, y };
    }

    /** Rebuild the LEFT pan with the given cubes (rebuilt only when the problem changes). */
    function rebuildLeft(animate: boolean): void {
      left.cubesRow.clear();
      const cubes = state.problem.leftCubes;
      cubes.forEach((value, i) => {
        const pos = layoutPosition(i, cubes.length);
        const cube = makeCube(value, LEFT_CUBE_COLOR, leftSideMat);
        cube.position.set(pos.x, pos.y, 0);
        if (animate) track(popIn(cube, { delay: i * POP_STAGGER_MS }));
        left.cubesRow.add(cube);
      });
    }

    /**
     * Rebuild the RIGHT pan to match the current per-denomination counts. Weights are
     * laid out largest→smallest so the pile reads. Items at index ≥ prevCount pop in.
     * Every cube reuses the shared cube geo + shared right side material + a cached
     * per-number top material — never allocate-and-forget per weight.
     */
    function rebuildRight(prevCount: number, animate: boolean): void {
      right.cubesRow.clear();
      const values: number[] = [];
      for (const d of [...DENOMINATIONS].reverse()) {
        for (let i = 0; i < state.counts[d]; i++) values.push(d);
      }
      const total = values.length;
      let newOrdinal = 0;
      values.forEach((value, i) => {
        const pos = layoutPosition(i, total);
        const cube = makeCube(value, RIGHT_CUBE_COLOR, rightSideMat);
        cube.position.set(pos.x, pos.y, 0);
        if (animate && i >= prevCount) {
          track(popIn(cube, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        right.cubesRow.add(cube);
      });
    }

    function totalCount(counts: Record<Denomination, number>): number {
      return DENOMINATIONS.reduce((sum, d) => sum + counts[d], 0);
    }

    // ---- Beam tilt: diff = rightTotal − leftTotal; right heavier ⇒ right dips ----
    function renderTilt(animate: boolean): void {
      const diff = rightTotal() - state.problem.target;
      const target = THREE.MathUtils.clamp(diff * TILT_PER_UNIT, -MAX_TILT, MAX_TILT);
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
      // TASK ONLY — "Balance the scale". Never echoes L or the live right total;
      // the numbered cubes + the beam tilt show the state.
      ctx.prompt.set(ctx.t('balanceScale.prompt'));
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
      state.counts = emptyCounts();
      rebuildRight(0, false);
      renderTilt(true);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [];
      for (const denom of DENOMINATIONS) {
        // Label literally with the number (reads across all locales), like money-shop.
        buttons.push({ id: `d${denom}-dec`, label: `−${denom}`, onPress: () => changeDenom(denom, -1) });
        buttons.push({ id: `d${denom}-inc`, label: `+${denom}`, onPress: () => changeDenom(denom, 1) });
      }
      buttons.push({ id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetRight });
      buttons.push({ id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm });
      ctx.controls.set(buttons);
    }

    /** Load a fresh problem: rebuild the left, empty the right, reset prompt/status. */
    function startNewProblem(): void {
      state.counts = emptyCounts();
      rebuildLeft(true);
      rebuildRight(0, false);
      renderTilt(true);
      showPrompt();
      showStatus();
    }

    function buildAnswer(): BalanceScaleAnswer {
      return { counts: { ...state.counts }, total: rightTotal() };
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      // Reveal the matched value only AFTER Check (the success toast).
      ctx.feedback.correct(ctx.t('balanceScale.correct', { total: state.problem.target }));
      track(punch(left.cubesRow, 0.16));
      track(punch(right.cubesRow, 0.16));
      track(punch(beamPivot, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('balanceScale.wrong'));
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
        state.problem = qs.current as BalanceScaleProblem;
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

    // Drag = fast build: dragging UP adds a +1 weight, down removes one (natural:
    // up = more, never inverted). Precise control + bigger denoms are the −/+
    // buttons. dragEnd is a SECONDARY submit path; the Check button is primary.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changeDenom(1, 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changeDenom(1, -1);
        lastDragY = p.y;
      }
    });
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial build.
    track(popIn(beamPivot, { scale: 1 }));
    startNewProblem();
    setControls();

    return {
      onResize() { reframe(); },
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
        left.cubesRow.clear();
        right.cubesRow.clear();
        beamPivot.clear();
        root.clear();
        ctx.scene.remove(root);

        // Dispose every geometry + material created (one per kind, shared).
        cubeGeo.dispose();
        leftSideMat.dispose();
        rightSideMat.dispose();
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

        // Dispose every cached digit material AND CanvasTexture (mandatory).
        digitTopMats.forEach((m) => m.dispose());
        digitTopMats.clear();
        digitTextures.forEach((t) => t.dispose());
        digitTextures.clear();
      },
    };
  },
};
