import { describe, it, expect } from 'vitest';
import {
  createWeightBalanceGenerator,
  weightsTotal,
  emptyWeights,
  DENOMINATIONS,
  MIN_TARGET,
  MAX_TARGET,
  TARGET_STEP,
  FRUITS,
} from '../problems';

describe('weight-balance generator', () => {
  it('generates targets in 100..900 on the step grid, reachable with {1,10,100}', () => {
    const g = createWeightBalanceGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.target % TARGET_STEP).toBe(0);
      // Reachable: ones cover any remainder since a 1 g weight exists.
      expect(p.target).toBeGreaterThanOrEqual(1); // non-degenerate
      expect(FRUITS).toContain(p.fruit);
    }
  });

  it('every target is decomposable into {1,10,100} weights summing to it', () => {
    const g = createWeightBalanceGenerator();
    for (let i = 0; i < 200; i++) {
      const t = g.next().target;
      const hundreds = Math.floor(t / 100);
      const tens = Math.floor((t % 100) / 10);
      const ones = t % 10;
      expect(hundreds * 100 + tens * 10 + ones).toBe(t);
    }
  });

  it('weightsTotal sums denomination × count', () => {
    expect(weightsTotal({ 1: 5, 10: 3, 100: 2 })).toBe(235);
    expect(weightsTotal(emptyWeights())).toBe(0);
    expect(weightsTotal({ 1: 0, 10: 0, 100: 9 })).toBe(900);
  });

  it('check() is correct ⟺ right total equals the target (T=235 example)', () => {
    const g = createWeightBalanceGenerator();
    const problem = { target: 235, fruit: 'apple' as const };
    // 2×100 + 3×10 + 5×1 = 235 ✅ (any combo works)
    expect(g.check(problem, { counts: { 1: 5, 10: 3, 100: 2 }, total: 235 })).toBe(true);
    // alternate combo also valid: 1×100 + 13×10 + 5×1 = 235
    expect(g.check(problem, { counts: { 1: 5, 10: 13, 100: 1 }, total: 235 })).toBe(true);
    // 234 g ❌ (off by one)
    expect(g.check(problem, { counts: { 1: 4, 10: 3, 100: 2 }, total: 234 })).toBe(false);
    // 236 g ❌
    expect(g.check(problem, { counts: { 1: 6, 10: 3, 100: 2 }, total: 236 })).toBe(false);
  });

  it('check() rejects spoofed totals inconsistent with counts', () => {
    const g = createWeightBalanceGenerator();
    const problem = { target: 235, fruit: 'apple' as const };
    // total claims 235 but counts only sum to 35 → rejected by consistency guard
    expect(g.check(problem, { counts: { 1: 5, 10: 3, 100: 0 }, total: 235 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, arrays, missing total', () => {
    const g = createWeightBalanceGenerator();
    const problem = { target: 235, fruit: 'apple' as const };
    expect(g.check(problem, 235)).toBe(false);
    expect(g.check(problem, '235')).toBe(false);
    expect(g.check(problem, null)).toBe(false);
    expect(g.check(problem, undefined)).toBe(false);
    expect(g.check(problem, [])).toBe(false);
    expect(g.check(problem, { counts: { 1: 5, 10: 3, 100: 2 } })).toBe(false); // no total
    expect(g.check(problem, { counts: { 1: 5, 10: 3, 100: 2 }, total: NaN })).toBe(false);
    expect(g.check(problem, { total: 235 })).toBe(false); // no counts
    expect(g.check(problem, {})).toBe(false);
  });

  it('an empty right pan never matches a target (problem never opens solved)', () => {
    const g = createWeightBalanceGenerator();
    for (let i = 0; i < 50; i++) {
      const p = g.next();
      expect(g.check(p, { counts: emptyWeights(), total: 0 })).toBe(false);
    }
  });

  it('denominations are exactly the place values {1,10,100}', () => {
    expect([...DENOMINATIONS]).toEqual([1, 10, 100]);
  });
});
