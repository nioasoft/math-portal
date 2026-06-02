import { describe, it, expect } from 'vitest';
import {
  createDivisionShareGenerator,
  quotientOf,
  remainderOf,
  MIN_TOTAL,
  MAX_TOTAL,
  MIN_K,
  MAX_K,
} from '../problems';

describe('division-share generator', () => {
  it('generates totals and k within the catalog ranges', () => {
    const g = createDivisionShareGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.total).toBeGreaterThanOrEqual(MIN_TOTAL);
      expect(p.total).toBeLessThanOrEqual(MAX_TOTAL);
      expect(p.k).toBeGreaterThanOrEqual(MIN_K);
      expect(p.k).toBeLessThanOrEqual(MAX_K);
      expect(Number.isInteger(p.total)).toBe(true);
      expect(Number.isInteger(p.k)).toBe(true);
    }
  });

  it('every problem has a quotient >= 1 (never opens trivially)', () => {
    const g = createDivisionShareGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(quotientOf(p)).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces a healthy mix of divisible and non-divisible problems', () => {
    const g = createDivisionShareGenerator();
    let divisible = 0;
    let nonDivisible = 0;
    for (let i = 0; i < 1000; i++) {
      const p = g.next();
      if (remainderOf(p) === 0) divisible++;
      else nonDivisible++;
    }
    expect(divisible).toBeGreaterThan(100);
    expect(nonDivisible).toBeGreaterThan(100);
  });

  it('remainder is always in 0..k-1', () => {
    const g = createDivisionShareGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      const r = remainderOf(p);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(p.k);
    }
  });

  it('quotientOf and remainderOf are correct', () => {
    expect(quotientOf({ total: 14, k: 4 })).toBe(3);
    expect(remainderOf({ total: 14, k: 4 })).toBe(2);
    expect(quotientOf({ total: 12, k: 3 })).toBe(4);
    expect(remainderOf({ total: 12, k: 3 })).toBe(0);
  });

  it('check() accepts only the exact quotient (T=14,K=4 → 3 ✅, 2 ❌)', () => {
    const g = createDivisionShareGenerator();
    const p = { total: 14, k: 4 };
    expect(g.check(p, 3)).toBe(true); // remainder 2
    expect(g.check(p, 2)).toBe(false); // too few — could share more (remainder 6 >= k)
    expect(g.check(p, 4)).toBe(false); // too many — would over-share
  });

  it('check() accepts the quotient for divisible problems (T=12,K=3 → 4 ✅)', () => {
    const g = createDivisionShareGenerator();
    expect(g.check({ total: 12, k: 3 }, 4)).toBe(true);
    expect(g.check({ total: 12, k: 3 }, 3)).toBe(false);
    expect(g.check({ total: 12, k: 3 }, 5)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, objects, non-integers', () => {
    const g = createDivisionShareGenerator();
    const p = { total: 14, k: 4 };
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '3')).toBe(false);
    expect(g.check(p, { perChest: 3 })).toBe(false);
    expect(g.check(p, 3.5)).toBe(false);
    expect(g.check(p, [3])).toBe(false);
  });
});
