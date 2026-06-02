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
  createShapeSortGenerator,
  binFor,
  type ShapeSortProblem,
  type Solid,
  type SolidKind,
  type Bin,
  type Assignments,
} from './problems';

// Theme: a classroom SORTING TABLE. A row of real procedural 3D solids (sphere,
// cylinder, cone, cube, square pyramid, box) sits along the top. Two labelled
// bins sit below: "Rolls" (curved surface) on the left and "Doesn't roll"
// (flat faces only) on the right. The child TAPS a solid to pick it up (it lifts
// and glows), then TAPS a bin to drop it in (it slides into the bin). Tapping a
// binned solid re-selects it so it can be moved. Reset returns every solid to
// the start row; בדוק checks. Teaches a property of 3D solids: curved-surface
// (rolls) vs flat-faces-only (doesn't roll). Straight-on locked camera keeps
// pointer→world monotonic so picking is unambiguous. Procedural geometry only.

const SOLID_SCALE = 0.62; // shared base size for every solid (kept comparable)
const ROW_Y = 3.3; // y of the start-row solids
const ROW_SPAN = 8.4; // total horizontal span of the start row
const BIN_Y = 1.0; // y of the bin floors / where solids settle in a bin
const BIN_HALF_W = 2.55; // half-width of a bin's catch zone
const BIN_DEPTH_Z = 0.0; // bins centred on z=0 (front-facing scene)
const LIFT_Y = 0.55; // how far a selected solid lifts
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Bin world centres (left = roll, right = flat). Everything stays above y=0.
const BIN_CENTERS: Record<Bin, number> = { roll: -2.9, flat: 2.9 };

// Palette: saturated solids on a darker table; bins are dark slabs with bright
// labels so the two categories read clearly against the light clay background.
const TABLE_COLOR = 0x4a4068; // dark sorting-table slab (contrast + frames content)
const BIN_COLOR = 0x2f2a45; // dark bin body (label pops on it)
const BIN_RIM_ROLL = PALETTE.sky; // left bin accent rim
const BIN_RIM_FLAT = PALETTE.coral; // right bin accent rim
const LABEL_FG = '#ffffff';
const LABEL_BG = '#2f2a45';

// One saturated colour per solid kind so each shape reads as distinct.
const SOLID_COLORS: Record<SolidKind, number> = {
  sphere: PALETTE.coral,
  cylinder: PALETTE.sun,
  cone: PALETTE.grape,
  cube: PALETTE.mint,
  pyramid: PALETTE.sky,
  box: 0xe07a9a,
};

/**
 * Build the geometry for a solid kind (procedural — no asset files). ConeGeometry
 * with 4 radial segments yields a square pyramid (Context7-verified params:
 * radius, height, radialSegments). Returns a fresh BufferGeometry the caller owns.
 */
function makeSolidGeometry(kind: SolidKind): THREE.BufferGeometry {
  switch (kind) {
    case 'sphere':
      return new THREE.SphereGeometry(0.62, 28, 20);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1.1, 28);
    case 'cone':
      return new THREE.ConeGeometry(0.6, 1.2, 28);
    case 'cube':
      return roundedBox(1.0, 1.0, 1.0, 0.08, 3);
    case 'pyramid':
      return new THREE.ConeGeometry(0.78, 1.15, 4); // 4 sides = square pyramid
    case 'box':
      return roundedBox(1.25, 0.7, 0.85, 0.06, 3);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/** Render a bin label onto a CanvasTexture (white text on a dark slab). */
function makeLabelTexture(text: string): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = LABEL_BG;
    g.fillRect(0, 0, w, h);
    g.fillStyle = LABEL_FG;
    g.font = 'bold 70px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const shapeSort3DGame: Game3D = {
  meta: {
    id: 'shape-sort-3d',
    i18nKey: 'games3d.shapeSort',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [2, 4],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on, slightly elevated locked camera: drag/tap-x → world-x is
    // monotonic (no inversion), and the small elevation lets the bins read as
    // containers while keeping picking stable. Content spans width ≈ 9 units and
    // y ∈ [~0.5, ~3.9], all above y=0. Fit the WIDTH with margin.
    const halfWidth = 4.9;
    const aspect = 1.4;
    const D = halfWidth / aspect / Math.tan(Math.PI / 6) + 3.2;
    ctx.presets.camera.locked(new THREE.Vector3(0, 2.0, D), new THREE.Vector3(0, 1.9, 0));

    // All content sits above y=0 → keep the clay ground OFF so it never occludes.
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7ddff',
      bottomColor: '#ffe9cf',
      ground: false,
      shadowArea: 14,
      fog: false,
    });

    const generator = createShapeSortGenerator();
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

    // ---- Shared, reused materials (one per visual kind) ----
    const solidMats: Record<SolidKind, THREE.MeshStandardMaterial> = {
      sphere: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.sphere, roughness: 0.5, metalness: 0.04 }),
      cylinder: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.cylinder, roughness: 0.5, metalness: 0.04 }),
      cone: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.cone, roughness: 0.5, metalness: 0.04 }),
      cube: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.cube, roughness: 0.6, metalness: 0.03 }),
      pyramid: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.pyramid, roughness: 0.6, metalness: 0.03 }),
      box: new THREE.MeshStandardMaterial({ color: SOLID_COLORS.box, roughness: 0.6, metalness: 0.03 }),
    };

    // Per-problem solid geometries are tracked here so each rebuild disposes the
    // previous ones (different problems use different kinds — no leak).
    let solidGeos: THREE.BufferGeometry[] = [];

    // ---- Sorting table (dark slab behind/under everything) ----
    const tableGeo = roundedBox(11.0, 0.5, 2.4, 0.25, 3);
    const tableMat = new THREE.MeshStandardMaterial({ color: TABLE_COLOR, roughness: 0.92, metalness: 0.03 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.25, -0.4);
    table.scale.setScalar(1); // static prop: explicit scale, never popIn (§13c)
    table.receiveShadow = true;
    ctx.scene.add(table);

    // ---- Two labelled bins ----
    const binBodyGeo = roundedBox(2 * BIN_HALF_W, 1.1, 1.7, 0.16, 3);
    const rimGeo = roundedBox(2 * BIN_HALF_W + 0.18, 0.22, 1.85, 0.1, 2);
    const binBodyMat = new THREE.MeshStandardMaterial({ color: BIN_COLOR, roughness: 0.85, metalness: 0.04 });
    const rimMatRoll = new THREE.MeshStandardMaterial({ color: BIN_RIM_ROLL, roughness: 0.5, metalness: 0.05 });
    const rimMatFlat = new THREE.MeshStandardMaterial({ color: BIN_RIM_FLAT, roughness: 0.5, metalness: 0.05 });
    const labelGeo = new THREE.PlaneGeometry(2.2, 0.7);

    const labelRollTex = makeLabelTexture(ctx.t('shapeSort.binRoll'));
    const labelFlatTex = makeLabelTexture(ctx.t('shapeSort.binFlat'));
    const labelRollMat = new THREE.MeshBasicMaterial({ map: labelRollTex, transparent: true });
    const labelFlatMat = new THREE.MeshBasicMaterial({ map: labelFlatTex, transparent: true });

    const binGroup = new THREE.Group();
    binGroup.scale.setScalar(1);
    ctx.scene.add(binGroup);

    /** Build one bin (dark body + accent rim + label plane), tagged with userData.bin. */
    function makeBin(bin: Bin): void {
      const cx = BIN_CENTERS[bin];
      const body = new THREE.Mesh(binBodyGeo, binBodyMat);
      body.position.set(cx, BIN_Y - 0.55, BIN_DEPTH_Z);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.bin = bin; // tapping the body = choosing this bin
      binGroup.add(body);

      const rim = new THREE.Mesh(rimGeo, bin === 'roll' ? rimMatRoll : rimMatFlat);
      rim.position.set(0, 0.55, 0); // local to body (body is at BIN_Y - 0.55)
      rim.userData.bin = bin;
      body.add(rim);

      const label = new THREE.Mesh(labelGeo, bin === 'roll' ? labelRollMat : labelFlatMat);
      label.position.set(cx, BIN_Y + 0.05, BIN_DEPTH_Z + 0.88);
      label.userData.bin = bin;
      binGroup.add(label);
    }
    makeBin('roll');
    makeBin('flat');

    // ---- Solid meshes (rebuilt per problem) ----
    const solidsGroup = new THREE.Group();
    solidsGroup.scale.setScalar(1);
    ctx.scene.add(solidsGroup);

    // Live per-problem state. assignments maps solidId → bin (absent = in row).
    const meshes = new Map<string, THREE.Mesh>();
    const homeX = new Map<string, number>(); // start-row x for each solid
    const assignments: Assignments = {};
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as ShapeSortProblem,
      selectedId: null as string | null,
      streak: 0,
      answered: 0,
    };

    /** Start-row world x for the i-th solid of n (evenly spread, centred). */
    function rowX(i: number, n: number): number {
      if (n <= 1) return 0;
      return -ROW_SPAN / 2 + (ROW_SPAN * i) / (n - 1);
    }

    /** Target world position for a solid: its home row slot, or a slot inside its bin. */
    function targetFor(id: string, slotInBin: number): THREE.Vector3 {
      const bin = assignments[id];
      if (!bin) {
        return new THREE.Vector3(homeX.get(id) ?? 0, ROW_Y, 0);
      }
      const cx = BIN_CENTERS[bin];
      // Spread up to 3 per row inside the bin so multiple solids don't overlap.
      const col = slotInBin % 3;
      const xOff = (col - 1) * 1.0;
      return new THREE.Vector3(cx + xOff, BIN_Y + 0.45, BIN_DEPTH_Z + 0.1);
    }

    /** Animate a solid to a position via a tracked position tween (NOT scale). */
    function moveTo(mesh: THREE.Mesh, to: THREE.Vector3, ms = 320): void {
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

    /** Resting Y for a solid given its current assignment (row vs bin). */
    function restingY(id: string): number {
      return assignments[id] ? BIN_Y + 0.45 : ROW_Y;
    }

    /** Drop the glow + lift from one solid (back to its resting Y). */
    function deselectVisual(id: string): void {
      const mesh = meshes.get(id);
      if (!mesh) return;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      mesh.position.y = restingY(id);
    }

    /** Glow + lift one solid (lift via Y position, not scale — popIn/punch stay safe). */
    function selectVisual(id: string): void {
      const mesh = meshes.get(id);
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.35;
      mesh.position.y = restingY(id) + LIFT_Y;
      track(punch(mesh, 0.12)); // uniform punch — never resets a non-uniform scale
    }

    /** (Re)build the solid meshes for the current problem; place all in the row. */
    function buildSolids(): void {
      // Dispose previous per-problem geometries before allocating new ones.
      solidGeos.forEach((g) => g.dispose());
      solidGeos = [];
      solidsGroup.clear();
      meshes.clear();
      homeX.clear();
      for (const k of Object.keys(assignments)) delete assignments[k];
      state.selectedId = null;

      const n = state.problem.solids.length;
      state.problem.solids.forEach((solid: Solid, i: number) => {
        const geo = makeSolidGeometry(solid.kind);
        solidGeos.push(geo);
        const mesh = new THREE.Mesh(geo, solidMats[solid.kind]);
        mesh.scale.setScalar(SOLID_SCALE);
        const x = rowX(i, n);
        homeX.set(solid.id, x);
        mesh.position.set(x, ROW_Y, 0);
        mesh.castShadow = true;
        mesh.userData.solidId = solid.id; // pick target → solid id
        solidsGroup.add(mesh);
        meshes.set(solid.id, mesh);
        track(popIn(mesh, { delay: i * 40, scale: SOLID_SCALE }));
      });
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('shapeSort.prompt')); // TASK ONLY — reveals nothing
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
      state.problem = quiz ? quiz.state().current : generator.next();
      buildSolids();
      showPrompt();
      showStatus();
    }

    /** Select a solid (toggle). Deselects the previous one's glow/lift first. */
    function selectSolid(id: string): void {
      const prev = state.selectedId;
      if (prev != null) deselectVisual(prev);
      if (prev === id) {
        state.selectedId = null; // tapping the selected one again → deselect
      } else {
        state.selectedId = id;
        selectVisual(id);
      }
      ctx.audio.play('click');
    }

    /** Drop the currently selected solid into a bin (records + animates it). */
    function dropIntoBin(bin: Bin): void {
      const id = state.selectedId;
      if (id == null) return;
      assignments[id] = bin;
      deselectVisual(id);
      state.selectedId = null;
      // Recompute in-bin slots for everything (keeps spacing tidy).
      reflowAll();
      ctx.audio.play('click');
    }

    /** Reposition every solid to its home/bin slot and clear selection glow. */
    function reflowAll(): void {
      const slotCounters: Record<Bin, number> = { roll: 0, flat: 0 };
      for (const [id, mesh] of meshes) {
        const bin = assignments[id];
        const slot = bin ? slotCounters[bin]++ : 0;
        const to = targetFor(id, slot);
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        moveTo(mesh, to);
      }
    }

    function resetAll(): void {
      for (const k of Object.keys(assignments)) delete assignments[k];
      state.selectedId = null;
      reflowAll();
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
      ctx.feedback.correct(ctx.t('shapeSort.correct'));
      // Punch each sorted solid (uniform punch — safe on uniform-scaled meshes).
      for (const mesh of meshes.values()) track(punch(mesh, 0.16));
      celebrate();
    }

    /** Flash the mis-binned / unassigned solids so the child sees what to fix. */
    function flashWrong(): void {
      for (const solid of state.problem.solids) {
        const assigned = assignments[solid.id];
        const wrong = !assigned || assigned !== binFor(solid.kind);
        if (wrong) {
          const mesh = meshes.get(solid.id);
          if (mesh) track(shake(mesh, 0.12, 260));
        }
      }
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('shapeSort.wrong'));
      track(shake(solidsGroup, 0.05, 280));
      flashWrong();
    }

    function confirm(): void {
      const answer: Assignments = { ...assignments };
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

      // Practice: correct → score + next problem; wrong → KEEP the layout to fix.
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

    // TAP handling: a solid → select it; a bin → drop the selected solid in.
    const offTap = ctx.input.on('tap', (p) => {
      const picked = p.picked ?? null;
      const solidId = picked?.userData?.solidId as string | undefined;
      if (typeof solidId === 'string') {
        selectSolid(solidId);
        return;
      }
      const bin = picked?.userData?.bin as Bin | undefined;
      if (bin === 'roll' || bin === 'flat') {
        dropIntoBin(bin);
      }
    });

    buildSolids();
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

        solidsGroup.clear();
        binGroup.clear();
        meshes.clear();
        ctx.scene.remove(solidsGroup);
        ctx.scene.remove(binGroup);
        ctx.scene.remove(table);

        solidGeos.forEach((g) => g.dispose());
        solidGeos = [];
        Object.values(solidMats).forEach((m) => m.dispose());
        tableGeo.dispose();
        tableMat.dispose();
        binBodyGeo.dispose();
        rimGeo.dispose();
        labelGeo.dispose();
        binBodyMat.dispose();
        rimMatRoll.dispose();
        rimMatFlat.dispose();
        labelRollMat.dispose();
        labelFlatMat.dispose();
        labelRollTex.dispose(); // CanvasTextures are GPU resources
        labelFlatTex.dispose();
      },
    };
  },
};
