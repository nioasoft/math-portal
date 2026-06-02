import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/** A target point on the first-quadrant integer grid. */
export interface CoordinatePlotProblem {
  tx: number;
  ty: number;
}

/** A plotted point answer (the marker's integer grid coordinates). */
export interface PointAnswer {
  x: number;
  y: number;
}

/** Grid spans 0..GRID_MAX on each axis; targets sit at 1..GRID_MAX (never the origin). */
export const GRID_MAX = 8;
export const TARGET_MIN = 1;

/** A strict, finite integer in [min, max]. Rejects NaN, floats, infinities, non-numbers. */
function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isPointAnswer(a: unknown): a is PointAnswer {
  return (
    typeof a === 'object' &&
    a !== null &&
    isIntegerInRange((a as PointAnswer).x, 0, GRID_MAX) &&
    isIntegerInRange((a as PointAnswer).y, 0, GRID_MAX)
  );
}

export function createCoordinatePlotGenerator(): ProblemGenerator<CoordinatePlotProblem> {
  return {
    next(): CoordinatePlotProblem {
      // Both coordinates in TARGET_MIN..GRID_MAX so the origin start is never the answer.
      const span = GRID_MAX - TARGET_MIN + 1;
      const tx = Math.floor(Math.random() * span) + TARGET_MIN;
      const ty = Math.floor(Math.random() * span) + TARGET_MIN;
      return { tx, ty };
    },
    check(problem: CoordinatePlotProblem, answer: unknown): boolean {
      if (!isPointAnswer(answer)) return false;
      // Integer-strict equality on BOTH axes — swapped (y,x) or off-by-one fails.
      return answer.x === problem.tx && answer.y === problem.ty;
    },
  };
}
