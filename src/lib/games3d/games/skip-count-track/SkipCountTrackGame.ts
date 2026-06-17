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
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createSkipCountGenerator,
  MAX_TARGET,
  TILE_MIN,
  type SkipCountProblem,
} from './problems';

// Theme: a SAFARI TRACK across a savanna. Numbered clay tiles (1..target) are
// laid out in a left→right, row-by-row (boustrophedon) path so even the longest
// track (40 tiles) FILLS the viewport instead of running off the side. Each tile
// shows its number on a light plate (dark digits — readable) on its front face.
// A little clay safari ANIMAL waits at tile 0 (the start). TAPPING a tile toggles
// a glowing paw-stone marker on it; the child marks every skip (step, 2·step, …,
// target). On a correct בדוק the animal HOPS from stone to stone in order and
// celebrates. Procedural geometry only — no asset files.
//
// FRAMING: the whole grid is centered on the origin in the XY plane; a straight-on
// locked camera at (0,0,CAM_DIST) sizes the view to fit the grid's width AND
// height with margin. Content sits above y≈0 so applyClayLook uses ground:false
// (no clay plane occluding the tiles). NDC-x ↑ ⇒ world-x ↑ (no inversion), so the
// number layout reads naturally left→right.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Tile grid layout (XY plane facing the locked camera at +Z).
const COLS = 8; // up to 8 tiles per row → at most 5 rows for 40 tiles
const TILE = 1.18; // tile footprint (width = height)
const TILE_DEPTH = 0.45; // a little thickness so tiles read as stepping plates
const GAP = 0.22; // gap between tiles so each reads as its own step
const PITCH = TILE + GAP; // center-to-center spacing
const TILE_Y0 = 0; // tile center height (front faces +Z)

// Glowing paw-stone marker that pops above a tile when it's marked.
const STONE_R = 0.34;
const STONE_LIFT = TILE_DEPTH / 2 + STONE_R + 0.06; // floats just in front of the tile

// Clay safari animal (a simple elephant: body + head + 4 legs + trunk).
const ANIMAL_Z = TILE_DEPTH / 2 + 0.65; // stands in front of the tiles
const ANIMAL_REST_DY = TILE / 2 + 0.55; // animal's body center above a tile center
const HOP_STEP_MS = 300; // duration of one stone-to-stone hop
const HOP_ARC = 0.7; // peak extra height of each hop arc

// Palette — warm savanna. Light readable number plates; marked stones glow a
// vivid amber so marked vs unmarked is unmistakable; a grey clay elephant.
const TILE_UNMARKED = 0xcdb894; // sandy clay tile (unmarked)
const TILE_MARKED = 0xe7a13d; // warmer sand once marked (subtle base shift)
const PLATE_BG = '#f4eee2';
const PLATE_FG = '#2a2118'; // near-black digits on a light plate — high contrast
const STONE_COLOR = PALETTE.sun; // glowing amber paw-stone
const ANIMAL_BODY = 0x8c8f9a; // elephant grey
const ANIMAL_DARK = 0x5f626b; // legs / trunk (a touch darker)

/**
 * Layout for tile value `v` (1..count) as a boustrophedon grid: row 0 is the
 * BOTTOM row laid left→right, row 1 sits above it laid right→left, and so on, so
 * consecutive numbers are always adjacent (a continuous winding path). Returns
 * world x/y centered on the origin for the given total tile count.
 */
function tilePosition(v: number, count: number): { x: number; y: number } {
  const idx = v - TILE_MIN; // 0-based
  const row = Math.floor(idx / COLS);
  let col = idx % COLS;
  if (row % 2 === 1) col = COLS - 1 - col; // odd rows wind back right→left
  const rows = Math.ceil(count / COLS);
  // Width is the widest row (full COLS unless everything fits in one short row).
  const widestCols = Math.min(count, COLS);
  const gridW = (widestCols - 1) * PITCH;
  const gridH = (rows - 1) * PITCH;
  const x = col * PITCH - gridW / 2;
  // Row 0 at the bottom → higher rows go UP (+y); center the stack on the origin.
  const y = row * PITCH - gridH / 2;
  return { x, y };
}

export const skipCountTrackGame: Game3D = {
  meta: {
    id: 'skip-count-track',
    i18nKey: 'games3d.skipCount',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 3],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Camera distance sized to fit the LARGEST possible grid (40 tiles → 5 rows ×
    // 8 cols). Width-bound for the 8-col row; chosen so even the full track fits
    // the central viewport with margin.
    function reframe(): void {
      const f = lockedCameraFrame(5.25, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Warm savanna ambience. No ground plane (tiles sit at y≈0; a clay plane there
    // would occlude them) — the engine still casts the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f5e3b3',
      bottomColor: '#d9a86a',
      ground: false,
      shadowArea: 13,
      fog: false,
    });

    const generator = createSkipCountGenerator();
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
    // Tracked timers (the hop sequence chains setTimeout — cleared on dispose).
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function later(fn: () => void, ms: number): void {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    }
    function clearTimers(): void {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    }

    // ---- Shared, reused resources (one geometry/material per KIND) ----
    // A plain BoxGeometry (NOT roundedBox) so the +Z front face (group index 4)
    // can carry the number plate as a per-face material — roundedBox has a single
    // material group and would silently ignore a per-face array (the spec gotcha).
    const tileGeo = new THREE.BoxGeometry(TILE, TILE, TILE_DEPTH);
    const tileSideUnmarked = new THREE.MeshStandardMaterial({ color: TILE_UNMARKED, roughness: 0.9, metalness: 0.02 });
    const tileSideMarked = new THREE.MeshStandardMaterial({ color: TILE_MARKED, roughness: 0.8, metalness: 0.03 });

    // One number plate texture per integer 1..MAX_TARGET, created once + reused.
    const plateTextures: THREE.CanvasTexture[] = [];
    const plateMats: THREE.MeshBasicMaterial[] = [];
    for (let n = 0; n <= MAX_TARGET; n++) {
      const tex = makeNumberTexture(n);
      plateTextures.push(tex);
      plateMats.push(new THREE.MeshBasicMaterial({ map: tex }));
    }

    // Glowing paw-stone: an emissive amber sphere (one geo + one mat, reused).
    const stoneGeo = new THREE.SphereGeometry(STONE_R, 20, 16);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: STONE_COLOR,
      emissive: STONE_COLOR,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.1,
    });

    // ---- Animal (clay elephant) parts — one geo+mat per kind ----
    const bodyGeo = roundedBox(0.95, 0.7, 0.7, 0.22, 4);
    const headGeo = new THREE.SphereGeometry(0.34, 18, 14);
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.34, 12);
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.42, 10);
    const animalBodyMat = new THREE.MeshStandardMaterial({ color: ANIMAL_BODY, roughness: 0.85, metalness: 0.02 });
    const animalDarkMat = new THREE.MeshStandardMaterial({ color: ANIMAL_DARK, roughness: 0.85, metalness: 0.02 });

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Tiles + their plates + per-tile stone live in a group rebuilt each problem.
    const tileGroup = new THREE.Group();
    root.add(tileGroup);

    // Per-problem mutable tile records: mesh, the stone marker, its tile value.
    interface TileRec {
      value: number;
      mesh: THREE.Mesh; // material[4] is the plate; other faces share a side mat
      stone: THREE.Mesh; // glowing marker (visible only when marked)
    }
    let tiles: TileRec[] = [];
    const marked = new Set<number>(); // tile VALUES currently marked

    // Build the elephant once (it persists across problems; only repositioned).
    const animal = new THREE.Group();
    {
      const body = new THREE.Mesh(bodyGeo, animalBodyMat);
      body.castShadow = true;
      const head = new THREE.Mesh(headGeo, animalBodyMat);
      head.position.set(0.5, 0.12, 0);
      head.castShadow = true;
      const trunk = new THREE.Mesh(trunkGeo, animalDarkMat);
      trunk.position.set(0.74, -0.14, 0);
      trunk.rotation.z = Math.PI / 2.6;
      trunk.castShadow = true;
      const legOffsets: Array<[number, number]> = [
        [0.28, 0.22],
        [0.28, -0.22],
        [-0.28, 0.22],
        [-0.28, -0.22],
      ];
      for (const [lx, lz] of legOffsets) {
        const leg = new THREE.Mesh(legGeo, animalDarkMat);
        leg.position.set(lx, -0.5, lz);
        leg.castShadow = true;
        animal.add(leg);
      }
      animal.add(body, head, trunk);
    }
    root.add(animal);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as SkipCountProblem,
      animating: false, // guard so the hop sequence can't overlap a re-check
      streak: 0,
      answered: 0,
    };

    /** Number of tiles on the current track = the target (tiles 1..target). */
    function tileCount(): number {
      return state.problem.target;
    }

    /** Park the animal at the start (just left of tile 1, on its row). */
    function parkAnimalAtStart(): void {
      const p1 = tilePosition(TILE_MIN, tileCount());
      animal.position.set(p1.x - PITCH, p1.y + ANIMAL_REST_DY, ANIMAL_Z);
      animal.rotation.y = 0;
    }

    /** Apply a tile's marked/unmarked look: base material + stone visibility. */
    function applyTileLook(rec: TileRec): void {
      const isMarked = marked.has(rec.value);
      const mats = rec.mesh.material as THREE.Material[];
      // Faces 0,1,2,3,5 are the sides; face 4 (+Z front) keeps its number plate.
      const side = isMarked ? tileSideMarked : tileSideUnmarked;
      for (let f = 0; f < mats.length; f++) {
        if (f !== 4) mats[f] = side;
      }
      rec.stone.visible = isMarked;
    }

    /** (Re)build the numbered tiles + plates + (hidden) stones for the problem. */
    function buildTrack(): void {
      tileGroup.clear();
      tiles = [];
      marked.clear();
      const count = tileCount();
      for (let v = TILE_MIN; v <= count; v++) {
        const pos = tilePosition(v, count);
        // Per-face material array: sides share the unmarked side mat; +Z front
        // (index 4) carries this tile's number plate.
        const faceMats: THREE.Material[] = [
          tileSideUnmarked, // +x
          tileSideUnmarked, // -x
          tileSideUnmarked, // +y
          tileSideUnmarked, // -y
          plateMats[v], // +z FRONT — the number faces the camera
          tileSideUnmarked, // -z
        ];
        const mesh = new THREE.Mesh(tileGeo, faceMats);
        mesh.position.set(pos.x, TILE_Y0 + pos.y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.value = v; // pickable: tap reads this
        tileGroup.add(mesh);

        // A redundant front plate plane is NOT needed — face index 4 carries it.
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.raycast = () => {}; // §8c: the marker must never steal the tap from the tile beneath it
        stone.position.set(pos.x, TILE_Y0 + pos.y, STONE_LIFT);
        stone.visible = false;
        tileGroup.add(stone);

        tiles.push({ value: v, mesh, stone });
      }
      parkAnimalAtStart();
    }

    function showPrompt(): void {
      // TASK ONLY — the step + target. Never echoes which/how-many are marked.
      ctx.prompt.set(
        ctx.t('skipCount.prompt', { step: state.problem.step, target: state.problem.target })
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

    /** Toggle a tile's mark (the primary build interaction). */
    function toggleTile(value: number): void {
      if (state.animating) return; // ignore taps mid-celebration hop
      const rec = tiles.find((t) => t.value === value);
      if (!rec) return;
      if (marked.has(value)) marked.delete(value);
      else {
        marked.add(value);
        applyTileLook(rec);
        track(popIn(rec.stone, { scale: 1 })); // the stone "lands"
        ctx.audio.play('click');
        return;
      }
      applyTileLook(rec);
      ctx.audio.play('click');
    }

    /** Clear every mark (Reset) — back to the empty start state. */
    function clearMarks(): void {
      if (state.animating) return;
      if (marked.size === 0) return;
      const wasMarked = [...marked];
      marked.clear();
      for (const rec of tiles) if (wasMarked.includes(rec.value)) applyTileLook(rec);
      ctx.audio.play('click');
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: clearMarks,
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

    /**
     * Reward animation: the animal HOPS from the start across each marked stone in
     * ascending order, arcing over each gap, then celebrates at the last stone.
     * Under reduced motion it snaps to the final stone. Always re-enables input.
     */
    function animalHopAcross(onDone: () => void): void {
      const order = [...marked].sort((a, b) => a - b);
      const stops = order.map((v) => {
        const pos = tilePosition(v, tileCount());
        return { x: pos.x, y: TILE_Y0 + pos.y + ANIMAL_REST_DY };
      });
      if (stops.length === 0) {
        onDone();
        return;
      }
      if (ctx.prefersReducedMotion) {
        const last = stops[stops.length - 1];
        animal.position.set(last.x, last.y, ANIMAL_Z);
        onDone();
        return;
      }
      state.animating = true;
      let i = 0;
      const hopTo = (): void => {
        if (i >= stops.length) {
          state.animating = false;
          onDone();
          return;
        }
        const fromX = animal.position.x;
        const fromY = animal.position.y;
        const target = stops[i];
        const restY = target.y;
        track(
          tweenTo(0, 1, HOP_STEP_MS, (p) => {
            animal.position.x = fromX + (target.x - fromX) * p;
            animal.position.y = fromY + (restY - fromY) * p + HOP_ARC * 4 * p * (1 - p);
            if (p >= 1) animal.position.y = restY;
          })
        );
        i += 1;
        later(hopTo, HOP_STEP_MS + 40);
      };
      hopTo();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('skipCount.wrong'));
      track(shake(tileGroup, 0.06, 280));
    }

    /** Celebrate a correct answer with a stone punch + the animal hop + confetti. */
    function celebrateCorrect(after: () => void): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('skipCount.correct', { step: state.problem.step, target: state.problem.target })
      );
      // Punch all marked stones, then send the animal hopping across them.
      for (const rec of tiles) if (marked.has(rec.value)) track(punch(rec.stone, 0.2));
      celebrate();
      animalHopAcross(after);
    }

    function startNewProblem(): void {
      buildTrack();
      track(popIn(tileGroup, { scale: 1 }));
      showPrompt();
      showStatus();
    }

    function confirm(): void {
      if (state.animating) return; // don't accept a check while celebrating
      const answer = [...marked];
      const ok = generator.check(state.problem, answer);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          quiz.submit(answer);
          const qs = quiz.state();
          state.answered = qs.index;
          ctx.score.set(qs.score);
          celebrateCorrect(() => {
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
          });
        } else {
          state.streak = 0;
          onWrong();
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
        }
        return;
      }

      // Practice: correct → animal hops + next problem; wrong → KEEP marks to fix.
      if (ok) {
        state.streak += 1;
        ctx.score.add(POINTS_PER_CORRECT);
        const streakNow = state.streak;
        celebrateCorrect(() => {
          if (streakNow > 0 && streakNow % 3 === 0) bigCelebrate();
          state.problem = generator.next();
          startNewProblem();
        });
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Tap = the primary build interaction: tapping a tile toggles its mark. What
    // you tap is what changes (natural). Pickable meshes carry userData.value.
    const offTap = ctx.input.on('tap', (p) => {
      const value = p.picked?.userData?.value;
      if (typeof value === 'number') toggleTile(value);
    });

    // Initial render.
    buildTrack();
    track(popIn(root, { scale: 1 }));
    setControls();
    showPrompt();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offTap();
        stopAllTweens();
        clearTimers();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        tileGroup.clear();
        animal.clear();
        root.clear();
        ctx.scene.remove(root);

        // Shared geometries + materials (one per kind).
        tileGeo.dispose();
        tileSideUnmarked.dispose();
        tileSideMarked.dispose();
        plateTextures.forEach((t) => t.dispose());
        plateMats.forEach((m) => m.dispose());
        stoneGeo.dispose();
        stoneMat.dispose();
        bodyGeo.dispose();
        headGeo.dispose();
        legGeo.dispose();
        trunkGeo.dispose();
        animalBodyMat.dispose();
        animalDarkMat.dispose();
      },
    };
  },
};

/**
 * Render an integer as dark-on-light digits on a rounded plate (CanvasTexture),
 * so tile numbers stay readable on any backdrop. Created once per integer at init
 * and reused; disposed on dispose(). 0 is generated but never placed on a tile.
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    g.fillStyle = PLATE_BG;
    const r = 16;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(size, 0, size, size, r);
    g.arcTo(size, size, 0, size, r);
    g.arcTo(0, size, 0, 0, r);
    g.arcTo(0, 0, size, 0, r);
    g.closePath();
    g.fill();
    g.fillStyle = PLATE_FG;
    g.font = 'bold 56px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
