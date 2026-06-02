import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A SUBITIZING problem: a tray briefly FLASHES `count` dots in a recognizable
 * pattern, then hides them. The child reports how many dots they saw. The only
 * datum is the count; the visual arrangement (dice patterns for 1–6, paired /
 * ten-frame-ish groupings for 7–10) is derived from `count` by the renderer.
 */
export interface SubitizeProblem {
  /** Number of dots flashed — the answer the child must enter. */
  count: number;
}

/** Subitizing range: 1..10 dots (instant-recognition territory). */
export const MIN_DOTS = 1;
export const MAX_DOTS = 10;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createSubitizeGenerator(): ProblemGenerator<SubitizeProblem> {
  return {
    next(): SubitizeProblem {
      // Always a non-degenerate, solvable count in the subitizing range.
      return { count: randInt(MIN_DOTS, MAX_DOTS) };
    },
    check(problem: SubitizeProblem, answer: unknown): boolean {
      // STRICT: only a finite integer EXACTLY equal to the flashed count.
      // Rejects off-by-one, wrong types, NaN/null/objects, floats.
      if (typeof answer !== 'number' || !Number.isFinite(answer)) return false;
      if (!Number.isInteger(answer)) return false;
      return answer === problem.count;
    },
  };
}
