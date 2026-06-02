import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Division-as-equal-sharing problem framed as building TOWERS. Share `n` unit
 * blocks equally into `d` towers (columns). The answer is how many blocks go in
 * EACH tower — the quotient (= the per-tower height). Whatever cannot be shared
 * evenly (`n mod d`) stays in the pool as the visible remainder.
 */
export interface LongDivisionTowerProblem {
  /** Dividend — total number of blocks in the pool. */
  n: number;
  /** Divisor — number of towers (columns) to share into. */
  d: number;
}

export const MIN_D = 2; // at least 2 towers
export const MAX_D = 6; // at most 6 towers
export const MIN_N = 3; // smallest dividend (d+1 with d=2)
export const MAX_N = 40; // largest dividend

/** Correct per-tower count = floor(n / d) (always >= 1 by construction). */
export function quotientOf(problem: LongDivisionTowerProblem): number {
  return Math.floor(problem.n / problem.d);
}

/** Leftover blocks that cannot be shared evenly = n mod d. */
export function remainderOf(problem: LongDivisionTowerProblem): number {
  return problem.n - quotientOf(problem) * problem.d;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createLongDivisionTowerGenerator(): ProblemGenerator<LongDivisionTowerProblem> {
  return {
    next(): LongDivisionTowerProblem {
      const d = randInt(MIN_D, MAX_D);
      // n must be in (d+1)..MAX_N so the quotient is always >= 1 (non-degenerate).
      const lo = d + 1;
      // Bias toward a healthy MIX of exact (remainder 0) and inexact
      // (remainder > 0) divisions: half the time force an exact multiple of d,
      // otherwise pick any n in range (which is usually non-divisible).
      let n: number;
      if (Math.random() < 0.5) {
        // Exact multiple of d within [lo, MAX_N] with quotient >= 1.
        const minMult = Math.ceil(lo / d); // smallest multiple-count giving n >= lo (>= 2)
        const maxMult = Math.floor(MAX_N / d);
        n = randInt(minMult, maxMult) * d;
      } else {
        n = randInt(lo, MAX_N);
      }
      return { n, d };
    },
    check(problem: LongDivisionTowerProblem, answer: unknown): boolean {
      // STRICT: answer must be the integer per-tower count equal to the quotient.
      // Rejects floats, NaN, null, non-numbers, off-by-one, and over-sharing.
      if (typeof answer !== 'number' || !Number.isInteger(answer)) return false;
      return answer === quotientOf(problem);
    },
  };
}
