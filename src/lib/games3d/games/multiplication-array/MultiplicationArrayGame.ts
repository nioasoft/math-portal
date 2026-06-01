import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMultiplicationGenerator, type MultiplicationProblem } from './problems';

const CUBE = 0.9;
const GAP = 0.1;
const STEP = CUBE + GAP;
const MAX_COLS = 10; // after this many columns, taps add a new row instead
const MARKER_SIZE = 1.2;
const MARKER_GAP = 2.5; // distance from the array's right edge to the confirm marker

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

    // Shared geometry/material for the array cubes (re-used by every cube).
    const cubeGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x4f7cff });
    const group = new THREE.Group();
    ctx.scene.add(group);

    // Dedicated "confirm" marker — a distinct green cube the child taps to submit.
    const markerGeo = new THREE.BoxGeometry(MARKER_SIZE, MARKER_SIZE, MARKER_SIZE);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
    const confirmMarker = new THREE.Mesh(markerGeo, markerMat);
    confirmMarker.userData.role = 'confirm';
    ctx.scene.add(confirmMarker);

    let problem: MultiplicationProblem = quiz ? quiz.state().current : generator.next();
    let builtRows = 1;
    let builtCols = 1;

    function showPrompt(): void {
      ctx.feedback.hint(
        `${problem.rows} × ${problem.cols} = ?  (${builtRows}×${builtCols} = ${builtRows * builtCols})`
      );
    }

    /** Rebuild the cube array and reposition the confirm marker beside it. */
    function rebuild(): void {
      group.clear();
      const offsetX = -((builtCols - 1) * STEP) / 2;
      const offsetZ = -((builtRows - 1) * STEP) / 2;
      for (let r = 0; r < builtRows; r++) {
        for (let c = 0; c < builtCols; c++) {
          const cube = new THREE.Mesh(cubeGeo, cubeMat);
          cube.position.set(offsetX + c * STEP, CUBE / 2, offsetZ + r * STEP);
          group.add(cube);
        }
      }
      // Place the marker just past the right edge of the current array.
      const rightEdge = offsetX + (builtCols - 1) * STEP + CUBE / 2;
      confirmMarker.position.set(rightEdge + MARKER_GAP, MARKER_SIZE / 2, 0);
      showPrompt();
    }

    function startNewProblem(): void {
      builtRows = 1;
      builtCols = 1;
      rebuild();
    }

    /** Submit the built count as the answer. The count can be wrong by design. */
    function confirm(): void {
      const answer = builtRows * builtCols;
      const ok = generator.check(problem, answer);

      if (quiz) {
        // Quiz: always submit and advance regardless of correctness.
        ctx.audio.play(ok ? 'success' : 'fail');
        if (ok) ctx.feedback.correct('+10');
        else ctx.feedback.wrong();
        quiz.submit(answer);
        if (quiz.state().finished) {
          ctx.complete(quiz.summary());
          return;
        }
        problem = quiz.state().current;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → keep the array to adjust.
      if (ok) {
        ctx.audio.play('success');
        ctx.feedback.correct('+10');
        ctx.score.add(10);
        problem = generator.next();
        startNewProblem();
      } else {
        ctx.audio.play('fail');
        ctx.feedback.wrong();
        showPrompt();
      }
    }

    // Tapping the green marker confirms. Any other tap grows the array:
    // add a column until MAX_COLS, then start adding rows.
    const offTap = ctx.input.on('tap', (p) => {
      if (p.picked && p.picked.userData.role === 'confirm') {
        confirm();
        return;
      }
      if (builtCols < MAX_COLS) {
        builtCols += 1;
      } else {
        builtRows += 1;
      }
      ctx.audio.play('click');
      rebuild();
    });

    rebuild();

    return {
      onResize() {},
      dispose() {
        offTap();
        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(confirmMarker);
        cubeGeo.dispose();
        cubeMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
      },
    };
  },
};
