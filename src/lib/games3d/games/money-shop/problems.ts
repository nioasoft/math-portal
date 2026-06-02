import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Israeli shekel denominations the child can place on the tray. Whole-shekel,
 * grade-appropriate: coins ₪1/₪2/₪5/₪10 and bills ₪20/₪50. Ascending so the UI
 * can lay out controls in a stable order. ₪1 is always present, which guarantees
 * EVERY target in [MIN_TARGET, MAX_TARGET] is reachable (worst case: target ₪1
 * coins), so no problem is ever degenerate/unsolvable.
 */
export const DENOMINATIONS = [1, 2, 5, 10, 20, 50] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export const MIN_TARGET = 1;
export const MAX_TARGET = 99;

export interface MoneyShopProblem {
  /** The exact amount (in ₪) the child must pay. */
  target: number;
}

/** The multiset of coins/bills currently on the tray: count per denomination. */
export type TrayCounts = Record<Denomination, number>;

export interface MoneyShopAnswer {
  counts: TrayCounts;
  /** Sum of every coin/bill on the tray (denomination × count). */
  total: number;
}

export function emptyTray(): TrayCounts {
  return { 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0 };
}

/** Sum of all denominations on the tray (denomination × count). */
export function trayTotal(counts: TrayCounts): number {
  let sum = 0;
  for (const d of DENOMINATIONS) sum += d * counts[d];
  return sum;
}

function isMoneyShopAnswer(a: unknown): a is MoneyShopAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const obj = a as { total?: unknown };
  return typeof obj.total === 'number' && Number.isFinite(obj.total);
}

/**
 * Generator for "pay exactly ₪N". The target is a whole number in
 * [MIN_TARGET, MAX_TARGET]; because ₪1 coins exist, every target is reachable
 * with the available denominations. The child does NOT need the minimal-coins
 * solution — ANY combination summing to the target is correct.
 */
export function createMoneyShopGenerator(): ProblemGenerator<MoneyShopProblem> {
  return {
    next(): MoneyShopProblem {
      const target = MIN_TARGET + Math.floor(Math.random() * (MAX_TARGET - MIN_TARGET + 1));
      return { target };
    },
    /**
     * STRICT: correct iff the tray total equals the target exactly. Rejects wrong
     * totals (incl. off-by-one), wrong types, NaN/null/objects without a numeric
     * total. The combination of denominations is irrelevant — only the sum.
     */
    check(problem: MoneyShopProblem, answer: unknown): boolean {
      if (!isMoneyShopAnswer(answer)) return false;
      return answer.total === problem.target;
    },
  };
}
