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
  createNumberLineJumpGenerator,
  MAX,
  MIN_JUMP,
  MAX_JUMP,
  type NumberLineJumpProblem,
} from './problems';

// Theme: a RACE TRACK laid out as the number line 0..MAX, facing the viewer in
// the XY plane. A long asphalt strip carries numbered distance markers (dark
// digits on light plates — readable). A little CAR sits at the start position;
// a checkered FLAG marks the target. The child dials a JUMP SIZE (1..9) with
// −/+, then presses → קדימה / ← אחורה to HOP the car by ±size along the track,
// arcing over each hop like an open number line. Multiple hops are allowed
// (e.g. +5 then +3 to travel 8). The car's position is the LIVE state shown on
// the track — בדוק grades position === target. Procedural geometry only.
//
// FRAMING: a wide, flat scene is WIDTH-bound. The track is centered at the
// origin and spans ±TRACK_HALF in world-x; the locked straight-on camera at
// (0,0,CAM_DIST) sizes the view so the whole track fills the central viewport.
// All content sits at/above y≈0, so applyClayLook uses ground:false (no clay
// plane occluding it). Straight-on locked camera → NDC-x ↑ ⇒ world-x ↑, so a
// forward (+) hop moves the car to the RIGHT — natural, never inverted.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Track geometry (XY plane facing the locked camera at +Z).
const TRACK_HALF = 6.4; // world-x from value 0 (−HALF) to value MAX (+HALF)
const TRACK_SPAN = TRACK_HALF * 2;
const UNIT = TRACK_SPAN / MAX; // world-x per integer step
const CAM_DIST = 9.2; // straight-on distance sized to fit TRACK_SPAN width
const TRACK_Y = 0;
const TRACK_Z = 0;
const TRACK_HEIGHT = 1.15; // asphalt strip height (Y)
const TRACK_DEPTH = 0.45;

const TICK_W = 0.12;
const TICK_H = TRACK_HEIGHT + 0.5; // markers rise above the strip
const TICK_DEPTH = 0.16;
const TICK_Z = TRACK_Z + TRACK_DEPTH / 2 + 0.04;

// Number plates under each marker (procedural canvas textures — no asset files).
const LABEL_SIZE = 0.62;
const LABEL_Y = TRACK_Y - TRACK_HEIGHT / 2 - 0.5; // hang below the strip
const LABEL_Z = TRACK_Z + TRACK_DEPTH / 2 + 0.05;

// The car rides just above the strip; the flag stands at the target.
const CAR_Y = TRACK_Y + TRACK_HEIGHT / 2 + 0.55;
const CAR_Z = TRACK_Z + 0.35;
const CAR_W = 0.95;
const CAR_BODY_H = 0.42;
const CAR_CABIN_H = 0.34;
const WHEEL_R = 0.2;

const FLAG_Z = TRACK_Z + 0.5;
const FLAG_POLE_H = 1.9;
const FLAG_BASE_Y = TRACK_Y + TRACK_HEIGHT / 2;
const FLAG_CLOTH_W = 0.7;
const FLAG_CLOTH_H = 0.5;

const HOP_MS = 360; // duration of one hop arc
const HOP_ARC = 0.9; // peak height of the hop arc above the car's rest Y

// Palette: dark asphalt track, light readable number plates, a vivid car, a
// checkered flag. Saturated/dark where it matters; never faint light-on-light.
const TRACK_COLOR = 0x3b3f47; // dark asphalt
const TICK_COLOR = 0xf2ede1; // bright lane stripes against the dark asphalt
const LABEL_BG = '#f4eee2';
const LABEL_FG = '#23262c'; // near-black digits on a light plate — high contrast
const CAR_BODY_COLOR = PALETTE.coral;
const CAR_CABIN_COLOR = PALETTE.sky;
const WHEEL_COLOR = 0x1c1c1c;
const FLAG_POLE_COLOR = 0x6b4a30;
const FLAG_DARK = 0x23262c;
const FLAG_LIGHT = 0xf4eee2;

/** value (0..MAX) → world-x on the track. Monotonic increasing → forward = right. */
function valueToX(value: number): number {
  return -TRACK_HALF + value * UNIT;
}

export const numberLineJumpGame: Game3D = {
  meta: {
    id: 'number-line-jump',
    i18nKey: 'games3d.numberLineJump',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [1, 4],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera in front of the XY-plane track so "right" on
    // screen is +X (larger position) and the line reads horizontally.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, CAM_DIST), new THREE.Vector3(0, 0, 0));

    // Bright outdoor track-day ambience. No ground plane (content sits at y≈0;
    // a clay plane there would occlude it) — the engine still casts the shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe8ff',
      bottomColor: '#a7d08c',
      ground: false,
      shadowArea: 11,
      fog: false,
    });

    const generator = createNumberLineJumpGenerator();
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
    const trackGeo = roundedBox(TRACK_SPAN + UNIT, TRACK_HEIGHT, TRACK_DEPTH, 0.18, 3);
    const trackMat = new THREE.MeshStandardMaterial({ color: TRACK_COLOR, roughness: 0.9, metalness: 0.04 });

    // ONE shared tick geo+mat for every lane stripe.
    const tickGeo = roundedBox(TICK_W, TICK_H, TICK_DEPTH, 0.04, 2);
    const tickMat = new THREE.MeshStandardMaterial({ color: TICK_COLOR, roughness: 0.6, metalness: 0.04 });

    // ONE shared label plane geo; each integer 0..MAX gets a texture created once.
    const labelGeo = new THREE.PlaneGeometry(LABEL_SIZE, LABEL_SIZE);
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMats: THREE.MeshBasicMaterial[] = [];
    for (let n = 0; n <= MAX; n++) {
      const tex = makeNumberTexture(n);
      labelTextures.push(tex);
      labelMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    }

    // Car parts (one geo+mat per kind; wheels share a geo+mat).
    const carBodyGeo = roundedBox(CAR_W, CAR_BODY_H, 0.55, 0.1, 3);
    const carBodyMat = new THREE.MeshStandardMaterial({ color: CAR_BODY_COLOR, roughness: 0.45, metalness: 0.1 });
    const carCabinGeo = roundedBox(CAR_W * 0.55, CAR_CABIN_H, 0.5, 0.08, 3);
    const carCabinMat = new THREE.MeshStandardMaterial({ color: CAR_CABIN_COLOR, roughness: 0.4, metalness: 0.12 });
    const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.18, 18);
    wheelGeo.rotateX(Math.PI / 2); // wheels face the camera (axle along Z)
    const wheelMat = new THREE.MeshStandardMaterial({ color: WHEEL_COLOR, roughness: 0.7, metalness: 0.05 });

    // Flag parts.
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, FLAG_POLE_H, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: FLAG_POLE_COLOR, roughness: 0.7, metalness: 0.05 });
    const clothGeo = roundedBox(FLAG_CLOTH_W, FLAG_CLOTH_H, 0.06, 0.02, 1);
    const flagTex = makeCheckerTexture();
    const clothMat = new THREE.MeshBasicMaterial({ map: flagTex });

    // ---- Assemble the scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.position.set(0, TRACK_Y, TRACK_Z);
    trackMesh.castShadow = true;
    trackMesh.receiveShadow = true;
    root.add(trackMesh);

    // Static lane stripes + number plates (0..MAX). The track never changes.
    const ticksGroup = new THREE.Group();
    root.add(ticksGroup);
    for (let n = 0; n <= MAX; n++) {
      const x = valueToX(n);
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(x, TRACK_Y, TICK_Z);
      ticksGroup.add(tick);
      const label = new THREE.Mesh(labelGeo, labelMats[n]);
      label.position.set(x, LABEL_Y, LABEL_Z);
      ticksGroup.add(label);
    }

    // Car group (body + cabin + 2 wheels), moved along X to the car position.
    const carGroup = new THREE.Group();
    const carBody = new THREE.Mesh(carBodyGeo, carBodyMat);
    carBody.position.y = WHEEL_R;
    carBody.castShadow = true;
    const carCabin = new THREE.Mesh(carCabinGeo, carCabinMat);
    carCabin.position.set(-0.05, WHEEL_R + CAR_BODY_H / 2 + CAR_CABIN_H / 2 - 0.02, 0);
    carCabin.castShadow = true;
    const wheelFront = new THREE.Mesh(wheelGeo, wheelMat);
    wheelFront.position.set(CAR_W / 2 - 0.22, 0, 0.2);
    const wheelBack = new THREE.Mesh(wheelGeo, wheelMat);
    wheelBack.position.set(-CAR_W / 2 + 0.22, 0, 0.2);
    carGroup.add(carBody, carCabin, wheelFront, wheelBack);
    carGroup.position.set(valueToX(0), CAR_Y, CAR_Z);
    root.add(carGroup);

    // Flag group (pole + checkered cloth), moved along X to the target.
    const flagGroup = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = FLAG_POLE_H / 2;
    pole.castShadow = true;
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(FLAG_CLOTH_W / 2 + 0.06, FLAG_POLE_H - FLAG_CLOTH_H / 2 - 0.1, 0);
    cloth.castShadow = true;
    flagGroup.add(pole, cloth);
    flagGroup.position.set(valueToX(0), FLAG_BASE_Y, FLAG_Z);
    root.add(flagGroup);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as NumberLineJumpProblem,
      pos: (first as NumberLineJumpProblem).start, // LIVE car position
      jump: 1, // current jump size 1..9
      hopping: false, // guard so hops don't overlap
      streak: 0,
      answered: 0,
    };

    /** Place the flag at the target and the car at its start position (no anim). */
    function placeForProblem(): void {
      state.pos = state.problem.start;
      flagGroup.position.x = valueToX(state.problem.target);
      carGroup.position.x = valueToX(state.pos);
      carGroup.position.y = CAR_Y;
      track(popIn(flagGroup, { scale: 1 }));
    }

    function showPrompt(): void {
      // TASK ONLY — the target position. Never echoes the live car position.
      ctx.prompt.set(ctx.t('numberLineJump.prompt', { target: state.problem.target }));
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

    function setJump(j: number): void {
      state.jump = Math.max(MIN_JUMP, Math.min(MAX_JUMP, j));
      setControls(); // refresh the jump label so the child sees the size
    }

    /**
     * Hop the car by ±jump along the track, CLAMPED to 0..MAX. Animates as a
     * little ARC: x slides to the new position while y rises and falls in a
     * parabola (peak at HOP_ARC). Both tweens are tracked. Under reduced motion
     * the car just snaps. `hopping` guards against overlapping hops.
     */
    function hop(direction: 1 | -1): void {
      if (state.hopping) return;
      const next = Math.max(0, Math.min(MAX, state.pos + direction * state.jump));
      if (next === state.pos) {
        // At an edge and the hop would leave the track — nudge to signal the wall.
        track(shake(carGroup, 0.05, 200));
        return;
      }
      const fromX = carGroup.position.x;
      const toX = valueToX(next);
      state.pos = next;

      if (ctx.prefersReducedMotion) {
        carGroup.position.x = toX;
        carGroup.position.y = CAR_Y;
        return;
      }
      state.hopping = true;
      // Drive a 0→1 progress proxy; map it to x (lerp) and y (parabolic arc).
      track(
        tweenTo(0, 1, HOP_MS, (p) => {
          carGroup.position.x = fromX + (toX - fromX) * p;
          carGroup.position.y = CAR_Y + HOP_ARC * 4 * p * (1 - p); // 0 at ends, peak at p=0.5
          if (p >= 1) {
            carGroup.position.y = CAR_Y;
            state.hopping = false;
          }
        })
      );
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'jump-dec',
          label: `${ctx.t('controls.jump')} −`,
          onPress: () => setJump(state.jump - 1),
        },
        {
          id: 'jump-inc',
          label: `${ctx.t('controls.jump')} +`,
          onPress: () => setJump(state.jump + 1),
        },
        {
          id: 'back',
          label: `← ${ctx.t('controls.back')}`,
          onPress: () => hop(-1),
        },
        {
          id: 'forward',
          label: `→ ${ctx.t('controls.forward')}`,
          onPress: () => hop(1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetCar,
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

    /** Send the car back to the start position (the jump size is kept). */
    function resetCar(): void {
      state.hopping = false;
      state.pos = state.problem.start;
      const toX = valueToX(state.pos);
      if (ctx.prefersReducedMotion) {
        carGroup.position.x = toX;
        carGroup.position.y = CAR_Y;
        return;
      }
      const fromX = carGroup.position.x;
      track(
        tweenTo(0, 1, HOP_MS, (p) => {
          carGroup.position.x = fromX + (toX - fromX) * p;
          carGroup.position.y = CAR_Y;
        })
      );
    }

    function startNewProblem(): void {
      // Place car + flag for the fresh problem (so it never opens solved), then prompt.
      placeForProblem();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('numberLineJump.correct', { target: state.problem.target }));
      track(punch(carGroup, 0.22));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('numberLineJump.wrong'));
      track(shake(carGroup, 0.07, 280));
    }

    function confirm(): void {
      // The committed answer is the car's LIVE position on the track.
      const answer = state.pos;
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

      // Practice: correct → score + next problem; wrong → KEEP the car where it is to fix.
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

    // Initial render: car at S, flag at T, jump=1, prompt + status + controls up.
    placeForProblem();
    track(popIn(root, { scale: 1 }));
    setControls();
    showPrompt();
    showStatus();

    return {
      onResize() {},
      dispose() {
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        ticksGroup.clear();
        carGroup.clear();
        flagGroup.clear();
        root.clear();
        ctx.scene.remove(root);

        trackGeo.dispose();
        trackMat.dispose();
        tickGeo.dispose();
        tickMat.dispose();
        labelGeo.dispose();
        labelTextures.forEach((t) => t.dispose());
        labelMats.forEach((m) => m.dispose());
        carBodyGeo.dispose();
        carBodyMat.dispose();
        carCabinGeo.dispose();
        carCabinMat.dispose();
        wheelGeo.dispose();
        wheelMat.dispose();
        poleGeo.dispose();
        poleMat.dispose();
        clothGeo.dispose();
        flagTex.dispose();
        clothMat.dispose();
      },
    };
  },
};

/**
 * Render an integer (0..MAX) as a dark-on-light canvas texture for a distance
 * marker plate. Created once per integer at init and reused; disposed on dispose().
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    // Light rounded plate so the dark digits stay readable on any backdrop.
    g.fillStyle = LABEL_BG;
    const r = 14;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(size, 0, size, size, r);
    g.arcTo(size, size, 0, size, r);
    g.arcTo(0, size, 0, 0, r);
    g.arcTo(0, 0, size, 0, r);
    g.closePath();
    g.fill();
    g.fillStyle = LABEL_FG;
    g.font = 'bold 44px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** A small checkered (racing) flag texture, created once and disposed on dispose(). */
function makeCheckerTexture(): THREE.CanvasTexture {
  const size = 64;
  const cells = 4;
  const cell = size / cells;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        g.fillStyle = (r + c) % 2 === 0 ? `#${FLAG_DARK.toString(16).padStart(6, '0')}` : `#${FLAG_LIGHT.toString(16).padStart(6, '0')}`;
        g.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
