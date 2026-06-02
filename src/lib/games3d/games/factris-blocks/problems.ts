import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Factris (פקטריס): a fixed AREA of unit blocks must be reshaped to fill a
 * warehouse shelf slot of a given width. The child reads the slot width from the
 * 3D scene (it is NOT in the prompt) and sets the block's WIDTH so the A blocks
 * form a clean rectangle exactly as wide as the slot.
 *
 * A problem is { area, slotW } where slotW is a PROPER divisor of area (so the
 * fill is clean: height = area / slotW is an integer). The answer is the chosen
 * width W; correct ⟺ W === slotW. A wrong width either does not match the slot
 * width or leaves a RAGGED (incomplete) top row when area % W !== 0.
 */
export interface FactrisProblem {
  /** Total number of unit blocks to arrange (area = width × height). */
  area: number;
  /** The target slot width — a proper divisor of area, read from the scene. */
  slotW: number;
}

/** Inclusive bounds the generator stays within (tests assert these). */
export const MIN_AREA = 6;
export const MAX_AREA = 36;
/** Max stack HEIGHT (= area / slotW) so the tower stays a reasonable height. */
export const MAX_HEIGHT = 8;
/** Widest a slot may be — keeps the shelf readable and reachable by the controls. */
export const MAX_SLOT_WIDTH = 9;
/** Widest a block can be reshaped to (headroom above MAX_SLOT_WIDTH to overshoot). */
export const MAX_WIDTH = 12;

/**
 * Proper divisors d of `area` usable as a slot width:
 *   2 ≤ d ≤ area/2  (non-degenerate: never 1×A or A×1)
 *   area / d ≤ MAX_HEIGHT  (the stack is not absurdly tall)
 *   d ≤ MAX_SLOT_WIDTH  (the slot stays reachable with the width controls)
 */
export function slotCandidates(area: number): number[] {
  const out: number[] = [];
  const maxD = Math.min(Math.floor(area / 2), MAX_SLOT_WIDTH);
  for (let d = 2; d <= maxD; d++) {
    if (area % d !== 0) continue;
    if (area / d > MAX_HEIGHT) continue;
    out.push(d);
  }
  return out;
}

/** Areas in range that have at least one usable slot width. */
function solvableAreas(): number[] {
  const out: number[] = [];
  for (let a = MIN_AREA; a <= MAX_AREA; a++) {
    if (slotCandidates(a).length > 0) out.push(a);
  }
  return out;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createFactrisGenerator(): ProblemGenerator<FactrisProblem> {
  const areas = solvableAreas();
  return {
    next(): FactrisProblem {
      const area = pick(areas);
      const slotW = pick(slotCandidates(area));
      return { area, slotW };
    },
    check(problem: FactrisProblem, answer: unknown): boolean {
      // STRICT: reject NaN/null/objects/non-integers; correct ⟺ width === slotW.
      if (typeof answer !== 'number') return false;
      if (!Number.isInteger(answer)) return false;
      return answer === problem.slotW;
    },
  };
}
