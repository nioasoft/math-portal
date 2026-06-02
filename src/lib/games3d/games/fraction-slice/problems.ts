import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A target PROPER fraction n/d the child must build by slicing a pie into exactly
 * `d` equal parts and shading exactly `n` of them. n/d is always proper
 * (1 ≤ n ≤ d-1), so the pie is never empty and never fully shaded.
 */
export interface FractionSliceProblem {
  /** Numerator: how many sectors to shade (1..d-1). */
  n: number;
  /** Denominator: how many equal sectors to slice the pie into (2..8). */
  d: number;
}

/** The child's built answer: the current slice count + shaded count. */
export interface SliceAnswer {
  slices: number;
  shaded: number;
}

export const MIN_DENOMINATOR = 2;
export const MAX_DENOMINATOR = 8;

/** True only for a finite, integer number (rejects NaN, floats, non-numbers). */
export function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isSliceAnswer(a: unknown): a is SliceAnswer {
  return (
    typeof a === 'object' &&
    a !== null &&
    isWholeNumber((a as SliceAnswer).slices) &&
    isWholeNumber((a as SliceAnswer).shaded)
  );
}

export function createFractionSliceGenerator(): ProblemGenerator<FractionSliceProblem> {
  return {
    next(): FractionSliceProblem {
      // d in 2..8, n in 1..d-1 → always a PROPER, non-degenerate fraction.
      const d = MIN_DENOMINATOR + Math.floor(Math.random() * (MAX_DENOMINATOR - MIN_DENOMINATOR + 1));
      const n = 1 + Math.floor(Math.random() * (d - 1));
      return { n, d };
    },
    /**
     * STRICT, CONCRETE check: the task is literally "slice into d, shade n", so
     * the slice count AND the shaded count must match EXACTLY. Equivalent
     * fractions (e.g. 6/8 for a 3/4 target) are WRONG — the slicing differs.
     */
    check(problem: FractionSliceProblem, answer: unknown): boolean {
      if (!isSliceAnswer(answer)) return false;
      return answer.slices === problem.d && answer.shaded === problem.n;
    },
  };
}
