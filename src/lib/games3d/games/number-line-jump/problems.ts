import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A number-line "jump" problem: start the car at `start`, reach `target` by
 * hopping ± jump-sizes along the line. The answer the child commits is simply
 * the car's final integer position; it is correct iff it equals `target`.
 */
export interface NumberLineJumpProblem {
  /** Where the car begins on the line (0..START_MAX). */
  start: number;
  /** Where the flag is — the position to land on (0..MAX). */
  target: number;
}

/** The number line runs 0..MAX (inclusive). */
export const MAX = 20;
/** The car never starts past START_MAX (leaves room to hop forward). */
export const START_MAX = 15;
/** Jump size the child can dial in. */
export const MIN_JUMP = 1;
export const MAX_JUMP = 9;

/** A finished answer is just the car's final position on the line. */
function isPosition(a: unknown): a is number {
  return typeof a === 'number' && Number.isInteger(a);
}

/**
 * Generate a non-degenerate jump problem: start ≠ target, both inside the line,
 * and |target − start| ≤ MAX so it's always reachable by a few hops. Mixes
 * forward (target > start, addition) and backward (target < start, subtraction)
 * problems roughly evenly.
 */
export function createNumberLineJumpGenerator(): ProblemGenerator<NumberLineJumpProblem> {
  return {
    next(): NumberLineJumpProblem {
      const start = Math.floor(Math.random() * (START_MAX + 1)); // 0..START_MAX
      // Choose a non-zero signed delta that keeps the target inside 0..MAX.
      const maxForward = MAX - start; // how far we can go right
      const maxBack = start; // how far we can go left
      // Build the set of reachable non-zero deltas, then pick one uniformly.
      const deltas: number[] = [];
      for (let d = 1; d <= maxForward; d++) deltas.push(d);
      for (let d = 1; d <= maxBack; d++) deltas.push(-d);
      const delta = deltas[Math.floor(Math.random() * deltas.length)];
      const target = start + delta;
      return { start, target };
    },
    check(problem: NumberLineJumpProblem, answer: unknown): boolean {
      // STRICT: the committed position must be an integer exactly on the target.
      if (!isPosition(answer)) return false;
      return answer === problem.target;
    },
  };
}
