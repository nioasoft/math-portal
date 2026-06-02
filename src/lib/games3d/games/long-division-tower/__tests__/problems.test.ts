import { describe, it, expect } from 'vitest';
import {
  createLongDivisionTowerGenerator,
  quotientOf,
  remainderOf,
  MIN_D,
  MAX_D,
  MIN_N,
  MAX_N,
  type LongDivisionTowerProblem,
} from '../problems';

describe('long-division-tower generator', () => {
  it('emits d in 2..6 and n in (d+1)..40 with quotient >= 1 (non-degenerate)', () => {
    const g = createLongDivisionTowerGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.d).toBeGreaterThanOrEqual(MIN_D);
      expect(p.d).toBeLessThanOrEqual(MAX_D);
      expect(Number.isInteger(p.d)).toBe(true);
      expect(p.n).toBeGreaterThanOrEqual(MIN_N);
      expect(p.n).toBeLessThanOrEqual(MAX_N);
      expect(Number.isInteger(p.n)).toBe(true);
      // quotient >= 1 means n > d (the per-tower height is always at least one block).
      expect(p.n).toBeGreaterThan(p.d);
      expect(quotientOf(p)).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces a MIX of exact (remainder 0) and inexact (remainder > 0) problems', () => {
    const g = createLongDivisionTowerGenerator();
    let exact = 0;
    let inexact = 0;
    for (let i = 0; i < 800; i++) {
      const p = g.next();
      if (remainderOf(p) === 0) exact++;
      else inexact++;
    }
    expect(exact).toBeGreaterThan(0);
    expect(inexact).toBeGreaterThan(0);
  });

  it('quotient/remainder math is correct (q*d + r === n, 0 <= r < d)', () => {
    const g = createLongDivisionTowerGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const q = quotientOf(p);
      const r = remainderOf(p);
      expect(q * p.d + r).toBe(p.n);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(p.d);
    }
  });

  it('check() is correct only at the exact quotient', () => {
    const g = createLongDivisionTowerGenerator();
    // n=14, d=3 → quotient 4 (remainder 2).
    const p1: LongDivisionTowerProblem = { n: 14, d: 3 };
    expect(quotientOf(p1)).toBe(4);
    expect(remainderOf(p1)).toBe(2);
    expect(g.check(p1, 4)).toBe(true); // exactly the quotient
    expect(g.check(p1, 5)).toBe(false); // over-shared (5*3=15 > 14)
    expect(g.check(p1, 3)).toBe(false); // under-shared (could share more)

    // n=12, d=4 → quotient 3 (remainder 0).
    const p2: LongDivisionTowerProblem = { n: 12, d: 4 };
    expect(quotientOf(p2)).toBe(3);
    expect(remainderOf(p2)).toBe(0);
    expect(g.check(p2, 3)).toBe(true);
    expect(g.check(p2, 2)).toBe(false);
    expect(g.check(p2, 4)).toBe(false);
  });

  it('check() rejects wrong types, NaN/null, and non-integers (strict)', () => {
    const g = createLongDivisionTowerGenerator();
    const p: LongDivisionTowerProblem = { n: 14, d: 3 }; // quotient 4
    expect(g.check(p, 4.0)).toBe(true); // 4.0 is an integer value
    expect(g.check(p, 4.5)).toBe(false); // float
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '4')).toBe(false);
    expect(g.check(p, { perTower: 4 })).toBe(false);
    expect(g.check(p, [4])).toBe(false);
    expect(g.check(p, true)).toBe(false);
    expect(g.check(p, Infinity)).toBe(false);
  });
});
