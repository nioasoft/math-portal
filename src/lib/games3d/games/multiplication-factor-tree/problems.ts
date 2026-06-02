import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Factor Tree: the child splits a composite number N into a product of two
 * factors a × b (b = N / a). The answer is the LEFT factor `a` the child dials
 * in; b is derived. A correct split requires `a` to be a PROPER factor of N
 * (1 < a < N and a divides N evenly) — there are many valid answers per N.
 */
export interface FactorTreeProblem {
  /** The composite number to split. */
  n: number;
}

/** Composite numbers with at least one proper factor pair (each is divisible). */
export const COMPOSITES = [12, 15, 16, 18, 20, 24, 28, 36] as const;

/**
 * True iff `a` is a PROPER factor of `n`: an integer strictly between 1 and n
 * that divides n evenly. Rejects the trivial factors 1 and n, non-integers,
 * NaN, and out-of-range values. Pure + total — the single source of truth used
 * by both the generator's check() and the game's correctness logic.
 */
export function isProperFactor(n: number, a: number): boolean {
  return (
    typeof a === 'number' &&
    Number.isInteger(a) &&
    a > 1 &&
    a < n &&
    n % a === 0
  );
}

export function createMultiplicationFactorTreeGenerator(): ProblemGenerator<FactorTreeProblem> {
  return {
    next(): FactorTreeProblem {
      const n = COMPOSITES[Math.floor(Math.random() * COMPOSITES.length)];
      return { n };
    },
    check(problem: FactorTreeProblem, answer: unknown): boolean {
      // STRICT: only a real proper factor passes. Rejects NaN/null/objects/floats.
      if (typeof answer !== 'number') return false;
      return isProperFactor(problem.n, answer);
    },
  };
}
