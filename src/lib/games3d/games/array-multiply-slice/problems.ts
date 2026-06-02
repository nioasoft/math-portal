import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A multiplication-array problem: a rectangular grid of `rows × cols` identical
 * items. The child reads the array as a multiplication and enters the TOTAL
 * (the product). Non-degenerate by construction — both sides are ≥ 2, so the
 * array is always a real 2-D array (never a trivial 1×N line) and the product
 * is always ≥ 4.
 */
export interface ArrayMultiplyProblem {
  rows: number;
  cols: number;
  /** rows × cols — the total the child must enter. */
  product: number;
}

/** Inclusive side bounds: a real array, product range 4..36. */
export const MIN_SIDE = 2;
export const MAX_SIDE = 6;

function randSide(): number {
  return Math.floor(Math.random() * (MAX_SIDE - MIN_SIDE + 1)) + MIN_SIDE;
}

/**
 * STRICT total check: the answer must be a finite integer exactly equal to the
 * product. Rejects off-by-one, NaN/null/undefined, non-numbers, and floats.
 */
function isExactTotal(value: unknown, product: number): boolean {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (!Number.isInteger(value)) return false;
  return value === product;
}

export function createArrayMultiplyGenerator(): ProblemGenerator<ArrayMultiplyProblem> {
  return {
    next(): ArrayMultiplyProblem {
      const rows = randSide();
      const cols = randSide();
      return { rows, cols, product: rows * cols };
    },
    check(problem: ArrayMultiplyProblem, answer: unknown): boolean {
      return isExactTotal(answer, problem.product);
    },
  };
}
