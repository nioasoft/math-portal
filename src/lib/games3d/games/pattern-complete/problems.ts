import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Pattern-complete problem: an arithmetic sequence of cube-tower heights with a
 * constant common difference (`step`). One interior tower (`gapIndex`) is empty;
 * the child must build it to the right height (`missing`).
 *
 * Constraints (grade 2–4 friendly):
 *  - start in 1..3, step in 1..3, length = 4
 *  - max height ≤ MAX_HEIGHT (8) so every tower fits the camera frame
 *  - gapIndex in 1..length-1 (NEVER 0 — index 0 gives leading context for the rule)
 */
export interface PatternCompleteProblem {
  /** All four tower heights, e.g. [2,4,6,8]. */
  heights: number[];
  /** Which tower is empty (1..length-1). */
  gapIndex: number;
  /** The height the missing tower should be (= heights[gapIndex]). */
  missing: number;
}

export const SEQUENCE_LENGTH = 4;
export const MAX_HEIGHT = 8;
export const MIN_START = 1;
export const MAX_START = 3;
export const MIN_STEP = 1;
export const MAX_STEP = 3;

/** Build the arithmetic sequence heights[i] = start + i*step. */
function buildHeights(start: number, step: number, length: number): number[] {
  const heights: number[] = [];
  for (let i = 0; i < length; i++) heights.push(start + i * step);
  return heights;
}

/** A strict integer in the valid count range (rejects floats/NaN/etc). */
function isValidHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function createPatternCompleteGenerator(): ProblemGenerator<PatternCompleteProblem> {
  return {
    next(): PatternCompleteProblem {
      // Resample until the whole sequence fits within MAX_HEIGHT.
      let start = MIN_START;
      let step = MIN_STEP;
      let heights: number[] = [];
      do {
        start = MIN_START + Math.floor(Math.random() * (MAX_START - MIN_START + 1));
        step = MIN_STEP + Math.floor(Math.random() * (MAX_STEP - MIN_STEP + 1));
        heights = buildHeights(start, step, SEQUENCE_LENGTH);
      } while (heights[SEQUENCE_LENGTH - 1] > MAX_HEIGHT);

      // Gap is an interior/trailing tower (1..length-1), never index 0.
      const gapIndex = 1 + Math.floor(Math.random() * (SEQUENCE_LENGTH - 1));
      const missing = heights[gapIndex];
      return { heights, gapIndex, missing };
    },
    check(problem: PatternCompleteProblem, answer: unknown): boolean {
      if (!isValidHeight(answer)) return false; // rejects NaN, null, float, object, string
      return answer === problem.missing;
    },
  };
}
