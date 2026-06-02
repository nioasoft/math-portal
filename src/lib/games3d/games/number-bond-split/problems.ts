import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A number-bond / part-whole problem: split a whole `target` (T) into two parts
 * A (left) and B (right) such that A + B === T. Many correct splits exist — any
 * pair of non-negative integers summing to T is correct.
 */
export interface NumberBondProblem {
  target: number;
}

/** The child's answer: the two parts they built (left A, right B). */
export interface BondAnswer {
  a: number;
  b: number;
}

// Easy band (grades 1–2): T in 3..10. Harder problems reach up to MAX_TARGET.
export const MIN_TARGET = 3;
export const EASY_MAX_TARGET = 10;
export const MAX_TARGET = 18;

/** True only for a finite, integer answer pair. Rejects NaN/objects/strings. */
function isBondAnswer(a: unknown): a is BondAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const cand = a as Record<string, unknown>;
  return (
    typeof cand.a === 'number' &&
    typeof cand.b === 'number' &&
    Number.isFinite(cand.a) &&
    Number.isFinite(cand.b)
  );
}

/** Random integer in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generator for number-bond problems. ~70% draw from the easy band (3..10) and
 * the rest go up to MAX_TARGET (≤18) for variety. Every target is ≥ 3 so the
 * scene never opens already-solved at A=B=0 (sum 0 ≠ T), and every target has
 * many integer splits (e.g. 0+T, 1+(T-1), …) — never degenerate/unsolvable.
 */
export function createNumberBondGenerator(): ProblemGenerator<NumberBondProblem> {
  return {
    next(): NumberBondProblem {
      const hard = Math.random() < 0.3;
      const max = hard ? MAX_TARGET : EASY_MAX_TARGET;
      return { target: randInt(MIN_TARGET, max) };
    },
    check(problem: NumberBondProblem, answer: unknown): boolean {
      if (!isBondAnswer(answer)) return false;
      // Correct ⟺ the two parts compose the whole. Integer parts required.
      if (!Number.isInteger(answer.a) || !Number.isInteger(answer.b)) return false;
      return answer.a + answer.b === problem.target;
    },
  };
}
