import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A column-addition problem: the child must BUILD the sum `a + b` as a number
 * using per-place −/+ controls (ones, tens, hundreds). The prompt only ever
 * shows the task "Add: a + b" — never the live built value, and never the sum.
 */
export interface AdditionProblem {
  a: number;
  b: number;
}

/** What the child has built: how many units sit in each place column. */
export interface PlaceCounts {
  hundreds: number;
  tens: number;
  ones: number;
}

/** Smallest addend — keeps both addends genuinely two-digit (no trivial 1+1). */
export const MIN_ADDEND = 10;
/** Largest addend — caps each at 89 so two addends never exceed MAX_SUM. */
export const MAX_ADDEND = 89;
/** Largest reachable sum (89 + 89 = 178 in practice; 198 is the hard ceiling). */
export const MAX_SUM = 198;
/** Highest count a single place can show before a carry cart bundles it up. */
export const MAX_PER_PLACE = 9;

/** The numeric value of a set of place counts: 100·H + 10·T + 1·O. */
export function valueOf(counts: PlaceCounts): number {
  return counts.hundreds * 100 + counts.tens * 10 + counts.ones;
}

/**
 * Carry/regroup, value-preserving: bundle every group of ten in a lower place
 * into one unit of the next place up (ones→tens, tens→hundreds), leaving each
 * lower place with 0–9. The total numeric value is IDENTICAL before and after —
 * the carry cart never changes the number, only how it's grouped. Hundreds are
 * capped at {@link MAX_PER_PLACE} so the value can never exceed 999; the controls
 * already prevent ever reaching that ceiling (sums top out at MAX_SUM).
 */
export function normalize(counts: PlaceCounts): PlaceCounts {
  let ones = Math.max(0, Math.floor(counts.ones));
  let tens = Math.max(0, Math.floor(counts.tens));
  let hundreds = Math.max(0, Math.floor(counts.hundreds));

  tens += Math.floor(ones / 10);
  ones = ones % 10;

  hundreds += Math.floor(tens / 10);
  tens = tens % 10;

  hundreds = Math.min(MAX_PER_PLACE, hundreds);
  return { hundreds, tens, ones };
}

function isPlaceCounts(a: unknown): a is PlaceCounts {
  if (typeof a !== 'object' || a === null) return false;
  const c = a as Record<string, unknown>;
  return (
    typeof c.hundreds === 'number' &&
    typeof c.tens === 'number' &&
    typeof c.ones === 'number' &&
    Number.isFinite(c.hundreds) &&
    Number.isFinite(c.tens) &&
    Number.isFinite(c.ones)
  );
}

/** Does adding the two addends require a carry out of the ones column? */
export function requiresCarry(p: AdditionProblem): boolean {
  return (p.a % 10) + (p.b % 10) >= 10;
}

/**
 * Problem generator for Addition Mine. Both addends fall in
 * `[MIN_ADDEND, MAX_ADDEND]` and their sum never exceeds {@link MAX_SUM}. To keep
 * the game varied, ~half of the problems require a ones-column carry and ~half do
 * not (we flip a coin and re-roll one addend's ones digit to match) — but the
 * outcome is never forced, so the generated stream is a healthy mix.
 *
 * `check()` is strict: the built counts must compose to EXACTLY `a + b`. An
 * off-by-one fails, and any non-PlaceCounts value (number, null, NaN, plain
 * object missing a place) fails too.
 */
export function createAdditionGenerator(): ProblemGenerator<AdditionProblem> {
  function rollAddend(): number {
    return MIN_ADDEND + Math.floor(Math.random() * (MAX_ADDEND - MIN_ADDEND + 1));
  }
  return {
    next(): AdditionProblem {
      const wantCarry = Math.random() < 0.5;
      for (let attempt = 0; attempt < 64; attempt++) {
        const a = rollAddend();
        const b = rollAddend();
        if (a + b > MAX_SUM) continue;
        const carry = (a % 10) + (b % 10) >= 10;
        if (carry === wantCarry) return { a, b };
      }
      // Fallback: a guaranteed-valid pair (no carry) within range.
      return { a: MIN_ADDEND, b: MIN_ADDEND };
    },
    check(problem: AdditionProblem, answer: unknown): boolean {
      if (!isPlaceCounts(answer)) return false;
      return valueOf(answer) === problem.a + problem.b;
    },
  };
}
