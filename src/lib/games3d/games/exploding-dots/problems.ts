import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "build this number" problem for the 1←10 machine (Exploding Dots). The child
 * adds dots to the ONES box; when a box reaches ten dots they EXPLODE into one
 * dot in the next box to the LEFT. `target` is the only thing the prompt ever
 * shows — the live built value is never echoed.
 */
export interface ExplodingDotsProblem {
  target: number;
}

/** What the child has built: how many dots sit in each box of the machine. */
export interface BoxCounts {
  hundreds: number;
  tens: number;
  ones: number;
}

/**
 * Smallest target the game ever asks for. We require at least two digits (≥ 10)
 * so building it ALWAYS involves at least one explosion (ten ones → one ten),
 * which is the whole point of the machine. A single dot in the ones box is never
 * a valid target.
 */
export const MIN_TARGET = 10;
/** Largest target: up to one full hundred plus tens and ones (≤ 199). */
export const MAX_TARGET = 199;
/** Highest dot count a single box can show before it EXPLODES (ten → carry). */
export const EXPLODE_AT = 10;
/** A box settles at 0..9 dots after every explosion has fired. */
export const MAX_PER_BOX = EXPLODE_AT - 1;

/** The numeric value of a set of box counts: 100·H + 10·T + 1·O. */
export function valueOf(counts: BoxCounts): number {
  return counts.hundreds * 100 + counts.tens * 10 + counts.ones;
}

/**
 * Explode / regroup, VALUE-PRESERVING: every group of ten dots in a lower box
 * detonates into one dot in the next box to the left (ones→tens, tens→hundreds),
 * leaving each lower box with 0–9 dots. The total numeric value is identical
 * before and after — an explosion never changes the number, only how the dots
 * are grouped. Hundreds are capped at {@link MAX_PER_BOX} (one machine has three
 * boxes), so the value can never exceed 999; any excess above that is clamped
 * (the controls already prevent ever reaching it).
 */
export function normalize(counts: BoxCounts): BoxCounts {
  let ones = Math.max(0, Math.floor(counts.ones));
  let tens = Math.max(0, Math.floor(counts.tens));
  let hundreds = Math.max(0, Math.floor(counts.hundreds));

  tens += Math.floor(ones / EXPLODE_AT);
  ones = ones % EXPLODE_AT;

  hundreds += Math.floor(tens / EXPLODE_AT);
  tens = tens % EXPLODE_AT;

  hundreds = Math.min(MAX_PER_BOX, hundreds);
  return { hundreds, tens, ones };
}

function isBoxCounts(a: unknown): a is BoxCounts {
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
 * Problem generator for Exploding Dots. Targets fall in `[min, max]` (default
 * {@link MIN_TARGET}..{@link MAX_TARGET}). Every default target is ≥ 10, so it
 * can only be reached by triggering at least one explosion. `check()` is strict:
 * the built boxes must compose to EXACTLY the target — off-by-one fails, and any
 * non-BoxCounts value (number, null, NaN, plain object missing a box) fails too.
 */
export function createExplodingDotsGenerator(
  min: number = MIN_TARGET,
  max: number = MAX_TARGET
): ProblemGenerator<ExplodingDotsProblem> {
  const lo = Math.max(MIN_TARGET, Math.floor(min));
  const hi = Math.min(MAX_TARGET, Math.floor(max));
  const span = Math.max(0, hi - lo);
  return {
    next(): ExplodingDotsProblem {
      const target = lo + Math.floor(Math.random() * (span + 1));
      return { target };
    },
    check(problem: ExplodingDotsProblem, answer: unknown): boolean {
      if (!isBoxCounts(answer)) return false;
      return valueOf(answer) === problem.target;
    },
  };
}
