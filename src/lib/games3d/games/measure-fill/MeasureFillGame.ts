import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMeasureFillGenerator, type MeasureFillProblem } from './problems';

const CONTAINER_H = 4;
const RADIUS = 1.2;

export const measureFillGame: Game3D = {
  meta: {
    id: 'measure-fill',
    i18nKey: 'games3d.measureFill',
    topic: 'units',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.locked(new THREE.Vector3(0, 2, 8), new THREE.Vector3(0, 2, 0));
    ctx.presets.lighting.soft(ctx.scene);

    const generator = createMeasureFillGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: MeasureFillProblem = quiz ? quiz.state().current : generator.next();

    // Glass
    const glassGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, CONTAINER_H, 32, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x99ccff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = CONTAINER_H / 2;
    ctx.scene.add(glass);

    // Liquid
    const liquidGeo = new THREE.CylinderGeometry(RADIUS * 0.92, RADIUS * 0.92, 1, 32);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x2196f3 });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    ctx.scene.add(liquid);

    let fillMl = 0;
    function setFill(ml: number): void {
      fillMl = Math.max(0, Math.min(problem.capacityMl, ml));
      const frac = fillMl / problem.capacityMl;
      liquid.scale.y = Math.max(0.001, frac * CONTAINER_H);
      liquid.position.y = liquid.scale.y / 2;
      ctx.prompt.set(`${ctxTarget()} | ${Math.round(fillMl)} ml`);
    }
    function ctxTarget(): string { return `→ ${problem.targetMl} ml`; }

    function nextOrComplete(): void {
      if (quiz) {
        if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      setFill(0);
    }

    const offDrag = ctx.input.on('drag', (p) => {
      // p.y is normalized 0..1 (top=0). Map to fill fraction (bottom = full pour control).
      const frac = 1 - Math.min(1, Math.max(0, p.y));
      setFill(frac * problem.capacityMl);
    });
    const offDragEnd = ctx.input.on('dragEnd', () => {
      const ok = generator.check(problem, fillMl);
      if (ok) { ctx.audio.play('success'); ctx.feedback.correct('+10'); if (!quiz) ctx.score.add(10); }
      else { ctx.audio.play('fail'); ctx.feedback.wrong(); }
      if (quiz) {
        quiz.submit(fillMl);
        ctx.score.set(quiz.state().score);
        nextOrComplete();
      } else if (ok) {
        nextOrComplete();
      }
    });

    setFill(0);

    return {
      dispose() {
        offDrag();
        offDragEnd();
        ctx.scene.remove(glass); glassGeo.dispose(); glassMat.dispose();
        ctx.scene.remove(liquid); liquidGeo.dispose(); liquidMat.dispose();
      },
    };
  },
};
