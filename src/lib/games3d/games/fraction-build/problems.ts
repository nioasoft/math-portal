import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface FractionProblem {
  numerator: number;
  denominator: number;
}

export const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10] as const;

export function createFractionGenerator(): ProblemGenerator<FractionProblem> {
  return {
    next(): FractionProblem {
      const denominator =
        FRACTION_DENOMINATORS[Math.floor(Math.random() * FRACTION_DENOMINATORS.length)];
      const numerator = Math.floor(Math.random() * (denominator - 1)) + 1; // 1..denominator-1
      return { numerator, denominator };
    },
    check(problem: FractionProblem, answer: unknown): boolean {
      return typeof answer === 'number' && answer === problem.numerator;
    },
  };
}
