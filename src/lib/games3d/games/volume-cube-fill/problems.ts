import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Volume Builder problem: build a rectangular box of unit cubes whose volume
 * (length × width × height) equals the TARGET. The check is BY VALUE — any
 * box whose L·W·H equals the target is correct (so for 24 both 2×3×4 and
 * 1×4×6 pass), which teaches factors / equivalent boxes.
 */
export interface VolumeProblem {
  /** Target volume in unit cubes. */
  target: number;
}

export interface BoxAnswer {
  length: number;
  width: number;
  height: number;
}

/** Each dimension is capped so the grid stays ≤ 6·6·6 = 216 cubes (perf). */
export const MAX_DIM = 6;
export const MIN_DIM = 1;

function isBoxAnswer(a: unknown): a is BoxAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const b = a as Record<string, unknown>;
  return (
    typeof b.length === 'number' &&
    typeof b.width === 'number' &&
    typeof b.height === 'number'
  );
}

function isPositiveInt(n: number): boolean {
  return Number.isInteger(n) && n >= 1;
}

export function createVolumeCubeFillGenerator(): ProblemGenerator<VolumeProblem> {
  return {
    next(): VolumeProblem {
      // Pick three dims in 1..MAX_DIM, target = their product. Reject the
      // degenerate target 1 (which would force 1×1×1) so a wrong answer is
      // always genuinely possible; retry until target ≥ 2.
      let target = 1;
      while (target < 2) {
        const l = Math.floor(Math.random() * MAX_DIM) + 1;
        const w = Math.floor(Math.random() * MAX_DIM) + 1;
        const h = Math.floor(Math.random() * MAX_DIM) + 1;
        target = l * w * h;
      }
      return { target };
    },
    check(problem: VolumeProblem, answer: unknown): boolean {
      if (!isBoxAnswer(answer)) return false;
      const { length, width, height } = answer;
      // Strict: integers only, in range, exact product match.
      if (!isPositiveInt(length) || !isPositiveInt(width) || !isPositiveInt(height)) return false;
      if (length > MAX_DIM || width > MAX_DIM || height > MAX_DIM) return false;
      return length * width * height === problem.target;
    },
  };
}
