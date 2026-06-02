import { describe, it, expect } from 'vitest';
import { createEstimationGenerator, withinBand, type EstimationProblem } from '../problems';

describe('estimation-land generator', () => {
  it('produces a true count N in 20..60 with a ±20% tolerance band', () => {
    const g = createEstimationGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.n).toBeGreaterThanOrEqual(20);
      expect(p.n).toBeLessThanOrEqual(60);
      expect(p.tolerance).toBe(Math.ceil(p.n * 0.2));
      // The opening guess (0) is always strictly below the band so a problem
      // never opens already-solved (n ≥ 20 ⇒ n − tol ≥ 16 > 0).
      expect(0).toBeLessThan(p.n - p.tolerance);
    }
  });

  it('check() accepts a guess within the inclusive ±tolerance band', () => {
    const g = createEstimationGenerator();
    const p: EstimationProblem = { n: 40, tolerance: 8 };
    // Band = 40 ± 8 = 32..48 inclusive.
    expect(g.check(p, 40)).toBe(true);
    expect(g.check(p, 33)).toBe(true);
    expect(g.check(p, 48)).toBe(true);
    expect(g.check(p, 32)).toBe(true); // lower boundary inclusive
    expect(g.check(p, 49)).toBe(false); // just above
    expect(g.check(p, 31)).toBe(false); // just below
  });

  it('check() rejects wrong types / NaN / null / non-integers', () => {
    const g = createEstimationGenerator();
    const p: EstimationProblem = { n: 40, tolerance: 8 };
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '40')).toBe(false);
    expect(g.check(p, {})).toBe(false);
    expect(g.check(p, 40.5)).toBe(false); // a float inside the band is still rejected
  });
});

describe('withinBand helper (the estimation skill — a RANGE is accepted)', () => {
  it('treats the boundaries n ± tol as inclusive', () => {
    // n=40, tol=8 → 32..48 inclusive; 32 ✅ 48 ✅, 31 ❌ 49 ❌.
    expect(withinBand(40, 8, 32)).toBe(true);
    expect(withinBand(40, 8, 48)).toBe(true);
    expect(withinBand(40, 8, 40)).toBe(true);
    expect(withinBand(40, 8, 31)).toBe(false);
    expect(withinBand(40, 8, 49)).toBe(false);
  });

  it('rejects non-integers and bad types', () => {
    expect(withinBand(40, 8, 40.5)).toBe(false);
    expect(withinBand(40, 8, NaN)).toBe(false);
    expect(withinBand(40, 8, '40' as unknown as number)).toBe(false);
    expect(withinBand(40, 8, null as unknown as number)).toBe(false);
  });
});
