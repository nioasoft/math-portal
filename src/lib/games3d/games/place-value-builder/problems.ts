import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "build this number" problem. The child composes `target` from base-ten
 * blocks across the hundreds / tens / ones columns. `target` is the only thing
 * the prompt ever shows — the live built value is never echoed.
 */
export interface PlaceValueProblem {
  target: number;
}

/** What the child has built: how many blocks sit in each place column. */
export interface PlaceCounts {
  hundreds: number;
  tens: number;
  ones: number;
}

/**
 * Smallest target the game ever asks for. We require at least two digits so a
 * target is never trivial (a single small box) — place value only "reads" once
 * tens are involved. Min 12 also guarantees a non-zero tens digit.
 */
export const MIN_TARGET = 12;
/** Largest target = three full places (hundreds + tens + ones). */
export const MAX_TARGET = 999;
/** Highest count a single place can show before a carry bundles it up. */
export const MAX_PER_PLACE = 9;

/** The numeric value of a set of place counts: 100·H + 10·T + 1·O. */
export function valueOf(counts: PlaceCounts): number {
  return counts.hundreds * 100 + counts.tens * 10 + counts.ones;
}

/**
 * Carry/regroup, value-preserving: bundle every group of ten in a lower place
 * into one block of the next place up (ones→tens, tens→hundreds), leaving each
 * lower place with 0–9. The total numeric value is identical before and after —
 * carrying never changes the number, only how it's grouped. Hundreds are capped
 * at {@link MAX_PER_PLACE} so the value can never exceed {@link MAX_TARGET}; any
 * overflow above that is clamped (the controls already prevent reaching it).
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

/**
 * Problem generator for Place Value Builder. Targets fall in `[min, max]`
 * (default {@link MIN_TARGET}..{@link MAX_TARGET}); a difficulty-scoped range is
 * passed in by the game (e.g. ≤ 99 for grade 2). `check()` is strict: the built
 * counts must compose to EXACTLY the target — off-by-one fails, and any non
 * PlaceCounts value (number, null, NaN, plain object missing a place) fails too.
 */
export function createPlaceValueGenerator(
  min: number = MIN_TARGET,
  max: number = MAX_TARGET
): ProblemGenerator<PlaceValueProblem> {
  const lo = Math.max(MIN_TARGET, Math.floor(min));
  const hi = Math.min(MAX_TARGET, Math.floor(max));
  const span = Math.max(0, hi - lo);
  return {
    next(): PlaceValueProblem {
      const target = lo + Math.floor(Math.random() * (span + 1));
      return { target };
    },
    check(problem: PlaceValueProblem, answer: unknown): boolean {
      if (!isPlaceCounts(answer)) return false;
      return valueOf(answer) === problem.target;
    },
  };
}
