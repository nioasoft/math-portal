import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A Venn diagram classification problem. The child sees a number and two
 * divisibility properties (e.g., "÷3" and "÷5"). They must classify the number
 * into one of four regions: left-only, right-only, both, or neither.
 */
export interface VennProblem {
  /** The number to classify (1..30). */
  value: number;
  /** First divisor (left circle). */
  divisorA: number;
  /** Second divisor (right circle). */
  divisorB: number;
}

export type VennRegion = 0 | 1 | 2 | 3; // neither | left-only | right-only | both

const VALUES = Array.from({ length: 30 }, (_, i) => i + 1);
const DIVISORS = [2, 3, 4, 5, 6, 10] as const;

export const MIN_VALUE = 1;
export const MAX_VALUE = 30;

function getRegion(problem: VennProblem): VennRegion {
  const divA = problem.value % problem.divisorA === 0;
  const divB = problem.value % problem.divisorB === 0;
  if (divA && divB) return 3;
  if (divA) return 1;
  if (divB) return 2;
  return 0;
}

function isRegion(value: unknown): value is VennRegion {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;
}

export function createVennGenerator(): ProblemGenerator<VennProblem> {
  return {
    next(): VennProblem {
      const value = VALUES[Math.floor(Math.random() * VALUES.length)];
      let divisorA: number;
      let divisorB: number;
      do {
        divisorA = DIVISORS[Math.floor(Math.random() * DIVISORS.length)];
        divisorB = DIVISORS[Math.floor(Math.random() * DIVISORS.length)];
      } while (divisorA === divisorB);
      return { value, divisorA, divisorB };
    },
    check(problem: VennProblem, answer: unknown): boolean {
      if (!isRegion(answer)) return false;
      return answer === getRegion(problem);
    },
  };
}
