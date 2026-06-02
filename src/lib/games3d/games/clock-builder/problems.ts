import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A target time on a 12-hour analog clock. `hour` is 1..12, `minute` is a
 * multiple of 5 in 0..55. This doubles as the answer shape the child builds.
 */
export interface ClockTime {
  hour: number;
  minute: number;
}

export interface ClockGeneratorOptions {
  /**
   * Minute granularity of generated targets.
   * - `30` → o'clock + half-past only (minutes ∈ {0, 30}) — easiest (grade 2).
   * - `5`  → every 5-minute mark (minutes ∈ {0,5,…,55}) — grade 3.
   * Default `5`.
   */
  minuteStep?: 5 | 30;
}

/** Number of minutes around the face / hours around the face. */
export const MINUTES_IN_HOUR = 60;
export const HOURS_ON_FACE = 12;

/**
 * Clockwise angle (radians) of a hand pointing to `value` out of `total`,
 * measured FROM +Y (the 12-o'clock "up" direction) going CLOCKWISE.
 *
 * The on-screen tip position is therefore (x, y) = (sin θ, cos θ) · length:
 *   θ = 0       → (0, +1)  → 12 o'clock, UP
 *   θ = π/2     → (+1, 0)  → 3 o'clock,  RIGHT
 *   θ = π       → (0, -1)  → 6 o'clock,  DOWN
 *   θ = 3π/2    → (-1, 0)  → 9 o'clock,  LEFT
 *
 * A hand mesh modeled along +Y is pointed here by rotating it by `-θ` about Z
 * (positive Z-rotation in three.js is counter-clockwise, so the negation makes
 * the hand sweep clockwise as the value increases).
 */
export function angleFor(value: number, total: number): number {
  return (2 * Math.PI * value) / total;
}

/** Format a digital time string, zero-padding minutes: formatTime(7,5) === "7:05". */
export function formatTime(hour: number, minute: number): string {
  return `${hour}:${minute.toString().padStart(2, '0')}`;
}

/** Type guard: a `{ hour: number, minute: number }` with finite integer fields. */
function isClockTime(a: unknown): a is ClockTime {
  if (typeof a !== 'object' || a === null) return false;
  const c = a as Record<string, unknown>;
  return (
    typeof c.hour === 'number' &&
    Number.isFinite(c.hour) &&
    typeof c.minute === 'number' &&
    Number.isFinite(c.minute)
  );
}

/**
 * Pure, testable target source for the Clock Builder game.
 *
 * `next()` yields a random reachable target on the 5-minute grid (or the
 * o'clock/half-past grid when `minuteStep: 30`). `check()` is strict: the built
 * time is correct ONLY when BOTH the hour and the minute equal the target, so a
 * wrong answer (off-by-5, wrong hour, malformed) is genuinely possible.
 */
export function createClockGenerator(
  options: ClockGeneratorOptions = {}
): ProblemGenerator<ClockTime> {
  const step = options.minuteStep ?? 5;
  // Number of distinct minute marks for the chosen step (5 → 12 marks, 30 → 2).
  const marks = MINUTES_IN_HOUR / step;

  return {
    next(): ClockTime {
      const hour = Math.floor(Math.random() * HOURS_ON_FACE) + 1; // 1..12
      const minute = Math.floor(Math.random() * marks) * step; // 0,step,…,60-step
      return { hour, minute };
    },
    check(problem: ClockTime, answer: unknown): boolean {
      if (!isClockTime(answer)) return false;
      return answer.hour === problem.hour && answer.minute === problem.minute;
    },
  };
}
