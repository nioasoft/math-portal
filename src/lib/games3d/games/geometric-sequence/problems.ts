import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A geometric (multiplicative) sequence problem. The child sees a sequence of
 * numbers where each term is the previous term multiplied by a constant (×2 or ×3).
 * One term is missing (marked "?") and the child must compute it.
 */
export interface GeometricSequenceProblem {
  /** The first term in the sequence. */
  start: number;
  /** The multiplication factor (2 or 3). */
  multiplier: number;
  /** Total number of terms in the sequence (always 5). */
  length: number;
  /** Index of the missing term (0-based, never 0 or 4). */
  missingIndex: number;
  /** Pre-computed sequence values for easy access. */
  terms: number[];
}

const STARTS = [1, 2, 3] as const;
const MULTIPLIERS = [2, 3] as const;
const LENGTH = 5;

export const MAX_VALUE = 243; // 3 × 3^4

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function createGeometricSequenceGenerator(): ProblemGenerator<GeometricSequenceProblem> {
  return {
    next(): GeometricSequenceProblem {
      const start = STARTS[Math.floor(Math.random() * STARTS.length)];
      const multiplier = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
      const missingIndex = 2 + Math.floor(Math.random() * 2); // 2 or 3

      const terms: number[] = [];
      let val = start;
      for (let i = 0; i < LENGTH; i++) {
        terms.push(val);
        val *= multiplier;
      }

      return { start, multiplier, length: LENGTH, missingIndex, terms };
    },
    check(problem: GeometricSequenceProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      return answer === problem.terms[problem.missingIndex];
    },
  };
}
