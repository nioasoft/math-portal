import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
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
  createAngleGenerator,
  STEP_DEGREES,
  type AngleProblem,
} from './problems';

// Theme: a SPACE STATION firing laser beams. A glowing hub sits at the origin in
// the dark of space; a FIXED red laser fires along +X (the 0° baseline) and a
// MOVABLE cyan laser sweeps counter-clockwise from it. A glowing arc between the
// two beams sweeps to show the current opening, and a live degree readout floats
// near the hub (the "protractor" — the measuring instrument; it is ALLOWED, but
// success is only revealed after Check). The child rotates the movable beam in
// 15° steps with −/+ or by dragging it (snaps to 15°), then בדוק grades the built
// angle against the target. The prompt shows ONLY the target angle.
//
// ANGLE CONVENTION (def 9): the baseline ray points along +X (0°). The movable
// ray at θ degrees (CCW) has direction (cos θ, sin θ) in the XY plane facing the
// camera. The ray mesh is modeled along +X, so we set rotation.z = +θ (radians)
// — positive Z-rotation is CCW in three.js. Sanity: 90° points UP (+Y), 180°
// points LEFT (−X). The glowing arc sweeps from 0 to θ CCW (RingGeometry's
// thetaStart=0, thetaLength=θ also sweeps CCW from +X).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const MIN_ANGLE = 0; // clamp floor for the movable ray
const MAX_ANGLE = 180; // clamp ceiling for the movable ray

// Geometry (procedural, in the XY plane facing the camera at z≈0).
const RAY_LENGTH = 4.0; // laser beam length from the hub
const RAY_RADIUS = 0.14; // beam thickness
const HUB_RADIUS = 0.5; // glowing station hub at the vertex
const ARC_INNER = 1.5; // glowing angle arc radii (a wedge near the vertex)
const ARC_OUTER = 1.95;
const READOUT_RADIUS = 2.7; // distance of the degree readout from the hub
const TICK_RING_RADIUS = RAY_LENGTH + 0.35; // faint 15° guide marks around the rim

// Space palette: dark beams glow via emissive. Fixed beam = warm red, movable
// beam = cyan, arc = sun-yellow glow. All highly saturated against the dark space
// backdrop (high contrast — never light-on-light).
const HUB_COLOR = 0x9fb4d8; // cool metal station hub
const HUB_EMISSIVE = 0x3a5680;
const FIXED_RAY_COLOR = PALETTE.coral; // baseline beam (0°)
const FIXED_RAY_EMISSIVE = 0xff3b3b;
const MOVABLE_RAY_COLOR = 0x49e8ff; // movable beam (cyan)
const MOVABLE_RAY_EMISSIVE = 0x18b6d6;
const ARC_COLOR = PALETTE.sun;
const ARC_EMISSIVE = 0xffb300;
const TICK_COLOR = 0x6a82b0;
const READOUT_BG = 'rgba(10, 16, 34, 0.92)'; // dark pill behind the degree digits
const READOUT_FG = '#ffe27a'; // warm glow digits on the dark pill (contrast)

const RAY_TWEEN_MS = 240;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export const angleBuilderGame: Game3D = {
  meta: {
    id: 'angle-builder',
    i18nKey: 'games3d.angleBuilder',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [4, 5],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing scene: lock the camera in front of the XY plane looking at a
    // point lifted to y≈1.2 (the content lives in the upper half as the movable
    // ray sweeps from +X up to −X). Straight-on so drag-x → world-x is monotonic.
    ctx.presets.camera.locked(new THREE.Vector3(0, 1.2, 12), new THREE.Vector3(0, 1.2, 0));

    // Dark space ambience. No ground plane (content sits at/around y=0 in deep
    // space; a clay ground would occlude the lower beam) — ground:false per def 12b.
    const clayLook = applyClayLook(ctx, {
      topColor: '#0b1026',
      bottomColor: '#1b2350',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createAngleGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { a: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ a: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { a: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material per kind) ----
    // Beams: a cylinder modeled along +X with its BASE at the origin (cylinders
    // default along +Y, so rotate −90° about Z to lie along +X, then translate the
    // half-length out so it grows from the hub).
    function makeBeamGeo(): THREE.CylinderGeometry {
      const geo = new THREE.CylinderGeometry(RAY_RADIUS, RAY_RADIUS, RAY_LENGTH, 16);
      geo.rotateZ(-Math.PI / 2); // +Y cylinder → +X
      geo.translate(RAY_LENGTH / 2, 0, 0); // base at origin, tip at +X·RAY_LENGTH
      return geo;
    }
    const fixedRayGeo = makeBeamGeo();
    const movableRayGeo = makeBeamGeo();
    const fixedRayMat = new THREE.MeshStandardMaterial({
      color: FIXED_RAY_COLOR,
      emissive: FIXED_RAY_EMISSIVE,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      metalness: 0.1,
    });
    const movableRayMat = new THREE.MeshStandardMaterial({
      color: MOVABLE_RAY_COLOR,
      emissive: MOVABLE_RAY_EMISSIVE,
      emissiveIntensity: 0.95,
      roughness: 0.4,
      metalness: 0.1,
    });

    const hubGeo = new THREE.SphereGeometry(HUB_RADIUS, 24, 16);
    const hubMat = new THREE.MeshStandardMaterial({
      color: HUB_COLOR,
      emissive: HUB_EMISSIVE,
      emissiveIntensity: 0.6,
      roughness: 0.35,
      metalness: 0.4,
    });

    // 15° guide ticks around the rim (faint, so the child can read the protractor).
    const tickGeo = new THREE.BoxGeometry(0.32, 0.06, 0.06);
    const tickMat = new THREE.MeshStandardMaterial({
      color: TICK_COLOR,
      emissive: 0x223355,
      emissiveIntensity: 0.4,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Arc material is shared; the arc GEOMETRY is rebuilt per angle (a wedge with
    // thetaLength=θ), disposing the previous one — never allocate-and-forget.
    const arcMat = new THREE.MeshStandardMaterial({
      color: ARC_COLOR,
      emissive: ARC_EMISSIVE,
      emissiveIntensity: 0.85,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    // Live degree readout: a single CanvasTexture redrawn in place on change (one
    // canvas, one texture, one material, one plane — disposed on dispose()).
    const readoutCanvas = document.createElement('canvas');
    readoutCanvas.width = 256;
    readoutCanvas.height = 128;
    const readoutTexture = new THREE.CanvasTexture(readoutCanvas);
    const readoutMat = new THREE.MeshBasicMaterial({
      map: readoutTexture,
      transparent: true,
      depthTest: false,
    });
    const readoutGeo = new THREE.PlaneGeometry(2.0, 1.0);
    const readout = new THREE.Mesh(readoutGeo, readoutMat);
    readout.renderOrder = 10; // float above the arc/beams

    // ---- Assemble the station ----
    const station = new THREE.Group();
    ctx.scene.add(station);

    // 15° guide ticks (0..180), each a small block pointing outward from the hub.
    const ticksGroup = new THREE.Group();
    station.add(ticksGroup);
    for (let deg = 0; deg <= 180; deg += STEP_DEGREES) {
      const theta = toRad(deg);
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(Math.cos(theta) * TICK_RING_RADIUS, Math.sin(theta) * TICK_RING_RADIUS, 0);
      tick.rotation.z = theta; // align the tick's long axis along the radius
      ticksGroup.add(tick);
    }

    // Glowing angle arc (rebuilt per angle, parented so it sits just in front).
    const arcMesh = new THREE.Mesh(new THREE.RingGeometry(ARC_INNER, ARC_OUTER, 48, 1, 0, 0.0001), arcMat);
    arcMesh.position.z = 0.05;
    station.add(arcMesh);

    // Fixed baseline beam (along +X, 0°).
    const fixedRay = new THREE.Mesh(fixedRayGeo, fixedRayMat);
    fixedRay.position.z = 0.1;
    station.add(fixedRay);

    // Movable beam pivot (rotated about Z by +θ). The beam grows from the hub.
    const movablePivot = new THREE.Group();
    movablePivot.position.z = 0.18;
    const movableRay = new THREE.Mesh(movableRayGeo, movableRayMat);
    movablePivot.add(movableRay);
    station.add(movablePivot);

    // Hub caps the beam bases at the vertex.
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.z = 0.25;
    station.add(hub);

    // Degree readout floats above-left of the hub, bisecting the swept region.
    readout.position.set(-0.2, READOUT_RADIUS, 0.3);
    station.add(readout);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as AngleProblem,
      angle: 0, // current movable-ray angle in degrees (starts at 0° ≠ any target)
      streak: 0,
      answered: 0,
    };

    /** Redraw the live degree readout (dark pill + glow digits) for state.angle. */
    function drawReadout(): void {
      const g = readoutCanvas.getContext('2d');
      if (!g) return;
      const w = readoutCanvas.width;
      const h = readoutCanvas.height;
      g.clearRect(0, 0, w, h);
      // Rounded dark pill.
      const r = 28;
      g.fillStyle = READOUT_BG;
      g.beginPath();
      g.moveTo(r, 4);
      g.lineTo(w - r, 4);
      g.quadraticCurveTo(w - 4, 4, w - 4, r + 4);
      g.lineTo(w - 4, h - r - 4);
      g.quadraticCurveTo(w - 4, h - 4, w - r, h - 4);
      g.lineTo(r, h - 4);
      g.quadraticCurveTo(4, h - 4, 4, h - r - 4);
      g.lineTo(4, r + 4);
      g.quadraticCurveTo(4, 4, r, 4);
      g.closePath();
      g.fill();
      // Glow digits.
      g.fillStyle = READOUT_FG;
      g.font = 'bold 72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${state.angle}°`, w / 2, h / 2 + 4);
      readoutTexture.needsUpdate = true;
    }

    /** Rebuild the glowing arc geometry to span 0..angle (CCW from +X). */
    function buildArc(): void {
      const theta = Math.max(toRad(state.angle), 0.0001); // RingGeometry needs > 0
      const next = new THREE.RingGeometry(ARC_INNER, ARC_OUTER, 64, 1, 0, theta);
      arcMesh.geometry.dispose();
      arcMesh.geometry = next;
    }

    /**
     * Point the movable beam at state.angle. The beam is modeled along +X, so we
     * set rotation.z = +θ (CCW). Smoothly tweened unless reduced-motion. Also
     * rebuilds the arc + redraws the readout (those are instant — they track the
     * current value).
     */
    function renderRay(animate: boolean): void {
      const target = toRad(state.angle);
      buildArc();
      drawReadout();
      if (!animate || ctx.prefersReducedMotion) {
        movablePivot.rotation.z = target;
        return;
      }
      track(tweenAngle(movablePivot, target));
    }

    /** Tween a pivot's rotation.z to target via the kit's shared tween group. */
    function tweenAngle(pivot: THREE.Object3D, target: number): Tween<{ a: number }> {
      const from = pivot.rotation.z;
      const t = tweenTo(from, target, RAY_TWEEN_MS, (v) => {
        pivot.rotation.z = v;
      });
      return t as unknown as Tween<{ a: number }>;
    }

    /** Set the angle (clamped to 0..180, snapped to 15°) and re-render. */
    function setAngle(deg: number, animate: boolean): void {
      const snapped = Math.round(deg / STEP_DEGREES) * STEP_DEGREES;
      state.angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, snapped));
      renderRay(animate);
    }

    /** + rotates CCW (more degrees); − the other way. Natural (def 9). */
    function stepAngle(delta: number): void {
      setAngle(state.angle + delta, true);
    }

    function resetAngle(): void {
      setAngle(0, true);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'angle-dec', label: `${ctx.t('controls.angle')} −`, onPress: () => stepAngle(-STEP_DEGREES) },
        { id: 'angle-inc', label: `${ctx.t('controls.angle')} +`, onPress: () => stepAngle(STEP_DEGREES) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetAngle },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function showPrompt(): void {
      // TASK ONLY — shows the target angle, never the live built angle/correctness.
      ctx.prompt.set(ctx.t('angleBuilder.prompt', { angle: state.problem.target }));
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

    function startNewProblem(): void {
      // Keep the built angle between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('angleBuilder.correct', { angle: state.problem.target }));
      track(punch(movablePivot, 0.16));
      track(punch(hub, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('angleBuilder.wrong'));
      track(shake(station, 0.05, 280));
    }

    function confirm(): void {
      const answer = state.angle;
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

      // Practice: correct → score + next problem; wrong → KEEP the built angle to fix.
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
     * Drag = grab the movable beam and sweep it around the hub. The hub is at the
     * origin and the locked camera looks straight down −Z, so NDC (x, y) map
     * monotonically to world (x, y): the CCW angle from +X is atan2(y, x). Snap to
     * the nearest 15°, clamped to 0..180. Dragging counter-clockwise (up/left)
     * increases the angle — never inverted.
     */
    function pointerToAngle(ndcX: number, ndcY: number): number {
      let theta = (Math.atan2(ndcY, ndcX) * 180) / Math.PI; // −180..180, CCW from +X
      if (theta < 0) theta = 0; // below the baseline reads as 0°
      return theta; // setAngle clamps to 0..180 and snaps to 15°
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const newAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, Math.round(pointerToAngle(p.x, p.y) / STEP_DEGREES) * STEP_DEGREES));
      if (newAngle === state.angle) return;
      state.angle = newAngle;
      renderRay(false); // track the finger instantly while dragging
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: beam at 0°, prompt + status + controls up.
    setAngle(0, false);
    track(popIn(station, { scale: 1 }));
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
        station.clear();
        ctx.scene.remove(station);

        fixedRayGeo.dispose();
        fixedRayMat.dispose();
        movableRayGeo.dispose();
        movableRayMat.dispose();
        hubGeo.dispose();
        hubMat.dispose();
        tickGeo.dispose();
        tickMat.dispose();
        arcMesh.geometry.dispose();
        arcMat.dispose();
        readoutGeo.dispose();
        readoutMat.dispose();
        readoutTexture.dispose();
      },
    };
  },
};
