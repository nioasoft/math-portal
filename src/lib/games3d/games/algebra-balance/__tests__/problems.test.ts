import { describe, it, expect } from 'vitest';
import {
  createAlgebraBalanceGenerator,
  checkBalance,
  MIN_X,
  MAX_X,
  MIN_B,
  MAX_B,
  type AlgebraBalanceProblem,
} from '../problems';

describe('algebra-balance generator', () => {
  it('emits well-formed, non-degenerate one-step equations', () => {
    const g = createAlgebraBalanceGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      // trueX ∈ 1..9
      expect(p.trueX).toBeGreaterThanOrEqual(MIN_X);
      expect(p.trueX).toBeLessThanOrEqual(MAX_X);
      // b ∈ 1..9 (b ≥ 1 so there's always something to remove)
      expect(p.b).toBeGreaterThanOrEqual(MIN_B);
      expect(p.b).toBeLessThanOrEqual(MAX_B);
      // c = trueX + b (so the scale starts balanced), and ≤ 18
      expect(p.c).toBe(p.trueX + p.b);
      expect(p.c).toBeLessThanOrEqual(18);
      // non-degenerate: trueX ≥ 1 and b ≥ 1
      expect(p.trueX).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeGreaterThanOrEqual(1);
      // the stored invariant: c − b === trueX
      expect(p.c - p.b).toBe(p.trueX);
    }
  });

  it('check(): correct ⟺ leftUnits === 0 && rightUnits === trueX', () => {
    const p: AlgebraBalanceProblem = { trueX: 4, b: 3, c: 7 };
    const g = createAlgebraBalanceGenerator();

    // The one and only correct state: ? isolated AND balanced.
    expect(g.check(p, { leftUnits: 0, rightUnits: 4 })).toBe(true);
    expect(checkBalance(p, { leftUnits: 0, rightUnits: 4 })).toBe(true);
  });

  it('check(): wrong when ? is NOT isolated (left units remain)', () => {
    const p: AlgebraBalanceProblem = { trueX: 4, b: 3, c: 7 };
    // Starting balanced config (left has b=3 units, right has c=7) — not isolated.
    expect(checkBalance(p, { leftUnits: 3, rightUnits: 7 })).toBe(false);
    // Removed equally but ? still has a unit beside it.
    expect(checkBalance(p, { leftUnits: 1, rightUnits: 5 })).toBe(false);
  });

  it('check(): wrong when UNBALANCED (removed unequally), even if isolated', () => {
    const p: AlgebraBalanceProblem = { trueX: 4, b: 3, c: 7 };
    // Isolated left, but right ≠ trueX → unbalanced.
    expect(checkBalance(p, { leftUnits: 0, rightUnits: 5 })).toBe(false);
    expect(checkBalance(p, { leftUnits: 0, rightUnits: 7 })).toBe(false);
    expect(checkBalance(p, { leftUnits: 0, rightUnits: 3 })).toBe(false);
    // Unbalanced AND not isolated.
    expect(checkBalance(p, { leftUnits: 2, rightUnits: 7 })).toBe(false);
  });

  it('check(): rejects wrong types, NaN, null, and non-{leftUnits,rightUnits} shapes', () => {
    const p: AlgebraBalanceProblem = { trueX: 4, b: 3, c: 7 };
    expect(checkBalance(p, null)).toBe(false);
    expect(checkBalance(p, undefined)).toBe(false);
    expect(checkBalance(p, 4)).toBe(false);
    expect(checkBalance(p, '0,4')).toBe(false);
    expect(checkBalance(p, {})).toBe(false);
    expect(checkBalance(p, { leftUnits: 0 })).toBe(false);
    expect(checkBalance(p, { rightUnits: 4 })).toBe(false);
    expect(checkBalance(p, { leftUnits: NaN, rightUnits: 4 })).toBe(false);
    expect(checkBalance(p, { leftUnits: 0, rightUnits: NaN })).toBe(false);
    expect(checkBalance(p, { leftUnits: '0', rightUnits: 4 })).toBe(false);
    expect(checkBalance(p, { width: 0, height: 4 })).toBe(false);
    expect(checkBalance(p, [0, 4])).toBe(false);
  });

  it('check(): exhaustive sweep — exactly one (leftUnits,rightUnits) state is correct', () => {
    const p: AlgebraBalanceProblem = { trueX: 6, b: 2, c: 8 };
    let correctStates = 0;
    for (let l = 0; l <= p.b; l++) {
      for (let r = 0; r <= p.c; r++) {
        if (checkBalance(p, { leftUnits: l, rightUnits: r })) {
          correctStates += 1;
          expect(l).toBe(0);
          expect(r).toBe(p.trueX);
        }
      }
    }
    expect(correctStates).toBe(1);
  });
});
