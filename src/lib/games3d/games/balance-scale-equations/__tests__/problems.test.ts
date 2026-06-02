import { describe, it, expect } from 'vitest';
import {
  createBalanceScaleGenerator,
  checkBalance,
  countsTotal,
  emptyCounts,
  DENOMINATIONS,
  MIN_TARGET,
  MAX_TARGET,
  MIN_CUBE,
  MAX_CUBE,
  MIN_CUBES,
  MAX_CUBES,
  type BalanceScaleProblem,
} from '../problems';

describe('balance-scale-equations generator', () => {
  it('emits well-formed, non-degenerate problems within the catalog ranges', () => {
    const g = createBalanceScaleGenerator();
    for (let i = 0; i < 800; i++) {
      const p = g.next();
      // target L ∈ 3..30
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      // 1..3 left cubes
      expect(p.leftCubes.length).toBeGreaterThanOrEqual(MIN_CUBES);
      expect(p.leftCubes.length).toBeLessThanOrEqual(MAX_CUBES);
      // each cube value 1..15, each ≥ 1 (non-degenerate, no zero/negative cubes)
      for (const c of p.leftCubes) {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(MIN_CUBE);
        expect(c).toBeLessThanOrEqual(MAX_CUBE);
      }
      // the cubes sum to the target (the invariant the child must match)
      const sum = p.leftCubes.reduce((a, b) => a + b, 0);
      expect(sum).toBe(p.target);
    }
  });

  it('every target is reachable with {1,2,5,10} (greedy proof, never unsolvable)', () => {
    const g = createBalanceScaleGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      // {1,2,5,10} contains 1, so any non-negative integer is reachable.
      let remaining = p.target;
      const counts = emptyCounts();
      for (const d of [...DENOMINATIONS].reverse()) {
        counts[d] = Math.floor(remaining / d);
        remaining -= counts[d] * d;
      }
      expect(remaining).toBe(0);
      expect(countsTotal(counts)).toBe(p.target);
      expect(checkBalance(p, { counts, total: countsTotal(counts) })).toBe(true);
    }
  });

  it('right pan starts EMPTY → never opens already solved', () => {
    const p: BalanceScaleProblem = { leftCubes: [3, 5], target: 8 };
    const empty = emptyCounts();
    expect(countsTotal(empty)).toBe(0);
    // 0 ≠ 8, so the starting state is wrong (a genuine wrong answer is possible).
    expect(checkBalance(p, { counts: empty, total: 0 })).toBe(false);
  });

  it('check(L=8): {5,2,1}=8 ✅ and other valid combos ✅; {5,2}=7 ❌', () => {
    const p: BalanceScaleProblem = { leftCubes: [3, 5], target: 8 };
    // 5+2+1 = 8
    expect(checkBalance(p, { counts: { 1: 1, 2: 1, 5: 1, 10: 0 }, total: 8 })).toBe(true);
    // 2+2+2+2 = 8 (equivalence: many right combinations are valid)
    expect(checkBalance(p, { counts: { 1: 0, 2: 4, 5: 0, 10: 0 }, total: 8 })).toBe(true);
    // 1×8 = 8
    expect(checkBalance(p, { counts: { 1: 8, 2: 0, 5: 0, 10: 0 }, total: 8 })).toBe(true);
    // 5+2 = 7 ≠ 8
    expect(checkBalance(p, { counts: { 1: 0, 2: 1, 5: 1, 10: 0 }, total: 7 })).toBe(false);
    // 5+5 = 10 ≠ 8 (overshoot)
    expect(checkBalance(p, { counts: { 1: 0, 2: 0, 5: 2, 10: 0 }, total: 10 })).toBe(false);
  });

  it('check(): rejects spoofed total inconsistent with counts', () => {
    const p: BalanceScaleProblem = { leftCubes: [3, 5], target: 8 };
    // counts really sum to 7 but claim total 8 → rejected by the consistency guard.
    expect(checkBalance(p, { counts: { 1: 0, 2: 1, 5: 1, 10: 0 }, total: 8 })).toBe(false);
  });

  it('check(): rejects wrong types, NaN, null, arrays, and bad shapes', () => {
    const p: BalanceScaleProblem = { leftCubes: [3, 5], target: 8 };
    expect(checkBalance(p, null)).toBe(false);
    expect(checkBalance(p, undefined)).toBe(false);
    expect(checkBalance(p, 8)).toBe(false);
    expect(checkBalance(p, '8')).toBe(false);
    expect(checkBalance(p, [1, 2, 5])).toBe(false);
    expect(checkBalance(p, {})).toBe(false);
    expect(checkBalance(p, { total: 8 })).toBe(false); // missing counts
    expect(checkBalance(p, { counts: { 1: 8, 2: 0, 5: 0, 10: 0 } })).toBe(false); // missing total
    expect(checkBalance(p, { counts: {}, total: NaN })).toBe(false);
    expect(checkBalance(p, { counts: { 1: NaN }, total: NaN })).toBe(false);
    expect(checkBalance(p, { counts: null, total: 8 })).toBe(false);
  });

  it('countsTotal ignores non-denomination / non-numeric keys', () => {
    expect(countsTotal({ 1: 3, 2: 1, 5: 0, 10: 0 })).toBe(5);
    // a stray "99" denom is not in the set → ignored
    expect(countsTotal({ 1: 1, 99: 5 } as Record<number, number>)).toBe(1);
  });
});
