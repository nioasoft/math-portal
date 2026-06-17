import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "place a decimal on a number line" problem. The child sees a target decimal
 * (e.g., 0.37) and must drag a marker to the correct position on a 0→1 line.
 * Internally, values are stored as integer hundredths (1..99) to avoid
 * floating-point issues.
 */
export interface DecimalLineProblem {
  /** Target position as integer hundredths (1..99 → 0.01..0.99). */
  targetHundredths: number;
}

export const MIN_TARGET = 1;   // 0.01
export const MAX_TARGET = 99;  // 0.99
export const TOLERANCE = 2;    // ±0.02 hundredths

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function formatDecimal(hundredths: number): string {
  const ones = Math.floor(hundredths / 100);
  const tenths = Math.floor((hundredths % 100) / 10);
  const h = hundredths % 10;
  if (h > 0) return `${ones}.${tenths}${h}`;
  if (tenths > 0) return `${ones}.${tenths}`;
  return `${ones}`;
}

export function createDecimalLineGenerator(): ProblemGenerator<DecimalLineProblem> {
  const span = MAX_TARGET - MIN_TARGET + 1;
  return {
    next(): DecimalLineProblem {
      const targetHundredths = MIN_TARGET + Math.floor(Math.random() * span);
      return { targetHundredths };
    },
    check(problem: DecimalLineProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      return Math.abs(answer - problem.targetHundredths) <= TOLERANCE;
    },
  };
}
