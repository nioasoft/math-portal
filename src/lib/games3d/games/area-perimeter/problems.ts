import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface AreaPerimeterProblem {
  kind: 'area' | 'perimeter';
  target: number;
}

export interface RectAnswer {
  width: number;
  height: number;
}

export const MAX_SIDE = 10;

function isRectAnswer(a: unknown): a is RectAnswer {
  return typeof a === 'object' && a !== null
    && typeof (a as RectAnswer).width === 'number'
    && typeof (a as RectAnswer).height === 'number';
}

export function createAreaPerimeterGenerator(): ProblemGenerator<AreaPerimeterProblem> {
  return {
    next(): AreaPerimeterProblem {
      const kind: 'area' | 'perimeter' = Math.random() < 0.5 ? 'area' : 'perimeter';
      const w = Math.floor(Math.random() * MAX_SIDE) + 1;
      const h = Math.floor(Math.random() * MAX_SIDE) + 1;
      const target = kind === 'area' ? w * h : 2 * (w + h);
      return { kind, target };
    },
    check(problem: AreaPerimeterProblem, answer: unknown): boolean {
      if (!isRectAnswer(answer)) return false;
      const value =
        problem.kind === 'area'
          ? answer.width * answer.height
          : 2 * (answer.width + answer.height);
      return value === problem.target;
    },
  };
}
