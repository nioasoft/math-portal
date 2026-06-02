import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import {
  createHundredChartGenerator,
  multiplesOf,
  MAX,
  type HundredChartProblem,
} from './problems';

// Theme: a classroom NUMBER POSTER / hundred chart. Numbers 1..30 sit in a
// 6-column × 5-row grid (row-major: row 0 = 1..6, row 1 = 7..12, …, row 4 =
// 25..30). The child colours all the MULTIPLES of a given number n by tapping
// (toggle) or dragging (paint) over the tiles, then בדוק to check. Reset clears
// the whole chart. Teaches multiples & skip-counting patterns (every nth tile).
//
// Each tile is a UNIFORM rounded plaque carrying its number on a CanvasTexture
// plane facing the straight-on camera (high-contrast dark digits on a pale tile;
// the plane is the actual readable digit — NOT a roundedBox face material, per
// the spec gotcha). Colouring swaps the tile material (pale → saturated accent),
// which never touches scale, so popIn/punch stay safe on these uniform tiles.
const COLS = 6;
const ROWS = 5; // COLS × ROWS = 30 = MAX
const CELL = 1.18; // pitch between tile centres
const TILE = 1.06; // tile footprint (a small gap reads as a grid)
const TILE_DEPTH = 0.34; // a little thickness so tiles read as standing plaques
const NUM_Z = TILE_DEPTH / 2 + 0.02; // number plane sits just proud of the tile front (+z)
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Palette: uncoloured tiles are a pale cream with dark digits (strong contrast);
// coloured tiles glow in a saturated grape accent (the child's painted multiples).
const TILE_PALE = PALETTE.cream;
const TILE_ACCENT = PALETTE.grape;
const NUM_FG = '#2c2a3a'; // dark digits — readable on the pale tile
const NUM_BG = '#fbf3df'; // matches TILE_PALE-ish; the plane reads as the tile face
const BOARD_COLOR = 0x3a3358; // dark backing board behind the chart (contrast + frame)

/** World X for column c (0..COLS-1), centred on the origin. */
function colX(c: number): number {
  return (c - (COLS - 1) / 2) * CELL;
}
/** World Y for row r (row 0 = top → highest y). Straight-on camera, y is vertical. */
function rowY(r: number): number {
  return ((ROWS - 1) / 2 - r) * CELL;
}

/**
 * Render an integer as dark-on-pale digits on a CanvasTexture (used on a small
 * plane facing the camera). Created once per number at init and reused; disposed
 * on dispose(). Textures are GPU resources and MUST be .dispose()'d.
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = NUM_BG;
    g.fillRect(0, 0, size, size);
    g.fillStyle = NUM_FG;
    g.font = 'bold 74px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const hundredChartColourGame: Game3D = {
  meta: {
    id: 'hundred-chart-colour',
    i18nKey: 'games3d.hundredChart',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [2, 4],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera: drag-x → world-x and drag-y → world-y are both
    // monotonic (natural, no inversion). The chart's binding extent is its WIDTH
    // (COLS·CELL ≈ 7 units); D fits that with margin (60° FOV vertical, ~1.4 aspect).
    const halfWidth = (COLS * CELL) / 2; // ~3.54
    const aspect = 1.4;
    const D = halfWidth / aspect / Math.tan(Math.PI / 6) + 3.0; // fit width with margin
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, D), new THREE.Vector3(0, 0, 0));

    // Content is centred on the origin and spans y ∈ [-2.4, 2.4] (above AND below
    // y=0), so the clay ground plane MUST be off or it would occlude the lower rows.
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7ddff',
      bottomColor: '#ffe9cf',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createHundredChartGenerator();
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
    const tileGeo = roundedBox(TILE, TILE, TILE_DEPTH, 0.16, 3);
    const paleMat = new THREE.MeshStandardMaterial({ color: TILE_PALE, roughness: 0.85, metalness: 0.02 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: TILE_ACCENT,
      roughness: 0.4,
      metalness: 0.06,
      emissive: TILE_ACCENT,
      emissiveIntensity: 0.22,
    });

    // Dark backing board behind the chart (frames the grid + adds contrast).
    const boardW = COLS * CELL + 0.6;
    const boardH = ROWS * CELL + 0.6;
    const boardGeo = roundedBox(boardW, boardH, 0.3, 0.2, 3);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.9, metalness: 0.03 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 0, -0.3);
    board.scale.setScalar(1); // static prop: explicit scale, never popIn (§13c)
    board.receiveShadow = true;
    ctx.scene.add(board);

    // One number plate texture + material + plane geo per integer 1..MAX, reused.
    const numTextures: THREE.CanvasTexture[] = [];
    const numMats: THREE.MeshBasicMaterial[] = [];
    const numPlaneGeo = new THREE.PlaneGeometry(TILE * 0.82, TILE * 0.82);
    for (let k = 1; k <= MAX; k++) {
      const tex = makeNumberTexture(k);
      numTextures.push(tex);
      numMats.push(new THREE.MeshBasicMaterial({ map: tex }));
    }

    // The whole chart lives in ONE group added to the scene (paranoid visibility).
    const tileGroup = new THREE.Group();
    tileGroup.scale.setScalar(1);
    ctx.scene.add(tileGroup);

    // Per-number tile mesh, built ONCE and reused across problems (recoloured, not
    // re-allocated). The number plane is a child so the tile mesh is the pick target.
    const tiles = new Map<number, THREE.Mesh>();
    const coloured = new Set<number>(); // numbers the child has coloured

    /** Build the 30 numbered tiles once (row-major 1..30). Reused thereafter. */
    function buildTiles(): void {
      tileGroup.clear();
      tiles.clear();
      let k = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          k += 1; // 1..30
          const tile = new THREE.Mesh(tileGeo, paleMat);
          tile.position.set(colX(c), rowY(r), 0);
          tile.castShadow = true;
          tile.receiveShadow = true;
          // Back-reference so tap/drag hit-testing can identify the tile by number.
          tile.userData.num = k;

          // Number plane: a CanvasTexture digit facing the camera (+z front).
          const plane = new THREE.Mesh(numPlaneGeo, numMats[k - 1]);
          plane.position.set(0, 0, NUM_Z);
          plane.userData.num = k; // picking the digit still resolves to this tile
          tile.add(plane);

          tile.scale.setScalar(1); // explicit scale; entrance handled below per-tile
          tileGroup.add(tile);
          tiles.set(k, tile);
        }
      }
    }

    /** Colour / uncolour a tile, syncing its material + the `coloured` set. */
    function setColoured(k: number, on: boolean): void {
      const tile = tiles.get(k);
      if (!tile) return;
      if (on) {
        if (coloured.has(k)) return;
        coloured.add(k);
        tile.material = accentMat; // swap material on a UNIFORM tile (scale untouched)
        track(punch(tile, 0.16)); // uniform punch — safe (never resets a non-uniform scale)
      } else {
        if (!coloured.has(k)) return;
        coloured.delete(k);
        tile.material = paleMat;
        tile.scale.setScalar(1);
      }
    }

    function toggleTile(k: number): void {
      setColoured(k, !coloured.has(k));
      ctx.audio.play('click');
    }

    function clearAll(): void {
      if (coloured.size === 0) return;
      [...coloured].forEach((k) => setColoured(k, false));
      ctx.audio.play('click');
    }

    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as HundredChartProblem,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — names the base n (a param the prompt MAY use); reveals nothing
      // about which tiles or whether the chart is solved.
      ctx.prompt.set(ctx.t('hundredChart.prompt', { n: state.problem.n }));
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

    /** Lay out a fresh problem: clear all colour (start ≠ target, which is non-empty). */
    function layoutForProblem(): void {
      clearAll();
      showPrompt();
    }

    function startNewProblem(): void {
      state.problem = quiz ? quiz.state().current : generator.next();
      layoutForProblem();
      showStatus();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: clearAll,
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
      ctx.feedback.correct(ctx.t('hundredChart.correct', { n: state.problem.n }));
      // Punch the whole chart group (uniform scale on the group is harmless).
      track(punch(tileGroup, 0.12));
      celebrate();
    }

    /** Briefly highlight wrong tiles (missing multiples + extra non-multiples). */
    function flashMismatches(): void {
      const target = new Set(multiplesOf(state.problem.n, MAX));
      const wrong = new Set<number>();
      for (const k of target) if (!coloured.has(k)) wrong.add(k); // missing
      for (const k of coloured) if (!target.has(k)) wrong.add(k); // extra
      for (const k of wrong) {
        const tile = tiles.get(k);
        if (tile) track(shake(tile, 0.12, 260));
      }
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('hundredChart.wrong'));
      track(shake(tileGroup, 0.06, 280));
      flashMismatches();
    }

    function confirm(): void {
      const answer = [...coloured];
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

      // Practice: correct → score + next problem; wrong → KEEP the coloured chart to fix.
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

    /** Resolve the tile NUMBER under a picked object (tile mesh OR its number plane). */
    function numFromPicked(picked: THREE.Object3D | null): number | null {
      const num = picked?.userData?.num as number | undefined;
      return typeof num === 'number' ? num : null;
    }

    // TAP a tile → toggle its colour.
    const offTap = ctx.input.on('tap', (p) => {
      const num = numFromPicked(p.picked ?? null);
      if (num == null) return;
      toggleTile(num);
    });

    // DRAG across tiles → PAINT them coloured (each tile the pointer passes over is
    // coloured; never un-coloured, so a sweep reliably fills the multiples). Natural:
    // the straight-on camera keeps pointer→world monotonic, no inverted axis.
    const offDrag = ctx.input.on('drag', (p) => {
      const num = numFromPicked(p.picked ?? null);
      if (num == null) return;
      setColoured(num, true);
    });

    buildTiles(); // built once; entrance pop-in below
    // Gentle staggered entrance on UNIFORM tiles (popIn uses uniform scale — safe).
    // No stopAllTweens() runs mid-lifecycle (only in dispose), so these grow back.
    let ord = 0;
    for (let k = 1; k <= MAX; k++) {
      const tile = tiles.get(k);
      if (tile) {
        track(popIn(tile, { delay: ord * 8 }));
        ord += 1;
      }
    }
    layoutForProblem();
    setControls();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offTap();
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        tileGroup.clear();
        tiles.clear();
        coloured.clear();
        ctx.scene.remove(tileGroup);
        ctx.scene.remove(board);

        tileGeo.dispose();
        paleMat.dispose();
        accentMat.dispose();
        boardGeo.dispose();
        boardMat.dispose();
        numPlaneGeo.dispose();
        numMats.forEach((m) => m.dispose());
        numTextures.forEach((t) => t.dispose()); // CanvasTextures are GPU resources
      },
    };
  },
};
