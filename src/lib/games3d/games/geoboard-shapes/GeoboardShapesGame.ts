import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import {
  createGeoboardGenerator,
  shoelaceArea,
  GRID_SIZE,
  GRID_MAX,
  type GeoboardProblem,
  type PegVertex,
} from './problems';

// Theme: a wooden GEOBOARD — a dark plank studded with a 5×5 grid of pegs. The
// child stretches a bright coloured rubber band over the pegs (tap a peg to add
// it as the next corner; the band redraws through the corners and closes back to
// the first) to enclose a shape with a TARGET AREA. Tapping the most-recently
// added peg again undoes it. Many different shapes share the same area — that is
// the lesson (area on a grid via counting squares / the shoelace formula).
//
// Coords: peg grid gx,gy ∈ 0..GRID_MAX, spacing 1 world unit, centred on the
// origin (so gx=0 → x=-2, gx=GRID_MAX → x=+2). A straight-on locked camera keeps
// pointer→world monotonic so peg picking is natural.
const SPACING = 1.0; // world units between adjacent pegs
const HALF = (GRID_MAX * SPACING) / 2; // 2 — half the board extent (pegs span -2..2)
const PEG_RADIUS = 0.12;
const PEG_HEIGHT = 0.34; // how far a peg stands out of the board (+z)
const PEG_Z = PEG_HEIGHT / 2;
const VERTEX_RADIUS = 0.2; // bright marker dropped on a chosen peg
const VERTEX_Z = PEG_HEIGHT + 0.04;
const BAND_RADIUS = 0.07; // thickness of the rubber-band segments
const BAND_Z = PEG_HEIGHT - 0.02; // band rides near the peg tops
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Palette: dark wooden plank for strong contrast; bright pegs; a vivid coral band
// + sun-yellow corner markers that pop against the board (§12 contrast).
const BOARD_COLOR = 0x4a3422; // dark walnut plank
const PEG_COLOR = PALETTE.cream; // pale pegs stand out on the dark board
const BAND_COLOR = PALETTE.coral; // the stretched rubber band
const VERTEX_COLOR = PALETTE.sun; // bright corner markers
const FILL_COLOR = PALETTE.sky; // faint translucent fill of the enclosed shape

/** World position (x,y) for a peg at grid coords. gy=0 is the BOTTOM row → lowest y. */
function pegX(gx: number): number {
  return gx * SPACING - HALF;
}
function pegY(gy: number): number {
  return gy * SPACING - HALF;
}

export const geoboardShapesGame: Game3D = {
  meta: {
    id: 'geoboard-shapes',
    i18nKey: 'games3d.geoboard',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera (drag/tap-x → world-x, -y → world-y, monotonic).
    // The board's binding extent is its WIDTH (GRID_MAX = 4 units); fit it with a
    // little margin under the 60° vertical FOV.
    const D = HALF / Math.tan(Math.PI / 6) + 2.6;
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, D), new THREE.Vector3(0, 0, 0));

    // Content is centred on the origin and spans y ∈ [-2, 2] (above AND below 0),
    // so ground MUST be off or the clay floor plane would occlude the lower pegs.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe4ff',
      bottomColor: '#ffe9cf',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createGeoboardGenerator();
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

    // ---- Shared, reused resources (ONE geometry/material per visual kind) ----
    // Wooden plank behind the pegs (dark → strong contrast for band + pegs).
    const boardSize = GRID_MAX * SPACING + 1.2;
    const boardGeo = roundedBox(boardSize, boardSize, 0.5, 0.25, 4);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.9, metalness: 0.02 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 0, -0.3);
    board.scale.setScalar(1); // static prop → explicit scale, never popIn (§13c)
    board.receiveShadow = true;
    ctx.scene.add(board);

    // Pegs: one cylinder geo + one material, instanced as separate meshes so each
    // can carry userData.peg for picking. Cylinder axis is Y by default; rotate to
    // stand along +Z (out of the board toward the camera).
    const pegGeo = new THREE.CylinderGeometry(PEG_RADIUS, PEG_RADIUS, PEG_HEIGHT, 12);
    const pegMat = new THREE.MeshStandardMaterial({ color: PEG_COLOR, roughness: 0.5, metalness: 0.05 });

    // Corner markers (chosen pegs) + rubber-band segments share geo/mat each.
    const vertexGeo = new THREE.SphereGeometry(VERTEX_RADIUS, 16, 16);
    const vertexMat = new THREE.MeshStandardMaterial({
      color: VERTEX_COLOR,
      roughness: 0.35,
      metalness: 0.1,
      emissive: VERTEX_COLOR,
      emissiveIntensity: 0.3,
    });
    // Unit-length band segment along +Y; we scale Y to the segment length and
    // orient it between two vertices. ONE geometry reused for every segment.
    const bandGeo = new THREE.CylinderGeometry(BAND_RADIUS, BAND_RADIUS, 1, 10);
    const bandMat = new THREE.MeshStandardMaterial({
      color: BAND_COLOR,
      roughness: 0.4,
      metalness: 0.05,
      emissive: BAND_COLOR,
      emissiveIntensity: 0.25,
    });
    // Faint translucent fill of the enclosed polygon (rebuilt each change; its
    // geometry is the ONLY per-rebuild allocation → disposed every rebuild, §13b).
    const fillMat = new THREE.MeshBasicMaterial({
      color: FILL_COLOR,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // ---- Groups — EVERYTHING added to the scene via these (paranoid visibility) ----
    const pegGroup = new THREE.Group(); // static pegs (interactive, carry userData.peg)
    const vertexGroup = new THREE.Group(); // bright markers on chosen pegs
    const bandGroup = new THREE.Group(); // rubber-band segments (rebuilt on change)
    pegGroup.scale.setScalar(1);
    vertexGroup.scale.setScalar(1);
    bandGroup.scale.setScalar(1);
    ctx.scene.add(pegGroup);
    ctx.scene.add(bandGroup);
    ctx.scene.add(vertexGroup);

    // The faint fill mesh lives outside the band group; its geometry is swapped on
    // each rebuild and disposed so it never leaks.
    let fillMesh: THREE.Mesh | null = null;
    let fillGeo: THREE.BufferGeometry | null = null;

    // ---- Game state ----
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as GeoboardProblem,
      vertices: [] as PegVertex[], // tapped pegs, in order
      streak: 0,
      answered: 0,
    };

    function currentArea(): number {
      return shoelaceArea(state.vertices);
    }

    function showPrompt(): void {
      // TASK ONLY — the target area, nothing that reveals success.
      ctx.prompt.set(ctx.t('geoboard.prompt', { area: state.problem.targetArea }));
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

    /** Build the static pegs once. Each peg carries userData.peg = {gx,gy}. */
    function buildPegs(): void {
      pegGroup.clear();
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const peg = new THREE.Mesh(pegGeo, pegMat);
          peg.rotation.x = Math.PI / 2; // stand the cylinder along +Z
          peg.position.set(pegX(gx), pegY(gy), PEG_Z);
          peg.castShadow = true;
          peg.scale.setScalar(1); // static prop → explicit scale (§13c)
          peg.userData.peg = { gx, gy } as PegVertex;
          pegGroup.add(peg);
        }
      }
    }

    /**
     * Rebuild the rubber band + corner markers + faint fill from the current
     * vertices. Cheap: clears the groups (shared geo/mat persist — no leak) and
     * re-adds scaled band segments + marker spheres. The ONLY per-rebuild geometry
     * allocation is the translucent fill shape, which is disposed first so it never
     * leaks (§13b/§13c). Markers are uniform-scale → popIn on the new ones is safe.
     */
    function rebuildBand(popNew: boolean): void {
      // Reset any in-flight marker/band tweens before re-laying them out so a
      // stopped popIn can never leave a marker stuck at scale≈0 (§13c).
      stopAllTweens();
      const verts = state.vertices;

      // --- corner markers (one bright sphere per chosen peg) ---
      vertexGroup.clear();
      verts.forEach((v, i) => {
        const marker = new THREE.Mesh(vertexGeo, vertexMat);
        marker.position.set(pegX(v.gx), pegY(v.gy), VERTEX_Z);
        marker.castShadow = true;
        marker.scale.setScalar(1);
        // popIn only the newest marker (uniform scale on its own mesh → safe).
        if (popNew && i === verts.length - 1) track(popIn(marker, { scale: 1 }));
        vertexGroup.add(marker);
      });

      // --- band segments (closed loop through the vertices in tap order) ---
      bandGroup.clear();
      const n = verts.length;
      // Draw segments between consecutive vertices; close the loop only with ≥ 3.
      const segCount = n >= 3 ? n : n - 1; // n=2 → one open segment; n<2 → none
      for (let i = 0; i < segCount; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % n];
        const ax = pegX(a.gx);
        const ay = pegY(a.gy);
        const bx = pegX(b.gx);
        const by = pegY(b.gy);
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) continue;
        const seg = new THREE.Mesh(bandGeo, bandMat);
        // bandGeo is a unit cylinder along +Y → scale Y to len, rotate to face (dx,dy).
        seg.scale.set(1, len, 1);
        seg.position.set((ax + bx) / 2, (ay + by) / 2, BAND_Z);
        // angle from +Y axis to the segment direction; rotate about +Z.
        seg.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
        bandGroup.add(seg);
      }

      // --- faint translucent fill (only for a real polygon, ≥ 3 verts) ---
      if (fillMesh) {
        ctx.scene.remove(fillMesh);
        fillMesh = null;
      }
      if (fillGeo) {
        fillGeo.dispose(); // dispose previous rebuild's geometry — never leak (§14)
        fillGeo = null;
      }
      if (n >= 3) {
        const shape = new THREE.Shape();
        verts.forEach((v, i) => {
          const x = pegX(v.gx);
          const y = pegY(v.gy);
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        });
        shape.closePath();
        fillGeo = new THREE.ShapeGeometry(shape);
        fillMesh = new THREE.Mesh(fillGeo, fillMat);
        fillMesh.position.z = PEG_HEIGHT - 0.06;
        ctx.scene.add(fillMesh);
      }
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          // A live AREA readout pill (default variant) — NOT in the prompt (§11/§12).
          // It reflects progress only; it never says whether the target is met.
          id: 'area-readout',
          label: `${ctx.t('controls.area')}: ${currentArea()}`,
          onPress: () => {},
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetBand,
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

    /** Append a peg as the next vertex, OR undo it if it is the most-recent one. */
    function tapPeg(gx: number, gy: number): void {
      const verts = state.vertices;
      const last = verts[verts.length - 1];
      if (last && last.gx === gx && last.gy === gy) {
        // tap the most-recently-added vertex again → UNDO it.
        state.vertices = verts.slice(0, -1);
        rebuildBand(false);
      } else {
        // append (allow revisiting earlier pegs only as a NEW corner is not useful;
        // appending the same peg as the immediate last is the undo case above).
        state.vertices = [...verts, { gx, gy }];
        rebuildBand(true);
      }
      ctx.audio.play('click');
      setControls(); // refresh the live area readout
    }

    function resetBand(): void {
      if (state.vertices.length === 0) return;
      state.vertices = [];
      rebuildBand(false);
      ctx.audio.play('click');
      setControls();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('geoboard.correct', { area: state.problem.targetArea }));
      // Punch the band + markers (uniform-scale groups → safe) so the shape reacts.
      track(punch(bandGroup, 0.16));
      track(punch(vertexGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      // Reveal the computed area vs target in the toast (helps the child correct).
      ctx.feedback.wrong(
        ctx.t('geoboard.wrong', { area: currentArea(), target: state.problem.targetArea })
      );
      track(shake(bandGroup, 0.08, 280));
      track(shake(vertexGroup, 0.08, 280));
    }

    function startNewProblem(): void {
      state.problem = quiz ? quiz.state().current : generator.next();
      state.vertices = [];
      rebuildBand(false);
      showPrompt();
      setControls();
      showStatus();
    }

    function confirm(): void {
      const answer = state.vertices;
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

      // Practice: correct → score + next problem; wrong → KEEP the shape to fix it.
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

    /** Identify the peg under a picked object (the peg mesh carries userData.peg). */
    function pegFromPicked(picked: THREE.Object3D | null): PegVertex | null {
      const peg = picked?.userData?.peg as PegVertex | undefined;
      if (!peg) return null;
      return peg;
    }

    // TAP a peg → place / undo the corner. (Markers/band sit above the pegs but the
    // pegs are the picked targets; markers carry no userData so a tap falls through
    // to the peg beneath — which is fine since picking returns the nearest with
    // userData via this lookup.)
    const offTap = ctx.input.on('tap', (p) => {
      const peg = pegFromPicked(p.picked ?? null);
      if (!peg) return;
      tapPeg(peg.gx, peg.gy);
    });

    buildPegs();
    rebuildBand(false);
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

        // Remove the per-rebuild fill mesh + its geometry (the only one allocated
        // per change) so nothing leaks.
        if (fillMesh) ctx.scene.remove(fillMesh);
        if (fillGeo) fillGeo.dispose();

        pegGroup.clear();
        vertexGroup.clear();
        bandGroup.clear();
        ctx.scene.remove(pegGroup);
        ctx.scene.remove(vertexGroup);
        ctx.scene.remove(bandGroup);
        ctx.scene.remove(board);

        boardGeo.dispose();
        boardMat.dispose();
        pegGeo.dispose();
        pegMat.dispose();
        vertexGeo.dispose();
        vertexMat.dispose();
        bandGeo.dispose();
        bandMat.dispose();
        fillMat.dispose();
      },
    };
  },
};
