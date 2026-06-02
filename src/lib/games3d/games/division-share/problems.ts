import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Division-as-equal-sharing problem: share `total` gold coins equally among `k`
 * chests. The answer is how many coins go in EACH chest — the quotient. Whatever
 * cannot be shared evenly (`total mod k`) stays in the remainder cup.
 */
export interface DivisionShareProblem {
  total: number;
  k: number;
}

export const MIN_TOTAL = 7;
export const MAX_TOTAL = 40;
export const MIN_K = 2;
export const MAX_K = 6;

/** The correct per-chest amount = floor(total / k). */
export function quotientOf(problem: DivisionShareProblem): number {
  return Math.floor(problem.total / problem.k);
}

/** Leftover coins that cannot be shared evenly = total mod k. */
export function remainderOf(problem: DivisionShareProblem): number {
  return problem.total - quotientOf(problem) * problem.k;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createDivisionShareGenerator(): ProblemGenerator<DivisionShareProblem> {
  return {
    next(): DivisionShareProblem {
      const k = randInt(MIN_K, MAX_K);
      // Bias toward a healthy mix of divisible (remainder 0) and non-divisible
      // (remainder > 0) problems: half the time force an exact multiple of k,
      // otherwise pick any total in range (which is usually non-divisible).
      let total: number;
      if (Math.random() < 0.5) {
        // Exact multiple of k within [MIN_TOTAL, MAX_TOTAL] with quotient >= 1.
        const minMult = Math.ceil(MIN_TOTAL / k);
        const maxMult = Math.floor(MAX_TOTAL / k);
        total = randInt(minMult, maxMult) * k;
      } else {
        total = randInt(MIN_TOTAL, MAX_TOTAL);
      }
      return { total, k };
    },
    check(problem: DivisionShareProblem, answer: unknown): boolean {
      // STRICT: answer must be the integer per-chest count equal to the quotient.
      if (typeof answer !== 'number' || !Number.isInteger(answer)) return false;
      return answer === quotientOf(problem);
    },
  };
}
