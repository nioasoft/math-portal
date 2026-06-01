import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createAreaPerimeterGenerator, type AreaPerimeterProblem } from './problems';

const TILE = 1;
const MAX = 10;

/**
 * Pick a start rectangle whose area AND perimeter both differ from the target,
 * so the problem never opens already-solved (the old fixed 2×2 = area 4 /
 * perimeter 8 coincided with ~3% of generated targets). Tries a few small
 * shapes and falls back to a guaranteed-mismatch.
 */
function pickStart(target: number): { width: number; height: number } {
  const candidates: Array<[number, number]> = [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, 3],
  ];
  for (const [w, h] of candidates) {
    if (w * h !== target && 2 * (w + h) !== target) return { width: w, height: h };
  }
  // Fallback: a 1×k strip with area and perimeter both clear of target.
  for (let k = 1; k <= MAX; k++) {
    if (k !== target && 2 * (1 + k) !== target) return { width: 1, height: k };
  }
  return { width: 1, height: 1 };
}

export const areaPerimeterGame: Game3D = {
  meta: {
    id: 'area-perimeter',
    i18nKey: 'games3d.areaPerimeter',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 150,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.topDown(new THREE.Vector3(MAX / 2, 0, MAX / 2), 14);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createAreaPerimeterGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: AreaPerimeterProblem = quiz ? quiz.state().current : generator.next();

    const group = new THREE.Group();
    ctx.scene.add(group);
    const tileGeo = new THREE.BoxGeometry(TILE * 0.95, 0.3, TILE * 0.95);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a });
    const start0 = pickStart(problem.target);
    let width = start0.width;
    let height = start0.height;

    function metric(): number {
      return problem.kind === 'area' ? width * height : 2 * (width + height);
    }
    function showPrompt(): void {
      ctx.prompt.set(`${problem.kind}=${problem.target} | ${width}×${height} (${metric()})`);
    }
    function rebuild(): void {
      group.clear();
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < height; z++) {
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(x + 0.5, 0.15, z + 0.5);
          group.add(tile);
        }
      }
      showPrompt();
    }
    function advance(): void {
      if (quiz) {
        if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      const s = pickStart(problem.target);
      width = s.width; height = s.height;
      rebuild();
    }

    const offDrag = ctx.input.on('drag', (p) => {
      // map normalized pointer to integer width/height within [1, MAX]
      width = Math.max(1, Math.min(MAX, Math.round(p.x * MAX)));
      height = Math.max(1, Math.min(MAX, Math.round((1 - p.y) * MAX)));
      rebuild();
    });
    const offDragEnd = ctx.input.on('dragEnd', () => {
      const ok = generator.check(problem, { width, height });
      if (ok) { ctx.audio.play('success'); ctx.feedback.correct('+10'); if (!quiz) ctx.score.add(10); }
      else { ctx.audio.play('fail'); ctx.feedback.wrong(); }
      if (quiz) { quiz.submit({ width, height }); ctx.score.set(quiz.state().score); advance(); }
      else if (ok) { advance(); }
    });

    rebuild();

    return {
      dispose() {
        offDrag(); offDragEnd();
        group.clear();
        tileGeo.dispose(); tileMat.dispose();
        ctx.scene.remove(group);
      },
    };
  },
};
