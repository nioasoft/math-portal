import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A target ratio A:B, always REDUCED (coprime) and non-degenerate, with
 * targetA, targetB in 1..MAX_TARGET. The child must set juice amounts whose
 * ratio is EQUIVALENT to this target (any scaling up works).
 */
export interface RatioProblem {
  targetA: number;
  targetB: number;
}

/** The child's built answer: amount of juice A and juice B. */
export interface RatioAnswer {
  a: number;
  b: number;
}

export const MAX_TARGET = 5; // targetA/targetB sit in 1..5 (coprime)
export const MAX_AMOUNT = 10; // each glass caps at 10 units

function gcd(x: number, y: number): number {
  let a = Math.abs(x);
  let b = Math.abs(y);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function isRatioAnswer(a: unknown): a is RatioAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const r = a as RatioAnswer;
  return (
    typeof r.a === 'number' &&
    typeof r.b === 'number' &&
    Number.isInteger(r.a) &&
    Number.isInteger(r.b)
  );
}

/**
 * Build a coprime, non-degenerate target ratio with both parts in 1..MAX_TARGET.
 * Rejects 1:1 so the task is always a genuine comparison (e.g. 2:3, 3:5, 1:4).
 */
function randomCoprimeTarget(): RatioProblem {
  for (;;) {
    const targetA = Math.floor(Math.random() * MAX_TARGET) + 1;
    const targetB = Math.floor(Math.random() * MAX_TARGET) + 1;
    if (targetA === targetB) continue; // 1:1, 2:2… are degenerate / trivial
    if (gcd(targetA, targetB) !== 1) continue; // keep it reduced (e.g. 2:4 → 1:2)
    return { targetA, targetB };
  }
}

/**
 * Correctness by VALUE — equivalent ratios accepted. Integer cross-multiply
 * (no floats): a/b == targetA/targetB ⟺ a·targetB == b·targetA. Both amounts
 * must be ≥ 1 (an empty glass is never a valid mix). So for target 2:3:
 * (2,3)✅ (4,6)✅ (6,9)✅ ; (2,4)❌ (3,3)❌ (0,0)❌.
 */
export function isEquivalent(problem: RatioProblem, answer: RatioAnswer): boolean {
  if (answer.a < 1 || answer.b < 1) return false;
  return answer.a * problem.targetB === answer.b * problem.targetA;
}

export function createRatioGenerator(): ProblemGenerator<RatioProblem> {
  return {
    next(): RatioProblem {
      return randomCoprimeTarget();
    },
    check(problem: RatioProblem, answer: unknown): boolean {
      if (!isRatioAnswer(answer)) return false;
      return isEquivalent(problem, answer);
    },
  };
}
