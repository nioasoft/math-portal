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
  tweenTo,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
import {
  createTangramGenerator,
  SHAPE_IDS,
  type TangramProblem,
  type ShapeId,
  type Assignment,
} from './problems';

// Theme: a TANGRAM BOARD. A dark wooden board fills the upper area showing six
// faint "ghost" outline SLOTS — one per piece, each a tinted hint of the shape +
// colour it needs. Six saturated coloured pieces (large/medium/small triangles,
// a square, a parallelogram and a trapezoid) start scattered in a tray along the
// bottom. The child TAPS a piece to pick it up (it lifts toward the screen and
// glows), then TAPS the matching ghost outline to drop it into place (it slides
// onto the slot). Tapping a placed piece re-selects it so it can be moved. Reset
// returns every piece to the tray; בדוק checks. Pieces and slots are flat 2D
// polygons (THREE.Shape + ShapeGeometry, Context7-verified) facing a straight-on
// locked camera so pointer→world stays monotonic and picking is unambiguous.
// Procedural geometry only.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Z layering (front-facing scene at the XY plane, camera on +Z looking at origin).
const BOARD_Z = -0.25; // dark board sits behind everything
const SLOT_Z = -0.05; // ghost outlines just in front of the board
const PIECE_Z = 0.0; // resting pieces (tray + placed) sit on the play plane
const LIFT_Z = 0.6; // a selected piece lifts toward the camera

// Vertical bands: figure up top, tray along the bottom — both fully in view.
const FIGURE_CENTER_Y = 1.95;
const TRAY_Y = -3.05;
const TRAY_SPAN = 9.2; // horizontal span of the six tray slots

// One saturated colour per piece (each shape is visually unique in shape AND hue).
const PIECE_COLORS: Record<ShapeId, number> = {
  largeTriangle: PALETTE.coral,
  mediumTriangle: PALETTE.sky,
  smallTriangle: PALETTE.mint,
  square: PALETTE.sun,
  parallelogram: PALETTE.grape,
  trapezoid: 0xf08a3c, // distinct warm orange
};

// Board + ghost tones (dark board → bright pieces + faint tinted ghost outlines).
const BOARD_COLOR = 0x36304f; // dark slab: strong contrast vs light clay + pieces
const TRAY_COLOR = 0x2b2640; // darker tray strip under the loose pieces

/**
 * Build a flat 2D polygon for a shape, CENTERED at its own local origin so the
 * mesh positions cleanly and lift/snap tweens move it about its centre. Returns
 * a fresh ShapeGeometry the caller owns (disposed on teardown). The six shapes
 * are deliberately distinct in outline so each maps to exactly one ghost slot.
 */
function makeShapeGeometry(id: ShapeId): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  switch (id) {
    case 'largeTriangle': {
      // Big right-ish triangle (apex up), ~1.6 tall.
      shape.moveTo(0, 0.95);
      shape.lineTo(-1.05, -0.8);
      shape.lineTo(1.05, -0.8);
      shape.closePath();
      break;
    }
    case 'mediumTriangle': {
      // Medium triangle, apex DOWN (distinct orientation from the others).
      shape.moveTo(0, -0.85);
      shape.lineTo(-0.85, 0.65);
      shape.lineTo(0.85, 0.65);
      shape.closePath();
      break;
    }
    case 'smallTriangle': {
      // Small triangle, apex up.
      shape.moveTo(0, 0.65);
      shape.lineTo(-0.62, -0.45);
      shape.lineTo(0.62, -0.45);
      shape.closePath();
      break;
    }
    case 'square': {
      const h = 0.72; // half-side
      shape.moveTo(-h, -h);
      shape.lineTo(h, -h);
      shape.lineTo(h, h);
      shape.lineTo(-h, h);
      shape.closePath();
      break;
    }
    case 'parallelogram': {
      // Slanted parallelogram (clearly not a rectangle).
      shape.moveTo(-1.05, -0.55);
      shape.lineTo(0.45, -0.55);
      shape.lineTo(1.05, 0.55);
      shape.lineTo(-0.45, 0.55);
      shape.closePath();
      break;
    }
    case 'trapezoid': {
      // Symmetric trapezoid (wide bottom, narrow top).
      shape.moveTo(-1.0, -0.5);
      shape.lineTo(1.0, -0.5);
      shape.lineTo(0.5, 0.55);
      shape.lineTo(-0.5, 0.55);
      shape.closePath();
      break;
    }
  }
  return new THREE.ShapeGeometry(shape);
}

/** Target slot position (centre) for each shape, composing a balanced figure. */
const SLOT_POS: Record<ShapeId, [number, number]> = {
  largeTriangle: [-2.4, FIGURE_CENTER_Y + 0.4],
  mediumTriangle: [2.4, FIGURE_CENTER_Y + 0.4],
  smallTriangle: [0, FIGURE_CENTER_Y + 1.0],
  square: [0, FIGURE_CENTER_Y - 0.7],
  parallelogram: [-2.4, FIGURE_CENTER_Y - 1.0],
  trapezoid: [2.4, FIGURE_CENTER_Y - 1.0],
};

export const tangramBuildGame: Game3D = {
  meta: {
    id: 'tangram-build',
    i18nKey: 'games3d.tangram',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [2, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera: content spans width ≈ 9.4 (tray) and y ∈ roughly
    // [-3.6, 3.4]. Fit the WIDTH with margin so the figure + tray both sit centred
    // and fully in view; pointer-x → world-x stays monotonic (no inversion).
    const halfWidth = 5.3;
    const aspect = 1.4;
    const D = halfWidth / aspect / Math.tan(Math.PI / 6) + 3.0;
    ctx.presets.camera.locked(new THREE.Vector3(0, -0.2, D), new THREE.Vector3(0, -0.2, 0));

    // All content sits in the XY plane (a flat board) — keep the clay ground OFF
    // so the horizontal ground plane never occludes the front-facing scene.
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7ddff',
      bottomColor: '#ffe9cf',
      ground: false,
      shadowArea: 16,
      fog: false,
    });

    const generator = createTangramGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    type AnyTween = Tween<{ s: number }> | Tween<{ v: number }> | Tween<{ t: number }>;
    const liveTweens = new Set<AnyTween>();
    function track(t: AnyTween): void {
      liveTweens.add(t);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Dark board behind the figure (contrast + frames the play area) ----
    const boardGeo = roundedBox(8.6, 5.0, 0.4, 0.25, 3);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.92, metalness: 0.03 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, FIGURE_CENTER_Y, BOARD_Z);
    board.scale.setScalar(1); // static prop: explicit scale, never popIn (§13c)
    board.receiveShadow = true;
    // Decorative only: exclude from the tap raycast so taps pass THROUGH to the
    // ghost slots / pieces in front of it. The board's box front face (z≈-0.05) is
    // coplanar with the ghost slots (SLOT_Z), so without this the topmost hit is the
    // opaque board (no userData.slotId) and pieces can never be placed.
    board.raycast = () => {};
    ctx.scene.add(board);

    // ---- Tray strip under the loose pieces ----
    const trayGeo = roundedBox(TRAY_SPAN + 1.0, 1.9, 0.3, 0.2, 3);
    const trayMat = new THREE.MeshStandardMaterial({ color: TRAY_COLOR, roughness: 0.92, metalness: 0.03 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, TRAY_Y, BOARD_Z);
    tray.scale.setScalar(1);
    tray.receiveShadow = true;
    // Decorative only: exclude from the tap raycast (same reason as the board) so
    // taps reach the tray pieces in front of it.
    tray.raycast = () => {};
    ctx.scene.add(tray);

    // ---- Per-shape geometry (one ShapeGeometry per kind, shared by piece + ghost) ----
    const shapeGeos: Record<ShapeId, THREE.ShapeGeometry> = {
      largeTriangle: makeShapeGeometry('largeTriangle'),
      mediumTriangle: makeShapeGeometry('mediumTriangle'),
      smallTriangle: makeShapeGeometry('smallTriangle'),
      square: makeShapeGeometry('square'),
      parallelogram: makeShapeGeometry('parallelogram'),
      trapezoid: makeShapeGeometry('trapezoid'),
    };

    // Solid saturated piece materials (one per kind) — DoubleSide so flat polys
    // always face the camera regardless of winding.
    const pieceMats: Record<ShapeId, THREE.MeshStandardMaterial> = {} as Record<ShapeId, THREE.MeshStandardMaterial>;
    // Faint tinted ghost materials (one per kind) — transparent + low opacity so
    // the outline hints the colour without competing with the solid pieces.
    const ghostMats: Record<ShapeId, THREE.MeshStandardMaterial> = {} as Record<ShapeId, THREE.MeshStandardMaterial>;
    for (const id of SHAPE_IDS) {
      pieceMats[id] = new THREE.MeshStandardMaterial({
        color: PIECE_COLORS[id],
        roughness: 0.55,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      ghostMats[id] = new THREE.MeshStandardMaterial({
        color: PIECE_COLORS[id],
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
    }

    // ---- Ghost slots (static outlines at their target positions) ----
    const slotGroup = new THREE.Group();
    slotGroup.scale.setScalar(1);
    ctx.scene.add(slotGroup);
    const slotMeshes = new Map<ShapeId, THREE.Mesh>();
    for (const id of SHAPE_IDS) {
      const ghost = new THREE.Mesh(shapeGeos[id], ghostMats[id]);
      const [gx, gy] = SLOT_POS[id];
      ghost.position.set(gx, gy, SLOT_Z);
      ghost.scale.setScalar(1); // static — explicit scale, never popIn (§13c)
      ghost.userData.slotId = id; // tapping the ghost = choosing this slot
      slotGroup.add(ghost);
      slotMeshes.set(id, ghost);
    }

    // ---- Piece meshes (the loose coloured shapes) ----
    const pieceGroup = new THREE.Group();
    pieceGroup.scale.setScalar(1);
    ctx.scene.add(pieceGroup);
    const pieceMeshes = new Map<ShapeId, THREE.Mesh>();
    const trayX = new Map<ShapeId, number>(); // home x in the tray for each piece

    // assignment maps slotId → pieceId placed there (absent/null = slot empty).
    const assignment: Assignment = {};
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as TangramProblem,
      selectedId: null as ShapeId | null, // currently lifted piece
      streak: 0,
      answered: 0,
    };

    /** Tray home x for the i-th piece of n (evenly spread, centred). */
    function trayHomeX(i: number, n: number): number {
      if (n <= 1) return 0;
      return -TRAY_SPAN / 2 + (TRAY_SPAN * i) / (n - 1);
    }

    /** The slot a given piece is currently placed in, or null if it's in the tray. */
    function slotOfPiece(pieceId: ShapeId): ShapeId | null {
      for (const slotId of SHAPE_IDS) {
        if (assignment[slotId] === pieceId) return slotId;
      }
      return null;
    }

    /** Resting (lowered) position for a piece given its current placement. */
    function restingPos(pieceId: ShapeId): THREE.Vector3 {
      const slotId = slotOfPiece(pieceId);
      if (slotId) {
        const [sx, sy] = SLOT_POS[slotId];
        return new THREE.Vector3(sx, sy, PIECE_Z);
      }
      return new THREE.Vector3(trayX.get(pieceId) ?? 0, TRAY_Y, PIECE_Z);
    }

    /** Animate a piece to a position via a tracked POSITION tween (never scale). */
    function moveTo(mesh: THREE.Mesh, to: THREE.Vector3, ms = 300): void {
      const fromX = mesh.position.x;
      const fromY = mesh.position.y;
      const fromZ = mesh.position.z;
      track(
        tweenTo(0, 1, ms, (k) => {
          mesh.position.set(
            fromX + (to.x - fromX) * k,
            fromY + (to.y - fromY) * k,
            fromZ + (to.z - fromZ) * k
          );
        })
      );
    }

    /** Drop the glow + lift from a piece (back to its resting position). */
    function deselectVisual(pieceId: ShapeId): void {
      const mesh = pieceMeshes.get(pieceId);
      if (!mesh) return;
      pieceMats[pieceId].emissiveIntensity = 0;
      const rest = restingPos(pieceId);
      mesh.position.set(rest.x, rest.y, PIECE_Z);
    }

    /** Glow + lift a piece toward the camera (lift via Z, not scale — popIn/punch stay safe). */
    function selectVisual(pieceId: ShapeId): void {
      const mesh = pieceMeshes.get(pieceId);
      if (!mesh) return;
      const mat = pieceMats[pieceId];
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.4;
      mesh.position.z = LIFT_Z;
      track(punch(mesh, 0.12)); // uniform punch — pieces use uniform scale
    }

    /** (Re)place all pieces into the tray (initial layout / reset). */
    function layoutTray(animate: boolean): void {
      const n = SHAPE_IDS.length;
      SHAPE_IDS.forEach((id, i) => {
        const mesh = pieceMeshes.get(id);
        if (!mesh) return;
        const x = trayHomeX(i, n);
        trayX.set(id, x);
        if (animate) {
          moveTo(mesh, new THREE.Vector3(x, TRAY_Y, PIECE_Z));
        } else {
          mesh.position.set(x, TRAY_Y, PIECE_Z);
        }
        pieceMats[id].emissiveIntensity = 0;
      });
    }

    // Build the six pieces once (a fixed set — never rebuilt per round).
    SHAPE_IDS.forEach((id, i) => {
      const mesh = new THREE.Mesh(shapeGeos[id], pieceMats[id]);
      const x = trayHomeX(i, SHAPE_IDS.length);
      trayX.set(id, x);
      mesh.position.set(x, TRAY_Y, PIECE_Z);
      mesh.castShadow = true;
      mesh.userData.pieceId = id; // pick target → piece id
      pieceGroup.add(mesh);
      pieceMeshes.set(id, mesh);
      track(popIn(mesh, { delay: i * 45, scale: 1 }));
    });

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('tangram.prompt')); // TASK ONLY — reveals nothing
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

    /** Clear all placements + selection and return every piece to the tray. */
    function resetAll(): void {
      for (const k of Object.keys(assignment)) delete assignment[k as ShapeId];
      state.selectedId = null;
      layoutTray(true);
      ctx.audio.play('click');
    }

    function startNewProblem(): void {
      state.problem = quiz ? quiz.state().current : generator.next();
      // Same fixed figure — just clear placements so the child re-assembles it.
      for (const k of Object.keys(assignment)) delete assignment[k as ShapeId];
      state.selectedId = null;
      layoutTray(true);
      showPrompt();
      showStatus();
    }

    /** Select a piece (toggle). Deselects the previous one's glow/lift first. */
    function selectPiece(pieceId: ShapeId): void {
      const prev = state.selectedId;
      if (prev != null) deselectVisual(prev);
      if (prev === pieceId) {
        state.selectedId = null; // tapping the lifted piece again → put it down
      } else {
        state.selectedId = pieceId;
        selectVisual(pieceId);
      }
      ctx.audio.play('click');
    }

    /** Place the selected piece into a slot (records the assignment + animates it). */
    function placeIntoSlot(slotId: ShapeId): void {
      const pieceId = state.selectedId;
      if (pieceId == null) return;
      // If this piece was already in another slot, vacate that slot first.
      const prevSlot = slotOfPiece(pieceId);
      if (prevSlot) delete assignment[prevSlot];
      // If the target slot held a DIFFERENT piece, bump that piece back to the tray.
      const occupant = assignment[slotId];
      if (occupant && occupant !== pieceId) {
        delete assignment[slotId];
      }
      assignment[slotId] = pieceId;
      pieceMats[pieceId].emissiveIntensity = 0;
      state.selectedId = null;
      const [sx, sy] = SLOT_POS[slotId];
      const mesh = pieceMeshes.get(pieceId);
      if (mesh) moveTo(mesh, new THREE.Vector3(sx, sy, PIECE_Z));
      // Re-home any piece that got bumped out of this slot.
      if (occupant && occupant !== pieceId) {
        const om = pieceMeshes.get(occupant);
        if (om) moveTo(om, new THREE.Vector3(trayX.get(occupant) ?? 0, TRAY_Y, PIECE_Z));
      }
      ctx.audio.play('click');
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetAll,
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

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('tangram.correct'));
      // Punch each placed piece (uniform punch — safe on uniform-scaled meshes).
      for (const mesh of pieceMeshes.values()) track(punch(mesh, 0.16));
      celebrate();
    }

    /** Flash the empty or mismatched slots so the child sees what to fix. */
    function flashWrong(): void {
      for (const slotId of SHAPE_IDS) {
        const placed = assignment[slotId];
        if (placed !== slotId) {
          const ghost = slotMeshes.get(slotId);
          if (ghost) track(shake(ghost, 0.1, 260));
        }
      }
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('tangram.wrong'));
      track(shake(pieceGroup, 0.05, 280));
      flashWrong();
    }

    function confirm(): void {
      const answer: Assignment = { ...assignment };
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
        startNewProblem();
        return;
      }

      // Practice: correct → score + fresh figure; wrong → KEEP the layout to fix.
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

    // TAP handling: a piece → select/lift it; a slot ghost → place the selected piece.
    const offTap = ctx.input.on('tap', (p) => {
      const picked = p.picked ?? null;
      const pieceId = picked?.userData?.pieceId as ShapeId | undefined;
      if (pieceId && (SHAPE_IDS as readonly string[]).includes(pieceId)) {
        selectPiece(pieceId);
        return;
      }
      const slotId = picked?.userData?.slotId as ShapeId | undefined;
      if (slotId && (SHAPE_IDS as readonly string[]).includes(slotId)) {
        placeIntoSlot(slotId);
      }
    });

    showPrompt();
    setControls();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offTap();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        pieceGroup.clear();
        slotGroup.clear();
        pieceMeshes.clear();
        slotMeshes.clear();
        ctx.scene.remove(pieceGroup);
        ctx.scene.remove(slotGroup);
        ctx.scene.remove(board);
        ctx.scene.remove(tray);

        for (const id of SHAPE_IDS) {
          shapeGeos[id].dispose();
          pieceMats[id].dispose();
          ghostMats[id].dispose();
        }
        boardGeo.dispose();
        boardMat.dispose();
        trayGeo.dispose();
        trayMat.dispose();
      },
    };
  },
};
