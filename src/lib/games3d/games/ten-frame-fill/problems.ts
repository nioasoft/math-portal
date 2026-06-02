import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A ten-frame-fill problem is simply a target count of marbles the child must
 * place. The child commits via the Check button; correct ⇔ built count === target.
 */
export interface TenFrameProblem {
  target: number;
}

/** Hard ceiling: a DOUBLE ten-frame (two 2×5 frames) holds up to 20 marbles. */
export const MAX_TARGET = 20;
/** Floor: at least one marble — no degenerate "place 0" problem. */
export const MIN_TARGET = 1;

function isCountAnswer(a: unknown): a is number {
  return typeof a === 'number' && Number.isInteger(a);
}

/**
 * Targets for grades 1–2. Easy band (1..10) fits a single ten-frame; the full
 * band reaches 20 (double ten-frame) so the "grouping by 10" idea shows. We bias
 * toward the easy band but include the 11–20 range so the double frame is used.
 */
export function createTenFrameGenerator(maxTarget: number = MAX_TARGET): ProblemGenerator<TenFrameProblem> {
  const ceiling = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.floor(maxTarget)));
  return {
    next(): TenFrameProblem {
      // 1..ceiling inclusive, uniform.
      const target = Math.floor(Math.random() * ceiling) + MIN_TARGET;
      return { target };
    },
    check(problem: TenFrameProblem, answer: unknown): boolean {
      if (!isCountAnswer(answer)) return false;
      return answer === problem.target;
    },
  };
}
