import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A fraction target/answer: a numerator over a denominator. We compare by VALUE
 * (cross-multiply) so equivalent fractions (2/4 ≡ 1/2) count as the same point on
 * the line — that's the equivalent-fractions teaching goal. Never compared via
 * floats; always integer cross-multiplication.
 */
export interface FractionTarget {
  num: number;
  den: number;
}

/** Grade 3 keeps denominators small and friendly. */
export const GRADE_3_DENOMINATORS = [2, 3, 4] as const;
/** Grade 4 opens up to eighths. */
export const GRADE_4_MAX_DENOMINATOR = 8;

export interface GeneratorOptions {
  /** 3 → {2,3,4}; anything else → 2..8. Defaults to grade 4. */
  grade?: number;
}

/** True when `value` is an object with finite-integer-ish numeric `num`/`den`. */
function isFractionLike(value: unknown): value is FractionTarget {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as { num: unknown; den: unknown };
  return (
    typeof f.num === 'number' &&
    typeof f.den === 'number' &&
    Number.isFinite(f.num) &&
    Number.isFinite(f.den)
  );
}

/**
 * VALUE equality of two fractions via integer cross-multiplication
 * (a.num·b.den === b.num·a.den). No floats. A zero denominator makes the value
 * undefined → returns false (never a false-positive, never a divide-by-zero).
 * So 2/4 equals 1/2, but 1/3 does not equal 1/2.
 */
export function fractionsEqual(a: FractionTarget, b: FractionTarget): boolean {
  if (a.den === 0 || b.den === 0) return false;
  return a.num * b.den === b.num * a.den;
}

function denominatorsForGrade(grade: number): number[] {
  if (grade <= 3) return [...GRADE_3_DENOMINATORS];
  const dens: number[] = [];
  for (let d = 2; d <= GRADE_4_MAX_DENOMINATOR; d++) dens.push(d);
  return dens;
}

/**
 * Pure, testable fraction-number-line problem source. Each target is a proper-ish
 * fraction num/den with den in the grade's set and num in 1..den (never 0/den —
 * a degenerate target). `check()` is strictly VALUE-based so any equivalent
 * placement is accepted.
 */
export function createFractionNumberLineGenerator(
  options: GeneratorOptions = {}
): ProblemGenerator<FractionTarget> {
  const dens = denominatorsForGrade(options.grade ?? 4);
  return {
    next(): FractionTarget {
      const den = dens[Math.floor(Math.random() * dens.length)];
      // numerator 1..den (inclusive) → never 0 (degenerate) and never > den.
      const num = Math.floor(Math.random() * den) + 1;
      return { num, den };
    },
    check(problem: FractionTarget, answer: unknown): boolean {
      if (!isFractionLike(answer)) return false;
      return fractionsEqual({ num: problem.num, den: problem.den }, answer);
    },
  };
}
