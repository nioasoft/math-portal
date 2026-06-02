import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "measure the object" problem. The object lies on a 0..RULER_MAX cm ruler with
 * its LEFT end at `start` cm (often > 0, to teach that length is a DIFFERENCE, not
 * just the right-hand reading) and its right end at `start + length`. The child
 * must align two edge markers to the object's actual ends; success requires BOTH
 * the left marker at `start` AND the right marker at `start + length`.
 */
export interface RulerProblem {
  /** Left end of the object on the ruler, in cm. 0..START_MAX. */
  start: number;
  /** True length of the object, in cm. LENGTH_MIN..LENGTH_MAX. */
  length: number;
}

/** Where the two edge markers currently sit, in cm. */
export interface MarkerAnswer {
  left: number;
  right: number;
}

export const RULER_MAX = 20; // ruler spans 0..20 cm
export const START_MAX = 6; // object's left end can be 0..6 cm
export const LENGTH_MIN = 2; // non-degenerate: at least 2 cm
export const LENGTH_MAX = 12; // longest object

function isMarkerAnswer(a: unknown): a is MarkerAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const m = a as Record<string, unknown>;
  return (
    typeof m.left === 'number' &&
    typeof m.right === 'number' &&
    Number.isFinite(m.left) &&
    Number.isFinite(m.right)
  );
}

/**
 * Generate a valid problem: start in 0..START_MAX, length in LENGTH_MIN..LENGTH_MAX,
 * with start + length <= RULER_MAX so the whole object fits on the ruler.
 */
export function createRulerMeasureGenerator(): ProblemGenerator<RulerProblem> {
  return {
    next(): RulerProblem {
      const start = Math.floor(Math.random() * (START_MAX + 1)); // 0..START_MAX
      // Longest length that still fits past this start.
      const maxLen = Math.min(LENGTH_MAX, RULER_MAX - start);
      const span = maxLen - LENGTH_MIN; // >= 0 because START_MAX + LENGTH_MIN <= RULER_MAX
      const length = LENGTH_MIN + Math.floor(Math.random() * (span + 1));
      return { start, length };
    },
    /**
     * STRICT check: correct ⟺ the left marker sits on the object's left end AND the
     * right marker on its right end. A child who reads the length as the right-hand
     * number (left marker left at 0) is WRONG — that is the misconception this
     * teaches. Rejects non-objects, NaN/null, wrong types, and off-by-one.
     */
    check(problem: RulerProblem, answer: unknown): boolean {
      if (!isMarkerAnswer(answer)) return false;
      return answer.left === problem.start && answer.right === problem.start + problem.length;
    },
  };
}
