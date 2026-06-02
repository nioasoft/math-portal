import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * WEIGHT BALANCE — mass measurement with gram weights.
 *
 * A fruit of a KNOWN mass `target` (in grams) sits on the LEFT pan of a market
 * balance. The child BUILDS the RIGHT pan with brass gram weights of the
 * denominations {1, 10, 100} (place value in grams) so the right total equals
 * the fruit's mass. The beam tilts by (rightTotal − target); LEVEL when equal.
 *
 * Because a 1 g weight exists, EVERY target is reachable (worst case: target ones),
 * so no problem is ever degenerate/unsolvable. Many combinations sum to the same
 * target (e.g. 235 g = 2×100 + 3×10 + 5×1) — ANY combination summing to the target
 * is correct, which is the lesson about composing a measurement from place values.
 */

/** Gram-weight denominations the child can place on the right pan. */
export const DENOMINATIONS = [1, 10, 100] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

// Targets land on 5 g steps in 100..900 so the task is meaty but reachable with a
// reasonable number of weights (and the ones-place stays small enough to read).
export const MIN_TARGET = 100;
export const MAX_TARGET = 900;
export const TARGET_STEP = 5;

export interface WeightBalanceProblem {
  /** The fruit's mass in grams (the value the right pan must match). */
  target: number;
  /** A label picking which procedural fruit to show (purely cosmetic). */
  fruit: FruitKind;
}

export type FruitKind = 'watermelon' | 'apple' | 'pumpkin' | 'melon';
export const FRUITS: FruitKind[] = ['watermelon', 'apple', 'pumpkin', 'melon'];

/** The multiset of gram weights on the right pan: count per denomination. */
export type WeightCounts = Record<Denomination, number>;

export interface WeightBalanceAnswer {
  counts: WeightCounts;
  /** Sum of all weights on the right pan (denomination × count), in grams. */
  total: number;
}

/** A fresh, empty right pan (total 0 ≠ target, so it never opens already solved). */
export function emptyWeights(): WeightCounts {
  return { 1: 0, 10: 0, 100: 0 };
}

/** Sum of all gram weights on the right pan (ignores stray/non-finite keys). */
export function weightsTotal(counts: Record<number, number>): number {
  let sum = 0;
  for (const d of DENOMINATIONS) {
    const c = counts[d];
    if (typeof c === 'number' && Number.isFinite(c)) sum += d * c;
  }
  return sum;
}

function isWeightBalanceAnswer(a: unknown): a is WeightBalanceAnswer {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return false;
  const o = a as Record<string, unknown>;
  if (typeof o.total !== 'number' || !Number.isFinite(o.total)) return false;
  if (typeof o.counts !== 'object' || o.counts === null) return false;
  return true;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generator for "balance the fruit — N grams". The target is a multiple of
 * TARGET_STEP in [MIN_TARGET, MAX_TARGET]; because 1 g weights exist, every target
 * is reachable. The child does NOT need the minimal-weights solution — ANY
 * combination of {1,10,100} summing to the target is correct.
 */
export function createWeightBalanceGenerator(): ProblemGenerator<WeightBalanceProblem> {
  return {
    next(): WeightBalanceProblem {
      const steps = (MAX_TARGET - MIN_TARGET) / TARGET_STEP;
      const target = MIN_TARGET + randInt(0, steps) * TARGET_STEP;
      const fruit = FRUITS[randInt(0, FRUITS.length - 1)];
      return { target, fruit };
    },
    /**
     * STRICT: correct ⟺ the right-pan total equals the target exactly. We re-derive
     * the total from `answer.counts` and require it to match `answer.total` (rejects
     * spoofed totals), then require that derived total === target. Rejects wrong
     * totals (incl. off-by-one), wrong types, NaN/null, arrays, and objects without
     * a numeric total.
     */
    check(problem: WeightBalanceProblem, answer: unknown): boolean {
      if (!isWeightBalanceAnswer(answer)) return false;
      const derived = weightsTotal(answer.counts);
      if (derived !== answer.total) return false; // consistency guard
      return derived === problem.target;
    },
  };
}
