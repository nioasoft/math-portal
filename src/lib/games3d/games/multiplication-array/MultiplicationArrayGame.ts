import * as THREE from 'three';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMultiplicationGenerator, type MultiplicationProblem } from './problems';

// Layout: flat tiles on a grid, viewed top-down. Columns run along screen-X,
// rows run along screen-Z (which reads as vertical from the top-down camera) —
// so the array reads exactly like one drawn on paper.
const TILE = 0.9;
const GAP = 0.1;
const STEP = TILE + GAP;
const MIN_BUILD = 1;
const MAX_BUILD = 10;
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

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
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createMultiplicationGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, {
            length: QUIZ_LENGTH,
            pointsPerCorrect: POINTS_PER_CORRECT,
          })
        : null;

    // Shared geometry/material reused by every tile (rebuilt group on each change).
    const tileGeo = new THREE.BoxGeometry(TILE, 0.3, TILE);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x4f7cff });
    const group = new THREE.Group();
    ctx.scene.add(group);

    // Faint base plane so the buildable area is visible.
    const baseSize = MAX_BUILD * STEP;
    const baseGeo = new THREE.PlaneGeometry(baseSize, baseSize);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.35,
    });
    const basePlane = new THREE.Mesh(baseGeo, baseMat);
    basePlane.rotation.x = -Math.PI / 2;
    basePlane.position.y = -0.01;
    ctx.scene.add(basePlane);

    // Mutable state captured by ref so button/drag closures always read the latest.
    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as MultiplicationProblem,
      builtRows: 1,
      builtCols: 1,
    };

    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('multiplicationArray.prompt', {
          rows: state.problem.rows,
          cols: state.problem.cols,
          br: state.builtRows,
          bc: state.builtCols,
          total: state.builtRows * state.builtCols,
        })
      );
    }

    function buildTiles(): void {
      group.clear();
      const offsetX = -((state.builtCols - 1) * STEP) / 2;
      const offsetZ = -((state.builtRows - 1) * STEP) / 2;
      for (let r = 0; r < state.builtRows; r++) {
        for (let c = 0; c < state.builtCols; c++) {
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(offsetX + c * STEP, 0.15, offsetZ + r * STEP);
          group.add(tile);
        }
      }
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'rows-dec',
          label: `${ctx.t('controls.rows')} −`,
          onPress: () => {
            state.builtRows = Math.max(MIN_BUILD, state.builtRows - 1);
            refresh();
          },
        },
        {
          id: 'rows-inc',
          label: `${ctx.t('controls.rows')} +`,
          onPress: () => {
            state.builtRows = Math.min(MAX_BUILD, state.builtRows + 1);
            refresh();
          },
        },
        {
          id: 'cols-dec',
          label: `${ctx.t('controls.columns')} −`,
          onPress: () => {
            state.builtCols = Math.max(MIN_BUILD, state.builtCols - 1);
            refresh();
          },
        },
        {
          id: 'cols-inc',
          label: `${ctx.t('controls.columns')} +`,
          onPress: () => {
            state.builtCols = Math.min(MAX_BUILD, state.builtCols + 1);
            refresh();
          },
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => {
            state.builtRows = 1;
            state.builtCols = 1;
            refresh();
          },
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

    /** Rebuild tiles + prompt + controls so everything reflects current state. */
    function refresh(): void {
      buildTiles();
      showPrompt();
      setControls();
    }

    function startNewProblem(): void {
      state.builtRows = 1;
      state.builtCols = 1;
      refresh();
    }

    function confirm(): void {
      const answer = state.builtRows * state.builtCols;
      const ok = generator.check(state.problem, answer);

      if (quiz) {
        ctx.audio.play(ok ? 'success' : 'fail');
        if (ok) {
          ctx.feedback.correct(
            ctx.t('multiplicationArray.correct', {
              rows: state.problem.rows,
              cols: state.problem.cols,
              product: state.problem.product,
            })
          );
        } else {
          ctx.feedback.wrong();
        }
        quiz.submit(answer);
        ctx.score.set(quiz.state().score);
        if (quiz.state().finished) {
          ctx.complete(quiz.summary());
          return;
        }
        state.problem = quiz.state().current;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → keep the array to fix.
      if (ok) {
        ctx.audio.play('success');
        ctx.feedback.correct(
          ctx.t('multiplicationArray.correct', {
            rows: state.problem.rows,
            cols: state.problem.cols,
            product: state.problem.product,
          })
        );
        ctx.score.add(POINTS_PER_CORRECT);
        state.problem = generator.next();
        startNewProblem();
      } else {
        ctx.audio.play('fail');
        ctx.feedback.wrong();
      }
    }

    // Drag = fast building. Sweep out a rectangle: more to the right → more
    // columns; more downward on screen (toward the viewer) → more rows. Under the
    // top-down camera, NDC +y is the far (top) edge → fewer rows, NDC -y is near
    // (bottom) → more rows, so dragging downward grows the array outward.
    const offDrag = ctx.input.on('drag', (p) => {
      state.builtCols = pointerToCount(p.x);
      state.builtRows = pointerToCount(-p.y);
      refresh();
    });

    refresh();

    return {
      onResize() {},
      dispose() {
        offDrag();
        ctx.controls.clear();
        ctx.prompt.clear();
        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(basePlane);
        tileGeo.dispose();
        tileMat.dispose();
        baseGeo.dispose();
        baseMat.dispose();
      },
    };
  },
};
