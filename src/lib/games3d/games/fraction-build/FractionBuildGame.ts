import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createFractionGenerator, type FractionProblem } from './problems';

const RADIUS = 3;
const HEIGHT = 0.6;
const MARKER_SIZE = 1;
const MARKER_GAP = 1.8; // distance from the pie's right edge to the confirm marker

export const fractionBuildGame: Game3D = {
  meta: {
    id: 'fraction-build',
    i18nKey: 'games3d.fractionBuild',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 9);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createFractionGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: FractionProblem = quiz ? quiz.state().current : generator.next();

    // Pie wedges live in this group; rebuilt each problem.
    const group = new THREE.Group();
    ctx.scene.add(group);

    // Shared materials for every wedge (empty vs filled). Disposed once.
    const emptyMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const fillMat = new THREE.MeshStandardMaterial({ color: 0xff7043 });

    // Per-problem wedge geometries (one per slice) — tracked so we can dispose all.
    const wedgeGeos: THREE.CylinderGeometry[] = [];
    let wedges: THREE.Mesh[] = [];
    const filled = new Set<number>();

    // Dedicated "confirm" marker — a distinct green box the child taps to submit.
    const markerGeo = new THREE.BoxGeometry(MARKER_SIZE, HEIGHT, MARKER_SIZE);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
    const confirmMarker = new THREE.Mesh(markerGeo, markerMat);
    confirmMarker.userData.role = 'confirm';
    confirmMarker.position.set(RADIUS + MARKER_GAP, 0, 0);
    ctx.scene.add(confirmMarker);

    function showPrompt(): void {
      ctx.prompt.set(
        `${problem.numerator}/${problem.denominator}   (${filled.size}/${problem.denominator})`
      );
    }

    /** Build the wedge meshes for the current problem's denominator. */
    function buildPie(): void {
      group.clear();
      wedgeGeos.forEach((g) => g.dispose());
      wedgeGeos.length = 0;
      wedges = [];
      filled.clear();
      const n = problem.denominator;
      const theta = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const geo = new THREE.CylinderGeometry(
          RADIUS,
          RADIUS,
          HEIGHT,
          32,
          1,
          false,
          i * theta,
          theta
        );
        wedgeGeos.push(geo);
        const wedge = new THREE.Mesh(geo, emptyMat);
        wedge.userData.index = i;
        group.add(wedge);
        wedges.push(wedge);
      }
      showPrompt();
    }

    function startNewProblem(): void {
      if (quiz) {
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      buildPie();
    }

    /** Submit the filled-slice count as the answer. The count can be wrong by design. */
    function confirm(): void {
      const answer = filled.size;
      const ok = generator.check(problem, answer);

      if (quiz) {
        // Quiz: always submit and advance regardless of correctness.
        ctx.audio.play(ok ? 'success' : 'fail');
        if (ok) ctx.feedback.correct('+10');
        else ctx.feedback.wrong();
        quiz.submit(answer);
        ctx.score.set(quiz.state().score);
        if (quiz.state().finished) {
          ctx.complete(quiz.summary());
          return;
        }
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → keep the pie to adjust.
      if (ok) {
        ctx.audio.play('success');
        ctx.feedback.correct('+10');
        ctx.score.add(10);
        startNewProblem();
      } else {
        ctx.audio.play('fail');
        ctx.feedback.wrong();
        showPrompt();
      }
    }

    // Tapping the green marker confirms. Tapping a wedge toggles it filled/empty.
    const offTap = ctx.input.on('tap', (p) => {
      if (p.picked === confirmMarker) {
        confirm();
        return;
      }
      const idx = p.picked?.userData?.index;
      if (typeof idx !== 'number') return;
      if (filled.has(idx)) {
        filled.delete(idx);
        wedges[idx].material = emptyMat;
      } else {
        filled.add(idx);
        wedges[idx].material = fillMat;
      }
      ctx.audio.play('click');
      showPrompt();
    });

    buildPie();

    return {
      onResize() {},
      dispose() {
        offTap();
        group.clear();
        ctx.scene.remove(group);
        ctx.scene.remove(confirmMarker);
        wedgeGeos.forEach((g) => g.dispose());
        wedgeGeos.length = 0;
        emptyMat.dispose();
        fillMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
      },
    };
  },
};
