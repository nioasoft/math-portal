import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A column-subtraction problem: the display OPENS showing the minuend `A` as
 * base-ten "bridge stones" in three place columns (hundreds | tens | ones). The
 * child reduces the display down to the difference `A − B` using per-place −/+
 * controls, BORROWING (breaking a higher stone into ten) whenever a column is too
 * small to take one away. The prompt only ever shows the task "Subtract: A − B" —
 * never the live built value, and never the answer.
 */
export interface SubtractionProblem {
  a: number;
  b: number;
}

/** What the bridge currently shows: how many stones sit in each place column. */
export interface PlaceCounts {
  hundreds: number;
  tens: number;
  ones: number;
}

/** Smallest minuend — keeps A genuinely two/three-digit. */
export const MIN_MINUEND = 20;
/** Largest minuend — caps A so the bridge never exceeds three place columns. */
export const MAX_MINUEND = 199;
/** Highest count a single place can show (0..9 after a borrow normalizes). */
export const MAX_PER_PLACE = 9;

/** The numeric value of a set of place counts: 100·H + 10·T + 1·O. */
export function valueOf(counts: PlaceCounts): number {
  return counts.hundreds * 100 + counts.tens * 10 + counts.ones;
}

/** A place column (the borrow chain walks from ones up toward hundreds). */
type Place = 'ones' | 'tens' | 'hundreds';

/** The next-higher place above `place`, or null for hundreds (the top place). */
export function higherPlace(place: Place): Place | null {
  if (place === 'ones') return 'tens';
  if (place === 'tens') return 'hundreds';
  return null;
}

/**
 * BORROW (value-preserving REGROUP): break one stone from the next-higher
 * non-empty place into ten stones in `place`. This only changes how the number is
 * GROUPED — the total numeric value is IDENTICAL before and after. If `place`
 * already has stones, or no higher place has any to break, the counts are
 * returned unchanged.
 *
 * Example: borrowing into `ones` of {tens:5, ones:0} → {tens:4, ones:10}
 * (value 50 unchanged), so a following −1 on ones lands on {tens:4, ones:9} = 49.
 */
export function borrow(counts: PlaceCounts, place: Place): PlaceCounts {
  const higher = higherPlace(place);
  if (higher === null) return counts; // hundreds can't borrow from above
  if (counts[place] > 0) return counts; // only borrow into an empty place
  if (counts[higher] <= 0) {
    // Cascade: the immediate higher place is also empty — fill it first.
    const cascaded = borrow(counts, higher);
    if (cascaded[higher] <= 0) return counts; // nothing above to break → unchanged
    return {
      ...cascaded,
      [higher]: cascaded[higher] - 1,
      [place]: cascaded[place] + 10,
    };
  }
  return {
    ...counts,
    [higher]: counts[higher] - 1,
    [place]: counts[place] + 10,
  };
}

/**
 * Decrement one unit from `place`. If the place has a stone, just remove it.
 * Otherwise BORROW first (break a higher ten into this column) and then remove
 * one — net effect of the borrow-decrement is exactly −1 to the total value, but
 * the representation regroups (e.g. {tens:5,ones:0} → {tens:4,ones:9}, 50→49).
 * Returns the unchanged counts when there is genuinely nothing left to remove
 * (the whole number is already 0).
 */
export function decrement(counts: PlaceCounts, place: Place): PlaceCounts {
  if (counts[place] > 0) {
    return { ...counts, [place]: counts[place] - 1 };
  }
  const borrowed = borrow(counts, place);
  if (borrowed[place] <= 0) return counts; // nothing to borrow → can't go lower
  return { ...borrowed, [place]: borrowed[place] - 1 };
}

/**
 * Increment one unit on `place` (the + button — an UNDO of an over-removal),
 * clamped at {@link MAX_PER_PLACE} with NO carry into a higher place (so + is a
 * pure local fix and never silently changes another column). At the cap it is a
 * no-op.
 */
export function increment(counts: PlaceCounts, place: Place): PlaceCounts {
  if (counts[place] >= MAX_PER_PLACE) return counts;
  return { ...counts, [place]: counts[place] + 1 };
}

/** Split a number 0..999 into its base-ten place counts (each 0..9). */
export function toPlaceCounts(n: number): PlaceCounts {
  const v = Math.max(0, Math.floor(n));
  return {
    hundreds: Math.floor(v / 100) % 10,
    tens: Math.floor(v / 10) % 10,
    ones: v % 10,
  };
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

/** Does `A − B` require a borrow somewhere (ones or tens column too small)? */
export function requiresBorrow(p: SubtractionProblem): boolean {
  const aOnes = p.a % 10;
  const bOnes = p.b % 10;
  if (bOnes > aOnes) return true; // ones borrow
  const aTens = Math.floor(p.a / 10) % 10;
  const bTens = Math.floor(p.b / 10) % 10;
  return bTens > aTens; // tens borrow
}

/**
 * Problem generator for Subtraction Bridge. The minuend `A` falls in
 * `[MIN_MINUEND, MAX_MINUEND]`, the subtrahend `B` in `[1, A]`, and the
 * difference `A − B ≥ 0`. To keep the game meaningful, ~half of the problems
 * REQUIRE a borrow (B's ones digit > A's ones digit, or a tens borrow) — but the
 * outcome is never forced, so the stream stays a healthy, non-degenerate mix.
 * `B ≥ 1` always, so the opening display (A) is never already the answer.
 *
 * `check()` is strict: the built counts must compose to EXACTLY `A − B`. An
 * off-by-one fails, and any non-PlaceCounts value (number, null, NaN, plain
 * object missing a place) fails too.
 */
export function createSubtractionGenerator(): ProblemGenerator<SubtractionProblem> {
  function rollMinuend(): number {
    return MIN_MINUEND + Math.floor(Math.random() * (MAX_MINUEND - MIN_MINUEND + 1));
  }
  return {
    next(): SubtractionProblem {
      const wantBorrow = Math.random() < 0.5;
      for (let attempt = 0; attempt < 64; attempt++) {
        const a = rollMinuend();
        const b = 1 + Math.floor(Math.random() * a); // 1..a (B ≥ 1, A − B ≥ 0)
        if (a - b < 0) continue;
        if (requiresBorrow({ a, b }) === wantBorrow) return { a, b };
      }
      // Fallback: a guaranteed-valid borrow pair within range (21 − 9 = 12).
      return { a: 21, b: 9 };
    },
    check(problem: SubtractionProblem, answer: unknown): boolean {
      if (!isPlaceCounts(answer)) return false;
      return valueOf(answer) === problem.a - problem.b;
    },
  };
}
