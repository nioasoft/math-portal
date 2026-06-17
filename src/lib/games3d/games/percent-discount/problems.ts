import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "calculate the sale price" problem. The child sees an original price and a
 * discount percentage, then computes the sale price (original − discount amount).
 * All combinations are chosen so the result is always a clean integer.
 */
export interface PercentDiscountProblem {
  /** Original price before discount. */
  original: number;
  /** Discount percentage (10, 20, 25, 30, 40, or 50). */
  discount: number;
}

/** Prices that yield clean results with all discount percentages. */
const PRICES = [20, 30, 40, 50, 60, 80, 100, 120, 150, 200] as const;
const DISCOUNTS = [10, 20, 25, 30, 40, 50] as const;

/** All valid price/discount pairs that yield a clean integer sale price. */
const VALID_PAIRS: Array<{ original: number; discount: number }> = [];
for (const original of PRICES) {
  for (const discount of DISCOUNTS) {
    const discountAmount = (original * discount) / 100;
    if (Number.isInteger(discountAmount)) {
      VALID_PAIRS.push({ original, discount });
    }
  }
}

export const MIN_SALE_PRICE = 10; // 50% of 20
export const MAX_SALE_PRICE = 180; // 50% of 200 → 100, but 10% of 200 → 180

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function createPercentDiscountGenerator(): ProblemGenerator<PercentDiscountProblem> {
  return {
    next(): PercentDiscountProblem {
      return VALID_PAIRS[Math.floor(Math.random() * VALID_PAIRS.length)];
    },
    check(problem: PercentDiscountProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      const expected = problem.original - Math.round((problem.original * problem.discount) / 100);
      return answer === expected;
    },
  };
}
