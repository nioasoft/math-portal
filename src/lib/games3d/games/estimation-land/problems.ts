import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Estimation problem: a true count `n` of scattered items (too many to count
 * quickly) and a `tolerance` band of ±20% (rounded up) within which a guess is
 * accepted. The skill is a GOOD ESTIMATE — a close-enough answer counts, not the
 * exact tally.
 */
export interface EstimationProblem {
  /** The true number of items in the scene (20..60). */
  n: number;
  /** Half-width of the accepted band: ceil(n * 0.2). */
  tolerance: number;
}

export const MIN_N = 20;
export const MAX_N = 60;

/**
 * True iff `guess` is an integer within the inclusive band `[n - tol, n + tol]`.
 * Inclusive on BOTH boundaries (n=40, tol=8 → 32 and 48 both accepted). Rejects
 * non-numbers, NaN, and non-integers (a fractional "count" is meaningless here).
 */
export function withinBand(n: number, tol: number, guess: number): boolean {
  if (typeof guess !== 'number' || !Number.isFinite(guess) || !Number.isInteger(guess)) {
    return false;
  }
  return Math.abs(guess - n) <= tol;
}

export function createEstimationGenerator(): ProblemGenerator<EstimationProblem> {
  return {
    next(): EstimationProblem {
      const n = Math.floor(Math.random() * (MAX_N - MIN_N + 1)) + MIN_N; // 20..60
      const tolerance = Math.ceil(n * 0.2);
      return { n, tolerance };
    },
    check(problem: EstimationProblem, answer: unknown): boolean {
      if (typeof answer !== 'number') return false;
      return withinBand(problem.n, problem.tolerance, answer);
    },
  };
}
