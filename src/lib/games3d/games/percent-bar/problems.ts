import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "fill the stand" target: a single percentage T that is a multiple of 5 in the
 * range 5..95 (never the trivial 0% or 100%). The child fills a stadium stand to
 * exactly T% — the answer is the filled percentage.
 */
export interface PercentTarget {
  /** Target percentage, a multiple of 5 in 5..95. */
  percent: number;
}

export const PERCENT_STEP = 5; // both the target granularity and the ± button step
export const MIN_PERCENT = 5; // never 0 (trivial / opens solved)
export const MAX_PERCENT = 95; // never 100 (trivial)

/** True iff `value` is a finite integer multiple of 5 within [MIN, MAX]. */
function isValidPercent(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value % PERCENT_STEP === 0 &&
    value >= MIN_PERCENT &&
    value <= MAX_PERCENT
  );
}

export function createPercentBarGenerator(): ProblemGenerator<PercentTarget> {
  // Number of distinct multiples of 5 in [5, 95] = 19 (5,10,...,95).
  const STEPS = (MAX_PERCENT - MIN_PERCENT) / PERCENT_STEP + 1;
  return {
    next(): PercentTarget {
      const k = Math.floor(Math.random() * STEPS); // 0..18
      const percent = MIN_PERCENT + k * PERCENT_STEP; // 5..95, multiple of 5
      return { percent };
    },
    /**
     * STRICT: the answer must be the filled percentage exactly equal to the
     * target. Rejects off-by-five (60 for a 65 target), wrong types, NaN/null,
     * objects, and any non-integer / out-of-range value.
     */
    check(problem: PercentTarget, answer: unknown): boolean {
      if (!isValidPercent(answer)) return false;
      return answer === problem.percent;
    },
  };
}
