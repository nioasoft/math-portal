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
// group — we adapt it to slide the marker's x/y position (the kit's
// popIn/punch/shake only touch scale, never position-to-a-target).
import { tweenTo } from '@/lib/games3d/kit/juice';
import {
  createCoordinatePlotGenerator,
  GRID_MAX,
  type CoordinatePlotProblem,
} from './problems';

// Theme: a sheet of GRAPH PAPER standing up to face the viewer. A first-quadrant
// integer grid 0..8 on each axis (origin bottom-left) sits in the XY plane; thin
// grid lines, two bold dark AXES (X along the bottom, Y up the left, each capped
// with an arrowhead), and integer tick labels 0..8 rendered as CanvasTexture
// number plates facing the camera. A bright glowing PIN marker sits on a grid
// node and the child slides it with X −/+ , Y −/+ , or by DRAGGING it across the
// paper (pointer → nearest integer node; right = +x, up = +y, never inverted).
// בדוק grades the marker's (x,y) against the target; Reset returns it to (0,0).
//
// CAMERA: a locked camera straight in front of the XY plane at (cx, cy, D)
// looking at the grid center, so NDC (x,y) map MONOTONICALLY to world (x,y) —
// dragging right grows x, dragging up grows y. The whole 0..8 grid is centered
// and framed with margin. ground:false (content lives in the XY plane at z≈0).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const CELL = 1.15; // world units between adjacent integer grid nodes
const HALF = (GRID_MAX * CELL) / 2; // grid center offset (origin → bottom-left)

// Marker move/feedback timing.
const MOVE_MS = 220;

// Graph-paper palette: bright cream paper, soft blue grid lines, dark ink axes,
// a hot glowing coral pin so the marker pops against the light paper (contrast).
const PAPER_COLOR = PALETTE.cream;
const GRID_LINE_COLOR = 0x6f8fb5; // soft blue rulings — visible but not loud
const AXIS_COLOR = 0x1f2d3d; // dark ink axes — strong contrast on cream
const MARKER_COLOR = PALETTE.coral; // bright pin head
const MARKER_GLOW_COLOR = 0xffd27a; // warm halo behind the pin
const LABEL_BG = '#1f2d3d'; // dark plate so light digits stay readable on cream
const LABEL_FG = '#fdf3df';

// Grid-line dimensions (thin rounded bars in the XY plane).
const LINE_W = 0.045;
const LINE_DEPTH = 0.08;
const AXIS_W = 0.13; // axes are clearly thicker than rulings
const PAPER_PAD = 0.7; // paper sheet extends past the grid on every side
const PAPER_DEPTH = 0.25;

const TICK_LABEL_SIZE = 0.55; // world size of a number plate
const MARKER_HEAD_R = 0.32;
const MARKER_GLOW_R = 0.55;
const MARKER_Z = 0.55; // marker floats just in front of the paper

/** World position (x,y) for an integer grid coordinate, grid centered on origin. */
function gridToWorld(gx: number, gy: number): { x: number; y: number } {
  return { x: gx * CELL - HALF, y: gy * CELL - HALF };
}

/** Clamp an integer grid coordinate to 0..GRID_MAX. */
function clampCoord(v: number): number {
  return Math.max(0, Math.min(GRID_MAX, Math.round(v)));
}

export const coordinatePlotGame: Game3D = {
  meta: {
    id: 'coordinate-plot',
    i18nKey: 'games3d.coordinatePlot',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [4, 6],
    estimatedSeconds: 80,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // The graph paper faces the viewer: lock the camera in front of the XY plane
    // looking at the grid center, so screen-up is +Y and screen-right is +X.
    // Distance sized to fit the grid WIDTH (the larger framing constraint) with
    // margin; the grid spans GRID_MAX*CELL ≈ 9.2 world units across.
    const gridCenter = new THREE.Vector3(0, 0, 0);
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 13.5), gridCenter);

    // Clay/paper ambience. No ground plane (the paper hangs in the XY plane,
    // framed by the gradient backdrop); the engine still adds a soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#dfeaf6',
      bottomColor: '#f3ecd9',
      ground: false,
      shadowArea: 11,
      fog: false,
    });

    const generator = createCoordinatePlotGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { v: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ v: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { v: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material per KIND) ----
    const gridSpan = GRID_MAX * CELL;

    // Paper backdrop sheet (single mesh, sits behind everything at z<0).
    const paperGeo = roundedBox(gridSpan + PAPER_PAD * 2, gridSpan + PAPER_PAD * 2, PAPER_DEPTH, 0.25, 3);
    const paperMat = new THREE.MeshStandardMaterial({ color: PAPER_COLOR, roughness: 0.95, metalness: 0.0 });

    // ONE shared geometry per kind of line; lines are scaled per instance.
    const lineGeo = roundedBox(1, 1, LINE_DEPTH, 0.02, 1);
    const gridLineMat = new THREE.MeshStandardMaterial({ color: GRID_LINE_COLOR, roughness: 0.8, metalness: 0.03 });
    const axisMat = new THREE.MeshStandardMaterial({ color: AXIS_COLOR, roughness: 0.6, metalness: 0.05 });

    // Arrowheads cap the two axes (one cone geo + the axis material, reused twice).
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.4, 16);
    // Tick-label plates: ONE shared plane geo; each integer 0..GRID_MAX gets a
    // texture created once (reused for the matching X and Y tick).
    const labelGeo = new THREE.PlaneGeometry(TICK_LABEL_SIZE, TICK_LABEL_SIZE);
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMats: THREE.MeshBasicMaterial[] = [];
    for (let n = 0; n <= GRID_MAX; n++) {
      const tex = makeNumberTexture(n);
      labelTextures.push(tex);
      labelMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    }

    // Marker: a glowing pin = a bright head + a soft warm halo behind it. Both
    // use UNIFORM scale, so popIn/punch on the marker group are safe.
    const markerHeadGeo = new THREE.SphereGeometry(MARKER_HEAD_R, 24, 24);
    const markerHeadMat = new THREE.MeshStandardMaterial({
      color: MARKER_COLOR,
      roughness: 0.35,
      metalness: 0.1,
      emissive: new THREE.Color(MARKER_COLOR),
      emissiveIntensity: 0.45,
    });
    const markerGlowGeo = new THREE.SphereGeometry(MARKER_GLOW_R, 20, 20);
    const markerGlowMat = new THREE.MeshBasicMaterial({
      color: MARKER_GLOW_COLOR,
      transparent: true,
      opacity: 0.35,
    });
    const markerStemGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
    const markerStemMat = new THREE.MeshStandardMaterial({ color: AXIS_COLOR, roughness: 0.5, metalness: 0.1 });

    // ---- Assemble the scene graph (everything under `root`, root added once) ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.z = -PAPER_DEPTH; // sits behind the grid lines
    paper.receiveShadow = true;
    paper.scale.setScalar(1); // static prop — explicit scale (never popIn a thing that must stay visible)
    root.add(paper);

    // Grid rulings: vertical + horizontal thin lines at every integer 0..GRID_MAX.
    const gridGroup = new THREE.Group();
    root.add(gridGroup);
    for (let i = 0; i <= GRID_MAX; i++) {
      const w = gridToWorld(i, 0).x; // x of vertical line i
      const vLine = new THREE.Mesh(lineGeo, gridLineMat);
      vLine.scale.set(LINE_W, gridSpan, 1);
      vLine.position.set(w, 0, 0.01);
      gridGroup.add(vLine);

      const h = gridToWorld(0, i).y; // y of horizontal line i
      const hLine = new THREE.Mesh(lineGeo, gridLineMat);
      hLine.scale.set(gridSpan, LINE_W, 1);
      hLine.position.set(0, h, 0.01);
      gridGroup.add(hLine);
    }

    // Bold axes: X along the bottom (y=0 grid row), Y up the left (x=0 grid col),
    // each running the full grid + a little overshoot, capped with an arrowhead.
    const axisGroup = new THREE.Group();
    root.add(axisGroup);
    const overshoot = 0.55;
    const xAxisLen = gridSpan + overshoot;
    const yAxisLen = gridSpan + overshoot;
    const originW = gridToWorld(0, 0);

    const xAxis = new THREE.Mesh(lineGeo, axisMat);
    xAxis.scale.set(xAxisLen, AXIS_W, 1.2);
    // centered so its left end sits at the origin column, extending right + overshoot.
    xAxis.position.set(originW.x + xAxisLen / 2 - AXIS_W / 2, originW.y, 0.04);
    xAxis.castShadow = true;
    axisGroup.add(xAxis);

    const yAxis = new THREE.Mesh(lineGeo, axisMat);
    yAxis.scale.set(AXIS_W, yAxisLen, 1.2);
    yAxis.position.set(originW.x, originW.y + yAxisLen / 2 - AXIS_W / 2, 0.04);
    yAxis.castShadow = true;
    axisGroup.add(yAxis);

    // Arrowheads: X arrow points +X (rotate cone from +Y to +X = −90° about Z);
    // Y arrow points +Y (cone default). Reuse axisMat.
    const xArrow = new THREE.Mesh(arrowGeo, axisMat);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.set(originW.x + xAxisLen - AXIS_W / 2 + 0.15, originW.y, 0.04);
    axisGroup.add(xArrow);

    const yArrow = new THREE.Mesh(arrowGeo, axisMat);
    yArrow.position.set(originW.x, originW.y + yAxisLen - AXIS_W / 2 + 0.15, 0.04);
    axisGroup.add(yArrow);

    // Tick labels 0..GRID_MAX along each axis (number plates facing the camera).
    const labelGroup = new THREE.Group();
    root.add(labelGroup);
    for (let i = 0; i <= GRID_MAX; i++) {
      const xw = gridToWorld(i, 0);
      const xLabel = new THREE.Mesh(labelGeo, labelMats[i]);
      // X-axis ticks sit just BELOW the axis (negative y offset).
      xLabel.position.set(xw.x, originW.y - 0.55, 0.06);
      xLabel.scale.setScalar(1);
      labelGroup.add(xLabel);

      // Skip a duplicate 0 on the Y axis (the origin label already shown on X).
      if (i === 0) continue;
      const yw = gridToWorld(0, i);
      const yLabel = new THREE.Mesh(labelGeo, labelMats[i]);
      // Y-axis ticks sit just LEFT of the axis (negative x offset).
      yLabel.position.set(originW.x - 0.55, yw.y, 0.06);
      yLabel.scale.setScalar(1);
      labelGroup.add(yLabel);
    }

    // Marker pin group (uniform-scaled children → popIn/punch safe on the group).
    const markerGroup = new THREE.Group();
    root.add(markerGroup);
    const glow = new THREE.Mesh(markerGlowGeo, markerGlowMat);
    markerGroup.add(glow);
    const stem = new THREE.Mesh(markerStemGeo, markerStemMat);
    stem.position.set(0, -0.4, -0.05); // a little stem dropping toward the paper
    markerGroup.add(stem);
    const head = new THREE.Mesh(markerHeadGeo, markerHeadMat);
    head.castShadow = true;
    markerGroup.add(head);
    markerGroup.scale.setScalar(1);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as CoordinatePlotProblem,
      x: 0,
      y: 0,
      streak: 0,
      answered: 0,
    };

    /** Place the marker at its current (x,y) grid node. Slides smoothly unless reduced-motion. */
    function renderMarker(animate: boolean): void {
      const w = gridToWorld(state.x, state.y);
      const fromX = markerGroup.position.x;
      const fromY = markerGroup.position.y;
      markerGroup.position.z = MARKER_Z;
      if (!animate || ctx.prefersReducedMotion) {
        markerGroup.position.set(w.x, w.y, MARKER_Z);
        return;
      }
      track(tweenTo(fromX, w.x, MOVE_MS, (v) => { markerGroup.position.x = v; }));
      track(tweenTo(fromY, w.y, MOVE_MS, (v) => { markerGroup.position.y = v; }));
    }

    function showPrompt(): void {
      // TASK ONLY — shows the target coordinates, never the live marker position.
      ctx.prompt.set(ctx.t('coordinatePlot.prompt', { x: state.problem.tx, y: state.problem.ty }));
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

    function setX(value: number): void {
      state.x = clampCoord(value);
      renderMarker(true);
      setControls(); // refresh the X/Y readout on the buttons
    }
    function setY(value: number): void {
      state.y = clampCoord(value);
      renderMarker(true);
      setControls();
    }

    function resetMarker(): void {
      state.x = 0;
      state.y = 0;
      renderMarker(true);
      setControls();
    }

    function setControls(): void {
      // Embed the live coordinate on each axis's label so the child always sees
      // the current value (a readout) on solid, high-contrast buttons.
      const xLabel = `${ctx.t('controls.coordX')} (${state.x})`;
      const yLabel = `${ctx.t('controls.coordY')} (${state.y})`;
      const buttons: ControlButton[] = [
        { id: 'x-dec', label: `${xLabel} −`, onPress: () => setX(state.x - 1) },
        { id: 'x-inc', label: `${xLabel} +`, onPress: () => setX(state.x + 1) },
        { id: 'y-dec', label: `${yLabel} −`, onPress: () => setY(state.y - 1) },
        { id: 'y-inc', label: `${yLabel} +`, onPress: () => setY(state.y + 1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetMarker },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      // Keep the marker where it is between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('coordinatePlot.correct', { x: state.problem.tx, y: state.problem.ty }));
      track(punch(markerGroup, 0.2)); // uniform scale on the group — safe
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('coordinatePlot.wrong'));
      track(shake(markerGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = { x: state.x, y: state.y };
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

      // Practice: correct → score + next problem; wrong → KEEP the placement to fix.
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
     * Drag = grab the pin and slide it across the paper. The locked camera looks
     * straight down −Z at the grid center, so NDC (x,y) map MONOTONICALLY to world
     * (x,y). Convert the pointer's NDC to a world point on the z≈0 plane, then snap
     * to the nearest integer grid node (right = +x, up = +y — never inverted).
     */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0 plane
    const hit = new THREE.Vector3();
    function pointerToCell(p: { x: number; y: number }): { gx: number; gy: number } | null {
      ndc.set(p.x, p.y);
      raycaster.setFromCamera(ndc, ctx.camera);
      const point = raycaster.ray.intersectPlane(planeZ, hit);
      if (!point) return null;
      // world → grid coordinate (inverse of gridToWorld), then snap + clamp.
      const gx = clampCoord((point.x + HALF) / CELL);
      const gy = clampCoord((point.y + HALF) / CELL);
      return { gx, gy };
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const cell = pointerToCell(p);
      if (!cell) return;
      if (cell.gx === state.x && cell.gy === state.y) return;
      state.x = cell.gx;
      state.y = cell.gy;
      // Snap instantly while dragging so the pin tracks the finger.
      renderMarker(false);
      setControls();
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: marker at the origin (0,0), prompt + status + controls up.
    renderMarker(false);
    track(popIn(markerGroup, { scale: 1 }));
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

        gridGroup.clear();
        axisGroup.clear();
        labelGroup.clear();
        markerGroup.clear();
        root.clear();
        ctx.scene.remove(root);

        paperGeo.dispose();
        paperMat.dispose();
        lineGeo.dispose();
        gridLineMat.dispose();
        axisMat.dispose();
        arrowGeo.dispose();
        labelGeo.dispose();
        labelTextures.forEach((t) => t.dispose());
        labelMats.forEach((m) => m.dispose());
        markerHeadGeo.dispose();
        markerHeadMat.dispose();
        markerGlowGeo.dispose();
        markerGlowMat.dispose();
        markerStemGeo.dispose();
        markerStemMat.dispose();
      },
    };
  },
};

/**
 * A dark rounded plate with a light digit, drawn once per integer and reused for
 * the matching X and Y tick. Disposed on dispose(). High contrast on the light
 * cream paper (dark plate + light ink).
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    g.fillStyle = LABEL_BG;
    const r = 16;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(size, 0, size, size, r);
    g.arcTo(size, size, 0, size, r);
    g.arcTo(0, size, 0, 0, r);
    g.arcTo(0, 0, size, 0, r);
    g.closePath();
    g.fill();
    g.fillStyle = LABEL_FG;
    g.font = 'bold 46px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
