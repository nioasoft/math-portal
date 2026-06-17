import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "compute X% of Y" problem. Both the percent and total are chosen so that
 * the result is always a clean integer (no rounding). The child sees a prompt
 * like "30% of 80" and must dial the numeric answer.
 */
export interface PercentOfQuantityProblem {
  /** The whole quantity. */
  total: number;
  /** The percentage to compute (10, 20, 25, 30, 40, 50, 75). */
  percent: number;
}

/** All total/percent pairs that yield a clean integer result. */
const VALID_PAIRS: Array<{ total: number; percent: number }> = [];
const TOTALS = [10, 20, 25, 40, 50, 80, 100] as const;
const PERCENTS = [10, 20, 25, 30, 40, 50, 75] as const;
for (const total of TOTALS) {
  for (const percent of PERCENTS) {
    if (Number.isInteger((total * percent) / 100)) {
      VALID_PAIRS.push({ total, percent });
    }
  }
}

export const MIN_ANSWER = 1;
export const MAX_ANSWER = 75; // 75% of 100

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function createPercentOfQuantityGenerator(): ProblemGenerator<PercentOfQuantityProblem> {
  return {
    next(): PercentOfQuantityProblem {
      return VALID_PAIRS[Math.floor(Math.random() * VALID_PAIRS.length)];
    },
    check(problem: PercentOfQuantityProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      const expected = Math.round((problem.total * problem.percent) / 100);
      return answer === expected;
    },
  };
}
