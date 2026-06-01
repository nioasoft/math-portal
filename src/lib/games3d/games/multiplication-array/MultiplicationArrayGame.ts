import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMultiplicationGenerator, type MultiplicationProblem } from './problems';

const CUBE = 0.9;
const GAP = 0.1;
const STEP = CUBE + GAP;

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
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0, 0), 14);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createMultiplicationGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;

    const geo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f7cff });
    const group = new THREE.Group();
    ctx.scene.add(group);

    let problem: MultiplicationProblem = quiz ? quiz.state().current : generator.next();
    let builtRows = 1;
    let builtCols = 1;

    function showPrompt(): void {
      ctx.feedback.hint(`${problem.rows} × ${problem.cols} = ?  (${builtRows}×${builtCols} = ${builtRows * builtCols})`);
    }

    function rebuild(): void {
      group.clear();
      const offsetX = -((builtCols - 1) * STEP) / 2;
      const offsetZ = -((builtRows - 1) * STEP) / 2;
      for (let r = 0; r < builtRows; r++) {
        for (let c = 0; c < builtCols; c++) {
          const cube = new THREE.Mesh(geo, mat);
          cube.position.set(offsetX + c * STEP, CUBE / 2, offsetZ + r * STEP);
          group.add(cube);
        }
      }
      showPrompt();
    }

    // Confirm the current build as the answer.
    function confirm(): void {
      const answer = builtRows * builtCols;
      const ok = generator.check(problem, answer);
      if (ok) {
        ctx.audio.play('success');
        ctx.feedback.correct('+10');
        if (quiz) {
          quiz.submit(answer);
          if (quiz.state().finished) {
            ctx.complete(quiz.summary());
            return;
          }
          problem = quiz.state().current;
        } else {
          ctx.score.add(10);
          problem = generator.next();
        }
        builtRows = 1;
        builtCols = 1;
        rebuild();
      } else {
        ctx.audio.play('fail');
        ctx.feedback.wrong();
        if (quiz) {
          quiz.submit(answer);
          if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
          problem = quiz.state().current;
          builtRows = 1; builtCols = 1; rebuild();
        }
      }
    }

    // Tap left/right half adds a column; top/bottom half adds a row. Double-tap-ish confirm via the HUD button is out of scope;
    // here a tap with two fingers (pinch=0 not used) — simplify: tap adds a column, tap while holding shift adds a row.
    // Practical mapping for touch: tap adds a column; when builtCols reaches problem.cols, taps start adding rows.
    const offTap = ctx.input.on('tap', () => {
      if (builtCols < problem.cols) {
        builtCols += 1;
      } else if (builtRows < problem.rows) {
        builtRows += 1;
      }
      rebuild();
      if (builtRows === problem.rows && builtCols === problem.cols) {
        confirm();
      }
    });

    rebuild();

    return {
      onResize() {},
      dispose() {
        offTap();
        group.clear();
        geo.dispose();
        mat.dispose();
        ctx.scene.remove(group);
      },
    };
  },
};
