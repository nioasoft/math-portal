import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A number-sequence problem: a short ARITHMETIC or GEOMETRIC sequence with ONE
 * missing term. The child must work out the rule (add d / multiply by r) and
 * supply the missing value.
 *
 * - `terms` is the full, correct sequence (4–5 terms).
 * - `missingIndex` is the position the child must fill (0-based, random — not
 *   always the last).
 * - `answer` is the true value at `missingIndex` (terms[missingIndex]).
 *
 * Invariants enforced by the generator (and asserted by the tests):
 *   - all terms are positive integers (≥ 1)
 *   - the missing value (answer) is ≥ 1 and ≤ MAX_VALUE (~24), kept small so a
 *     young child can reach it with the −/+ buttons
 *   - arithmetic: first 1..8, common difference d in 1..5, length 4 or 5
 *   - geometric: ratio 2 or 3 with small terms (e.g. 1,2,4,8 / 3,6,12,24 / 2,6,18),
 *     last term ≤ MAX_VALUE
 */
export interface NumberSequenceProblem {
  kind: 'arithmetic' | 'geometric';
  terms: number[];
  missingIndex: number;
  answer: number;
}

/** Upper bound for every term (and therefore the missing value). */
export const MAX_VALUE = 24;
/** Sequence lengths we generate. */
export const MIN_LENGTH = 4;
export const MAX_LENGTH = 5;

/** Inclusive integer in [min, max]. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Build a valid arithmetic sequence (first 1..8, d 1..5) capped at MAX_VALUE. */
function makeArithmetic(): number[] {
  // Loop until the whole sequence stays within bounds (small search space).
  for (;;) {
    const length = randInt(MIN_LENGTH, MAX_LENGTH);
    const first = randInt(1, 8);
    const d = randInt(1, 5);
    const last = first + d * (length - 1);
    if (last <= MAX_VALUE) {
      const terms: number[] = [];
      for (let i = 0; i < length; i++) terms.push(first + d * i);
      return terms;
    }
  }
}

/**
 * Build a valid geometric sequence. We pick a ratio (2 or 3) and a first term so
 * the last term stays ≤ MAX_VALUE and all terms are positive integers.
 *   ratio 2 → 1,2,4,8,16 / 2,4,8,16 / 1,2,4,8 / 3,6,12,24
 *   ratio 3 → 1,3,9 (extended) / 2,6,18 / 1,3,9,27(>24 rejected)
 */
function makeGeometric(): number[] {
  for (;;) {
    const ratio = Math.random() < 0.5 ? 2 : 3;
    // Length 3 or 4 — geometric grows fast, so keep it short to stay ≤ MAX_VALUE.
    const length = randInt(3, 4);
    // Small first terms only.
    const first = randInt(1, 3);
    const last = first * ratio ** (length - 1);
    if (last <= MAX_VALUE) {
      const terms: number[] = [];
      for (let i = 0; i < length; i++) terms.push(first * ratio ** i);
      return terms;
    }
  }
}

function isFiniteInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && Number.isFinite(v);
}

export function createNumberSequenceGenerator(): ProblemGenerator<NumberSequenceProblem> {
  return {
    next(): NumberSequenceProblem {
      const kind: 'arithmetic' | 'geometric' = Math.random() < 0.5 ? 'arithmetic' : 'geometric';
      const terms = kind === 'arithmetic' ? makeArithmetic() : makeGeometric();
      // Random missing position — never always the last one.
      const missingIndex = randInt(0, terms.length - 1);
      return { kind, terms, missingIndex, answer: terms[missingIndex] };
    },
    /**
     * STRICT: correct ⟺ the supplied number exactly equals the true missing term.
     * Rejects wrong values, off-by-one, wrong types, NaN/null/objects.
     */
    check(problem: NumberSequenceProblem, answer: unknown): boolean {
      if (!isFiniteInteger(answer)) return false;
      return answer === problem.answer;
    },
  };
}
