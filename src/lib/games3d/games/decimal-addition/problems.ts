import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * An "add two decimals" problem. The child sees two decimal numbers stacked
 * and must build the sum digit-by-digit (ones, tenths, hundredths). Carrying
 * between places is required. Values stored as integer hundredths to avoid
 * floating-point issues.
 */
export interface DecimalAdditionProblem {
  /** First operand as integer hundredths (10..499 → 0.10..4.99). */
  aHundredths: number;
  /** Second operand as integer hundredths (10..499). */
  bHundredths: number;
}

/** What the child has built: a digit in each place. */
export interface DecimalDigits {
  ones: number;
  tenths: number;
  hundredths: number;
}

export const MIN_OPERAND = 10;  // 0.10
export const MAX_OPERAND = 499; // 4.99
export const MAX_SUM = 999;     // 9.99

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

export function valueOfHundredths(d: DecimalDigits): number {
  return d.ones * 100 + d.tenths * 10 + d.hundredths;
}

export function formatHundredths(h: number): string {
  const n = Math.max(0, Math.floor(h));
  const ones = Math.floor(n / 100);
  const tenths = Math.floor((n % 100) / 10);
  const hundredths = n % 10;
  if (hundredths > 0) return `${ones}.${tenths}${hundredths}`;
  if (tenths > 0) return `${ones}.${tenths}`;
  return `${ones}`;
}

export function createDecimalAdditionGenerator(): ProblemGenerator<DecimalAdditionProblem> {
  return {
    next(): DecimalAdditionProblem {
      const aHundredths = MIN_OPERAND + Math.floor(Math.random() * (MAX_OPERAND - MIN_OPERAND + 1));
      const bHundredths = MIN_OPERAND + Math.floor(Math.random() * (MAX_OPERAND - MIN_OPERAND + 1));
      return { aHundredths, bHundredths };
    },
    check(problem: DecimalAdditionProblem, answer: unknown): boolean {
      if (!isDecimalDigits(answer)) return false;
      const expected = problem.aHundredths + problem.bHundredths;
      return valueOfHundredths(answer) === expected;
    },
  };
}
