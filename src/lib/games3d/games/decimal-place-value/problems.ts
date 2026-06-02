import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "build this decimal" problem. The child composes the target decimal from
 * three place jars — ONES, TENTHS, HUNDREDTHS. To dodge floating-point error
 * the value is stored as an INTEGER number of hundredths: `targetHundredths`
 * ranges 1..999 (i.e. 0.01 .. 9.99). The prompt shows only the formatted
 * decimal string; the live built value is never echoed.
 */
export interface DecimalProblem {
  /** Target value as an integer count of hundredths (1..999 → 0.01..9.99). */
  targetHundredths: number;
}

/** What the child has built: a digit (0..9) in each of the three place jars. */
export interface DecimalDigits {
  ones: number;
  tenths: number;
  hundredths: number;
}

/** Smallest target the game ever asks for, in integer hundredths (0.01). */
export const MIN_HUNDREDTHS = 1;
/** Largest target the game ever asks for, in integer hundredths (9.99). */
export const MAX_HUNDREDTHS = 999;
/** Highest digit a single place jar can hold (no carry/regroup here). */
export const MAX_PER_PLACE = 9;

/**
 * The value of a set of place digits as an INTEGER count of hundredths:
 * ones·100 + tenths·10 + hundredths·1. Kept in integer space so 0.1 + 0.2
 * style float error can never make a correct build read as wrong.
 */
export function valueOfHundredths(d: DecimalDigits): number {
  return d.ones * 100 + d.tenths * 10 + d.hundredths;
}

/**
 * Format an integer count of hundredths as a decimal STRING with the point
 * after the ones place. Trailing zeros are TRIMMED for a natural read
 * (347→"3.47", 60→"0.6", 500→"5", 508→"5.08", 0→"0"). Digits stay LTR.
 * Pure + deterministic so it can be unit-tested.
 */
export function formatHundredths(h: number): string {
  const n = Math.max(0, Math.floor(h));
  const ones = Math.floor(n / 100);
  const tenths = Math.floor((n % 100) / 10);
  const hundredths = n % 10;
  if (hundredths > 0) return `${ones}.${tenths}${hundredths}`;
  if (tenths > 0) return `${ones}.${tenths}`;
  return `${ones}`;
}

function isDecimalDigits(a: unknown): a is DecimalDigits {
  if (typeof a !== 'object' || a === null) return false;
  const c = a as Record<string, unknown>;
  return (
    typeof c.ones === 'number' &&
    typeof c.tenths === 'number' &&
    typeof c.hundredths === 'number' &&
    Number.isFinite(c.ones) &&
    Number.isFinite(c.tenths) &&
    Number.isFinite(c.hundredths)
  );
}

/**
 * Problem generator for Decimal Builder. Targets fall in
 * `[MIN_HUNDREDTHS, MAX_HUNDREDTHS]` integer hundredths and are never 0.00
 * (the game opens at 0.00, so the target is always reachable yet never the
 * start). `check()` is strict: the built digits must compose to EXACTLY the
 * target in integer-hundredths space — off-by-one fails, and any non
 * DecimalDigits value (number, null, NaN, plain object missing a place) fails.
 */
export function createDecimalGenerator(
  min: number = MIN_HUNDREDTHS,
  max: number = MAX_HUNDREDTHS
): ProblemGenerator<DecimalProblem> {
  const lo = Math.max(MIN_HUNDREDTHS, Math.floor(min));
  const hi = Math.min(MAX_HUNDREDTHS, Math.floor(max));
  const span = Math.max(0, hi - lo);
  return {
    next(): DecimalProblem {
      const targetHundredths = lo + Math.floor(Math.random() * (span + 1));
      return { targetHundredths };
    },
    check(problem: DecimalProblem, answer: unknown): boolean {
      if (!isDecimalDigits(answer)) return false;
      return valueOfHundredths(answer) === problem.targetHundredths;
    },
  };
}
