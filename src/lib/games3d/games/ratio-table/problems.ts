import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "fill in the ratio table" problem. The child sees a table with a base
 * ratio (row 1) filled in, and one cell in a subsequent row highlighted with
 * "?". The child must compute the missing value.
 */
export interface RatioTableProblem {
  /** First number in the base ratio. */
  baseA: number;
  /** Second number in the base ratio. */
  baseB: number;
  /** Multiplier for the missing row. */
  multiplier: number;
  /** Which cell is missing: the multiplier, scaledA, or scaledB. */
  askFor: 'multiplier' | 'scaledA' | 'scaledB';
}

const BASE_A = [2, 3, 4, 5] as const;
const BASE_B = [3, 5, 6, 7, 8] as const;
const MULTIPLIERS = [2, 3, 4, 5] as const;

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function getAnswer(problem: RatioTableProblem): number {
  switch (problem.askFor) {
    case 'multiplier': return problem.multiplier;
    case 'scaledA': return problem.baseA * problem.multiplier;
    case 'scaledB': return problem.baseB * problem.multiplier;
  }
}

export function createRatioTableGenerator(): ProblemGenerator<RatioTableProblem> {
  return {
    next(): RatioTableProblem {
      const baseA = BASE_A[Math.floor(Math.random() * BASE_A.length)];
      const baseB = BASE_B[Math.floor(Math.random() * BASE_B.length)];
      const multiplier = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
      const askForOptions: RatioTableProblem['askFor'][] = ['multiplier', 'scaledA', 'scaledB'];
      const askFor = askForOptions[Math.floor(Math.random() * askForOptions.length)];
      return { baseA, baseB, multiplier, askFor };
    },
    check(problem: RatioTableProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      return answer === getAnswer(problem);
    },
  };
}
