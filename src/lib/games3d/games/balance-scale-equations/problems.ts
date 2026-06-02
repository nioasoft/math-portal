import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * BALANCE SCALE EQUATIONS — the meaning of "=".
 *
 * The LEFT pan holds 1–3 GIVEN numbered weight-cubes summing to a target `L`.
 * The child BUILDS the RIGHT pan with weights from the denominations {1,2,5,10}
 * so the two sides are EQUAL (rightTotal === L). Many right combinations are
 * valid — anything that sums to `L` is correct, which is the whole lesson about
 * equivalence ("there are many ways to make the same amount").
 *
 * This is DISTINCT from algebra-balance: there the scale starts balanced and the
 * child REMOVES equal amounts from both sides to isolate an unknown. HERE the
 * left is fixed and READ, and the child MATCHES it on the right from scratch.
 */
export interface BalanceScaleProblem {
  /** The given weight-cubes on the LEFT pan (1–3 cubes, each value 1..15, each ≥1). */
  leftCubes: number[];
  /** Their sum — the value the right pan must match. L ∈ 3..30. */
  target: number;
}

/**
 * The child's answer = the live RIGHT-pan configuration when they press Check:
 * how many weights of each denomination are on the pan, plus the running total.
 */
export interface BalanceScaleAnswer {
  /** Count of weights placed per denomination (keyed by the denom value). */
  counts: Record<number, number>;
  /** The right-pan total (sum of denom × count). */
  total: number;
}

/** The denominations available to BUILD the right pan. */
export const DENOMINATIONS = [1, 2, 5, 10] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export const MIN_TARGET = 3;
export const MAX_TARGET = 30;
export const MIN_CUBE = 1;
export const MAX_CUBE = 15;
export const MIN_CUBES = 1;
export const MAX_CUBES = 3;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sum of a counts map over the standard denominations (ignores stray keys). */
export function countsTotal(counts: Record<number, number>): number {
  let sum = 0;
  for (const d of DENOMINATIONS) {
    const c = counts[d];
    if (typeof c === 'number' && Number.isFinite(c)) sum += d * c;
  }
  return sum;
}

/** A fresh, empty right-pan counts map (right pan starts EMPTY → total 0 ≠ L). */
export function emptyCounts(): Record<Denomination, number> {
  return { 1: 0, 2: 0, 5: 0, 10: 0 };
}

function isBalanceScaleAnswer(a: unknown): a is BalanceScaleAnswer {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return false;
  const o = a as Record<string, unknown>;
  if (typeof o.total !== 'number' || !Number.isFinite(o.total)) return false;
  if (typeof o.counts !== 'object' || o.counts === null) return false;
  return true;
}

/**
 * Grade a Check. STRICT: correct ⟺ the right-pan total equals the target `L`.
 *
 * We trust `answer.total` ONLY if it is internally consistent with `answer.counts`
 * (re-derive the total from the counts and compare) — this rejects spoofed totals,
 * wrong shapes, NaN, and stray fields. Then correct ⟺ derived total === target.
 */
export function checkBalance(problem: BalanceScaleProblem, answer: unknown): boolean {
  if (!isBalanceScaleAnswer(answer)) return false;
  const derived = countsTotal(answer.counts);
  if (derived !== answer.total) return false; // consistency guard
  return derived === problem.target;
}

/**
 * Partition `target` into `count` positive parts, each in [MIN_CUBE, MAX_CUBE].
 * Returns null if no valid partition exists (caller retries with another count).
 */
function partition(target: number, count: number): number[] | null {
  if (count < 1) return null;
  if (count * MIN_CUBE > target || count * MAX_CUBE < target) return null;
  const parts: number[] = [];
  let remaining = target;
  for (let i = 0; i < count; i++) {
    const slotsLeft = count - i - 1;
    // Keep enough room for the remaining slots to each land in [MIN_CUBE, MAX_CUBE].
    const min = Math.max(MIN_CUBE, remaining - slotsLeft * MAX_CUBE);
    const max = Math.min(MAX_CUBE, remaining - slotsLeft * MIN_CUBE);
    if (min > max) return null;
    const value = i === count - 1 ? remaining : randInt(min, max);
    parts.push(value);
    remaining -= value;
  }
  return remaining === 0 ? parts : null;
}

export function createBalanceScaleGenerator(): ProblemGenerator<BalanceScaleProblem> {
  return {
    next(): BalanceScaleProblem {
      const target = randInt(MIN_TARGET, MAX_TARGET); // L ∈ 3..30, non-degenerate
      // Pick a cube-count that can actually represent `target`, then partition.
      for (let attempt = 0; attempt < 24; attempt++) {
        const count = randInt(MIN_CUBES, MAX_CUBES);
        const parts = partition(target, count);
        if (parts) return { leftCubes: parts, target };
      }
      // Deterministic fallback (always valid for target ≤ MAX_CUBE*MAX_CUBES = 45):
      // greedily chunk into ≤ MAX_CUBE pieces.
      const parts: number[] = [];
      let remaining = target;
      while (remaining > 0) {
        const take = Math.min(MAX_CUBE, remaining);
        parts.push(take);
        remaining -= take;
      }
      return { leftCubes: parts, target };
    },
    check(problem: BalanceScaleProblem, answer: unknown): boolean {
      return checkBalance(problem, answer);
    },
  };
}
