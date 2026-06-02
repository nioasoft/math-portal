import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/** Largest number on the chart (1..MAX laid out 6 cols × 5 rows). */
export const MAX = 30;
/** Smallest multiplier the child colours the multiples of. */
export const MIN_N = 2;
/** Largest multiplier (n=6 → 5 multiples up to 30 → still non-degenerate). */
export const MAX_N = 6;

export interface HundredChartProblem {
  /** The base whose multiples (in 1..MAX) must be coloured. */
  n: number;
}

/**
 * The multiples of `n` within 1..max, ascending. For n≥2 and max=30 this is
 * always a proper non-empty subset (never all numbers, never empty), so a problem
 * never opens already-solved and a wrong answer is always possible.
 */
export function multiplesOf(n: number, max: number): number[] {
  const out: number[] = [];
  for (let k = n; k <= max; k += n) out.push(k);
  return out;
}

/** True iff `value` is exactly an array of the multiples of n in 1..MAX (set equality). */
function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

/** Type guard: a clean integer array (rejects NaN/null/objects/floats/strings). */
function isIntArray(a: unknown): a is number[] {
  if (!Array.isArray(a)) return false;
  return a.every((x) => typeof x === 'number' && Number.isInteger(x));
}

export function createHundredChartGenerator(): ProblemGenerator<HundredChartProblem> {
  return {
    next(): HundredChartProblem {
      const n = Math.floor(Math.random() * (MAX_N - MIN_N + 1)) + MIN_N; // 2..6
      return { n };
    },
    /**
     * STRICT set equality: the coloured set (the answer) must equal EXACTLY the
     * multiples of n in 1..MAX — no missing multiple, no extra non-multiple. Any
     * duplicate, out-of-range, non-multiple, or missing value fails. Rejects bad
     * types (non-array, NaN, floats, objects).
     */
    check(problem: HundredChartProblem, answer: unknown): boolean {
      if (!isIntArray(answer)) return false;
      // Reject out-of-range or duplicate entries up front (set semantics).
      const set = new Set<number>();
      for (const k of answer) {
        if (k < 1 || k > MAX) return false;
        if (set.has(k)) return false;
        set.add(k);
      }
      const target = multiplesOf(problem.n, MAX);
      return sameSet([...set], target);
    },
  };
}
