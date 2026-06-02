import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Skip-counting problem: count up by `step` (2, 5 or 10) and mark every multiple
 * of `step` from `step` up to and including `target` on a numbered safari track.
 * `target` is always a multiple of `step` with `target / step` (= the number of
 * skips, "k") in {@link MIN_SKIPS}..{@link MAX_SKIPS}, and `target ≤ MAX_TARGET`.
 */
export interface SkipCountProblem {
  step: number;
  target: number;
}

/** Allowed skip sizes — the multiplication-readiness step sizes. */
export const STEPS = [2, 5, 10] as const;
export type SkipStep = (typeof STEPS)[number];

/** Number of skips k = target / step. Keeps tracks non-degenerate but short. */
export const MIN_SKIPS = 3;
export const MAX_SKIPS = 6;

/** Largest target (so the numbered tiles fit the viewport). */
export const MAX_TARGET = 40;

/** Smallest tile value on the track is always 1. */
export const TILE_MIN = 1;

/**
 * The exact set of correct tiles for a problem: {step, 2·step, …, target}.
 * This is the single source of truth used by both the game and `check()`.
 */
export function solutionSet(problem: SkipCountProblem): Set<number> {
  const out = new Set<number>();
  for (let v = problem.step; v <= problem.target; v += problem.step) out.add(v);
  return out;
}

/** Type guard: a marked-set answer is an array of finite integer tile values. */
function isMarkAnswer(a: unknown): a is number[] {
  return (
    Array.isArray(a) &&
    a.every((v) => typeof v === 'number' && Number.isInteger(v) && Number.isFinite(v))
  );
}

export function createSkipCountGenerator(): ProblemGenerator<SkipCountProblem> {
  return {
    next(): SkipCountProblem {
      let step: SkipStep;
      let k: number;
      let target: number;
      // Reject any (step, k) whose product would overflow the track. For step=10
      // only k=3,4 fit (50/60 are too big), so loop until target ≤ MAX_TARGET.
      do {
        step = STEPS[Math.floor(Math.random() * STEPS.length)];
        k = MIN_SKIPS + Math.floor(Math.random() * (MAX_SKIPS - MIN_SKIPS + 1));
        target = step * k;
      } while (target > MAX_TARGET);
      return { step, target };
    },
    check(problem: SkipCountProblem, answer: unknown): boolean {
      if (!isMarkAnswer(answer)) return false;
      const want = solutionSet(problem);
      const got = new Set(answer);
      // Reject duplicates collapsing a wrong count, and any size mismatch.
      if (got.size !== answer.length) return false;
      if (got.size !== want.size) return false;
      for (const v of want) if (!got.has(v)) return false;
      return true;
    },
  };
}
