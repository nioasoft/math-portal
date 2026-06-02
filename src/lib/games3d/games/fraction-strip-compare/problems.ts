import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Fraction-strip "build an equivalent fraction" problem.
 *
 * The GIVEN fraction is `leftNum/leftDen` (a proper fraction, value < 1). The
 * child builds a SECOND fraction `rightNum/rightDen` with a DIFFERENT
 * denominator that has the SAME value (an equivalent fraction). e.g. given 1/2,
 * a correct answer is 2/4 or 3/6 — but NOT 1/2 (same denominator → a literal
 * copy, not a genuinely different representation).
 */
export interface FractionStripProblem {
  /** Numerator of the given (top) strip. 1..leftDen−1 (proper, value < 1). */
  leftNum: number;
  /** Denominator of the given (top) strip. 2..4. */
  leftDen: number;
}

/** The child's built fraction (the bottom strip). */
export interface StripAnswer {
  num: number;
  den: number;
}

/** Given (top) strip denominator range. */
export const LEFT_DEN_MIN = 2;
export const LEFT_DEN_MAX = 4;
/** Built (bottom) strip denominator range — generous so an equivalent always fits. */
export const RIGHT_DEN_MIN = 2;
export const RIGHT_DEN_MAX = 8;

/** True when `value` is an object with finite-number `num` and `den`. */
function isStripAnswer(value: unknown): value is StripAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as { num: unknown; den: unknown };
  return (
    typeof a.num === 'number' &&
    typeof a.den === 'number' &&
    Number.isFinite(a.num) &&
    Number.isFinite(a.den)
  );
}

/**
 * STRICT correctness for "build an EQUIVALENT fraction with a DIFFERENT
 * denominator":
 *  1. equal VALUE via integer cross-multiplication: rightNum·leftDen === leftNum·rightDen
 *  2. a GENUINELY different representation: rightDen !== leftDen (reject literal copy)
 *  3. well-formed: rightNum ≥ 0, rightDen ≥ 1 (no negative pieces, no zero-cut strip)
 * No floats. Rejects wrong values, same-denominator copies, malformed answers
 * (NaN/null/objects/zero denominator), and off-by-one numerators.
 */
export function isEquivalentDifferentDen(
  problem: FractionStripProblem,
  answer: StripAnswer
): boolean {
  if (!Number.isInteger(answer.num) || !Number.isInteger(answer.den)) return false;
  if (answer.num < 0 || answer.den < 1) return false;
  if (answer.den === problem.leftDen) return false; // same-den copy is not a NEW representation
  return answer.num * problem.leftDen === problem.leftNum * answer.den;
}

/**
 * Pure, testable generator. Each given fraction is a proper fraction
 * leftNum/leftDen with leftDen in 2..4 and leftNum in 1..leftDen−1 (so value is
 * strictly between 0 and 1). An equivalent with a DIFFERENT denominator is
 * GUARANTEED to exist within the right's range: doubling gives 2·leftNum / 2·leftDen
 * with 2·leftDen ≤ 8 = RIGHT_DEN_MAX and 2·leftDen ≠ leftDen.
 */
export function createFractionStripGenerator(): ProblemGenerator<FractionStripProblem> {
  return {
    next(): FractionStripProblem {
      const leftDen = LEFT_DEN_MIN + Math.floor(Math.random() * (LEFT_DEN_MAX - LEFT_DEN_MIN + 1));
      // numerator 1..leftDen−1 → proper, value strictly between 0 and 1.
      const leftNum = 1 + Math.floor(Math.random() * (leftDen - 1));
      return { leftNum, leftDen };
    },
    check(problem: FractionStripProblem, answer: unknown): boolean {
      if (!isStripAnswer(answer)) return false;
      return isEquivalentDifferentDen(problem, answer);
    },
  };
}
