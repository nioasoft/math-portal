import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars } from '@/lib/games3d/kit';
import { createMultiplicationGenerator, type MultiplicationProblem } from './problems';

// Layout: chocolate squares on a grid, viewed top-down. Columns run along
// screen-X, rows run along screen-Z (which reads as vertical from the top-down
// camera) — so the array reads exactly like a chocolate bar (or one drawn on
// paper). A 2×3 bar of chocolate squares is a natural multiplication model.
const TILE = 0.9;
const GAP = 0.12;
const STEP = TILE + GAP;
const TILE_HEIGHT = 0.34; // thickness so squares read as 3D chocolate chunks
const TILE_Y = TILE_HEIGHT / 2;
const MIN_BUILD = 1;
const MAX_BUILD = 10;
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Warm chocolate palette (milk → dark) cycled by row so the board has depth.
const CHOCOLATE_COLORS = [0x7b4a2d, 0x6b3d22, 0x8a5535] as const;
const POP_STAGGER_MS = 22; // small per-square delay so growth feels alive, not heavy

/** Map a normalized pointer coordinate (-1..1) to an integer build count 1..MAX. */
function pointerToCount(normalized: number): number {
  // normalized -1 → 1 tile, +1 → MAX_BUILD tiles.
  const t = (normalized + 1) / 2; // 0..1
  const count = Math.round(t * (MAX_BUILD - 1)) + 1;
  return Math.max(MIN_BUILD, Math.min(MAX_BUILD, count));
}

export const multiplicationArrayGame: Game3D = {
  meta: {
    id: 'multiplication-array',
    i18nKey: 'games3d.multiplicationArray',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Top-down view over a flat grid so rows/columns are unambiguous.
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 14);

    // Clay/toy look (warm chocolate-shop ambience). Ground disabled: from the
    // top-down camera a full ground plane adds nothing and the chocolate board
    // below reads as the surface. The engine already enables soft shadows.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f3e0c7',
      bottomColor: '#e8cda6',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createMultiplicationGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, {
            length: QUIZ_LENGTH,
            pointsPerCorrect: POINTS_PER_CORRECT,
          })
        : null;

    // Shared geometry + one material per chocolate shade, reused by every square.
    const tileGeo = roundedBox(TILE, TILE_HEIGHT, TILE, 0.14, 4);
    const tileMats = CHOCOLATE_COLORS.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          metalness: 0.05,
        })
    );

    const group = new THREE.Group();
    ctx.scene.add(group);

    // "Chocolate board" base: a thin matte tray under the squares (catches the
    // soft shadow, frames the buildable area).
    const baseSize = MAX_BUILD * STEP;
    const baseGeo = roundedBox(baseSize, 0.18, baseSize, 0.2, 3);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x4a2f1c,
      roughness: 0.85,
      transparent: true,
      opacity: 0.45,
    });
    const basePlane = new THREE.Mesh(baseGeo, baseMat);
    basePlane.position.y = -0.1;
    basePlane.receiveShadow = true;
    ctx.scene.add(basePlane);

    // Track game-started tweens so dispose can stop every one (no tween outlives
    // its target). buildTiles clears stale entries each rebuild.
    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // Mutable state captured by ref so button/drag closures always read the latest.
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as MultiplicationProblem,
      builtRows: 1,
      builtCols: 1,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('multiplicationArray.prompt', {
          rows: state.problem.rows,
          cols: state.problem.cols,
        })
      );
    }

    function showStatus(): void {
      if (quiz) {
        ctx.status.set({
          streak: state.streak,
          progress: { current: state.answered, total: QUIZ_LENGTH },
        });
      } else {
        // Practice: streak only (HUD shows it once it's > 1). Stars by milestone.
        ctx.status.set({
          streak: state.streak,
          stars: Math.min(3, Math.floor(state.streak / 3)),
          maxStars: 3,
        });
      }
    }

    /**
     * Rebuild the chocolate squares to match builtRows × builtCols. Squares that
     * are newly appearing (index >= prevCount) pop in with a slight stagger;
     * existing squares stay put so taps/drags feel smooth and cheap (we don't
     * re-animate the whole array every change).
     */
    function buildTiles(prevCount: number): void {
      stopAllTweens();
      group.clear();
      const offsetX = -((state.builtCols - 1) * STEP) / 2;
      const offsetZ = -((state.builtRows - 1) * STEP) / 2;
      let index = 0;
      let newOrdinal = 0;
      for (let r = 0; r < state.builtRows; r++) {
        for (let c = 0; c < state.builtCols; c++) {
          const tile = new THREE.Mesh(tileGeo, tileMats[r % tileMats.length]);
          tile.position.set(offsetX + c * STEP, TILE_Y, offsetZ + r * STEP);
          tile.castShadow = true;
          tile.receiveShadow = true;
          if (index >= prevCount) {
            track(popIn(tile, { delay: newOrdinal * POP_STAGGER_MS }));
            newOrdinal += 1;
          }
          group.add(tile);
          index += 1;
        }
      }
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'rows-dec',
          label: `${ctx.t('controls.rows')} −`,
          onPress: () => updateBuild(Math.max(MIN_BUILD, state.builtRows - 1), state.builtCols),
        },
        {
          id: 'rows-inc',
          label: `${ctx.t('controls.rows')} +`,
          onPress: () => updateBuild(Math.min(MAX_BUILD, state.builtRows + 1), state.builtCols),
        },
        {
          id: 'cols-dec',
          label: `${ctx.t('controls.columns')} −`,
          onPress: () => updateBuild(state.builtRows, Math.max(MIN_BUILD, state.builtCols - 1)),
        },
        {
          id: 'cols-inc',
          label: `${ctx.t('controls.columns')} +`,
          onPress: () => updateBuild(state.builtRows, Math.min(MAX_BUILD, state.builtCols + 1)),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => updateBuild(1, 1),
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

    /** Apply a new build size, popping in any newly-added squares. */
    function updateBuild(rows: number, cols: number): void {
      const prevCount = state.builtRows * state.builtCols;
      state.builtRows = rows;
      state.builtCols = cols;
      buildTiles(prevCount);
      showPrompt();
    }

    /** Full refresh: rebuild everything from scratch (all squares pop in). */
    function refresh(): void {
      buildTiles(0);
      showPrompt();
      setControls();
      showStatus();
    }

    function startNewProblem(): void {
      state.builtRows = 1;
      state.builtCols = 1;
      refresh();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('multiplicationArray.correct', {
          rows: state.problem.rows,
          cols: state.problem.cols,
          product: state.problem.product,
        })
      );
      track(punch(group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong();
      track(shake(group, 0.08, 260));
    }

    function confirm(): void {
      const answer = state.builtRows * state.builtCols;
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
          showStatus();
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

      // Practice: correct → score + next problem; wrong → keep the array to fix.
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

    // Drag = fast building. Sweep out a rectangle: more to the right → more
    // columns; more downward on screen (toward the viewer) → more rows. Under the
    // top-down camera, NDC +y is the far (top) edge → fewer rows, NDC -y is near
    // (bottom) → more rows, so dragging downward grows the array outward.
    const offDrag = ctx.input.on('drag', (p) => {
      updateBuild(pointerToCount(-p.y), pointerToCount(p.x));
    });

    refresh();

    return {
      onResize() {},
      dispose() {
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();
        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(basePlane);
        tileGeo.dispose();
        tileMats.forEach((m) => m.dispose());
        baseGeo.dispose();
        baseMat.dispose();
      },
    };
  },
};
