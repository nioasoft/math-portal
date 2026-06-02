import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A target angle (in whole degrees) to build with the movable laser ray. The
 * answer the child commits is a single number (the current angle in degrees),
 * so the problem is the target and the answer is the built angle.
 */
export interface AngleProblem {
  /** Target angle in degrees — always a multiple of STEP_DEGREES in MIN..MAX. */
  target: number;
}

/** Angle granularity (degrees) the child sets with −/+ and drag-snapping. */
export const STEP_DEGREES = 15;
/** Smallest target (degrees). Strictly > 0 so the ray never opens already solved at 0°. */
export const MIN_TARGET = 15;
/** Largest target (degrees). Stays < 180 so a movable ray remains on-screen. */
export const MAX_TARGET = 165;

/** Number of distinct targets on the 15° grid in 15..165 (= 11). */
const TARGET_COUNT = (MAX_TARGET - MIN_TARGET) / STEP_DEGREES + 1;

/** Type guard: a finite number (the built angle in degrees). Rejects NaN/objects/strings. */
function isAngle(a: unknown): a is number {
  return typeof a === 'number' && Number.isFinite(a);
}

/**
 * Pure, testable target source for the Angle Builder game.
 *
 * `next()` yields a random target that is a multiple of 15° in 15..165 (always
 * solvable: the movable ray steps in 15° and clamps to 0..180). `check()` is
 * STRICT — the built angle is correct ONLY when it equals the target exactly, so
 * a wrong angle (off-by-15, any non-multiple, malformed/NaN/object) genuinely fails.
 */
export function createAngleGenerator(): ProblemGenerator<AngleProblem> {
  return {
    next(): AngleProblem {
      const target = MIN_TARGET + Math.floor(Math.random() * TARGET_COUNT) * STEP_DEGREES;
      return { target };
    },
    check(problem: AngleProblem, answer: unknown): boolean {
      if (!isAngle(answer)) return false;
      return answer === problem.target;
    },
  };
}
