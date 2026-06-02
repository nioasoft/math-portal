import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * One-step ADDITION equation `x + b = c`, with `trueX = c − b`. The scale STARTS
 * balanced because (trueX) + b = c. The child removes EQUAL unit crystals from
 * both pans until the `?` is isolated; the remaining right-pan count is x.
 *
 * Stored as `{ trueX, b, c }` so the invariant `c === trueX + b` is checkable.
 */
export interface AlgebraBalanceProblem {
  /** The hidden value of `?` (1..9). */
  trueX: number;
  /** Unit crystals added to the LEFT pan alongside `?` (1..9). */
  b: number;
  /** Unit crystals on the RIGHT pan (= trueX + b, ≤ ~18). */
  c: number;
}

/**
 * The child's answer = the live pan configuration when they press Check.
 * `leftUnits` = unit crystals remaining on the LEFT (alongside `?`),
 * `rightUnits` = unit crystals remaining on the RIGHT.
 */
export interface BalanceAnswer {
  leftUnits: number;
  rightUnits: number;
}

export const MIN_X = 1;
export const MAX_X = 9;
export const MIN_B = 1;
export const MAX_B = 9;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isBalanceAnswer(a: unknown): a is BalanceAnswer {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.leftUnits === 'number' &&
    typeof o.rightUnits === 'number' &&
    Number.isFinite(o.leftUnits) &&
    Number.isFinite(o.rightUnits)
  );
}

/**
 * Grade a Check.
 *
 * Correct ⟺ the `?` is ISOLATED (no units left on its pan) AND the scale is
 * BALANCED. Because the hidden `?` weighs `trueX`:
 *   leftWeight  = trueX + leftUnits
 *   rightWeight = rightUnits
 * Balanced ⟺ leftWeight === rightWeight ⟺ leftUnits === rightUnits − trueX.
 * Isolated ⟺ leftUnits === 0. Together ⟺ rightUnits === trueX (and leftUnits 0).
 *
 * So the single strict condition is: `leftUnits === 0 && rightUnits === trueX`.
 */
export function checkBalance(problem: AlgebraBalanceProblem, answer: unknown): boolean {
  if (!isBalanceAnswer(answer)) return false;
  return answer.leftUnits === 0 && answer.rightUnits === problem.trueX;
}

export function createAlgebraBalanceGenerator(): ProblemGenerator<AlgebraBalanceProblem> {
  return {
    next(): AlgebraBalanceProblem {
      const trueX = randInt(MIN_X, MAX_X); // 1..9
      const b = randInt(MIN_B, MAX_B); // 1..9
      const c = trueX + b; // ≤ 18, ≥ 2
      return { trueX, b, c };
    },
    check(problem: AlgebraBalanceProblem, answer: unknown): boolean {
      return checkBalance(problem, answer);
    },
  };
}
