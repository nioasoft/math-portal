import { describe, it, expect } from 'vitest';
import {
  createMultiplicationFactorTreeGenerator,
  isProperFactor,
  COMPOSITES,
} from '../problems';

describe('multiplication-factor-tree problems', () => {
  describe('isProperFactor', () => {
    it('accepts proper factors of 12', () => {
      expect(isProperFactor(12, 2)).toBe(true);
      expect(isProperFactor(12, 3)).toBe(true);
      expect(isProperFactor(12, 4)).toBe(true);
      expect(isProperFactor(12, 6)).toBe(true);
    });

    it('rejects non-divisors of 12', () => {
      expect(isProperFactor(12, 5)).toBe(false);
      expect(isProperFactor(12, 7)).toBe(false);
      expect(isProperFactor(12, 8)).toBe(false);
    });

    it('rejects the trivial factors 1 and n', () => {
      expect(isProperFactor(12, 1)).toBe(false);
      expect(isProperFactor(12, 12)).toBe(false);
    });

    it('rejects out-of-range, zero and negative values', () => {
      expect(isProperFactor(12, 0)).toBe(false);
      expect(isProperFactor(12, -2)).toBe(false);
      expect(isProperFactor(12, 13)).toBe(false);
    });

    it('rejects non-integers and non-numbers', () => {
      expect(isProperFactor(12, 2.5)).toBe(false);
      expect(isProperFactor(12, Number.NaN)).toBe(false);
      // @ts-expect-error runtime guard against wrong types
      expect(isProperFactor(12, '4')).toBe(false);
      // @ts-expect-error runtime guard against wrong types
      expect(isProperFactor(12, null)).toBe(false);
    });
  });

  describe('every composite N has a proper factor', () => {
    it('each N in the set is genuinely splittable', () => {
      for (const n of COMPOSITES) {
        let found = false;
        for (let a = 2; a < n && !found; a++) {
          if (isProperFactor(n, a)) found = true;
        }
        expect(found, `N=${n} should have a proper factor`).toBe(true);
      }
    });
  });

  describe('generator', () => {
    it('next() always returns a composite from the set', () => {
      const g = createMultiplicationFactorTreeGenerator();
      for (let i = 0; i < 300; i++) {
        const p = g.next();
        expect(COMPOSITES).toContain(p.n as (typeof COMPOSITES)[number]);
      }
    });

    it('check() accepts every proper factor for N=12', () => {
      const g = createMultiplicationFactorTreeGenerator();
      const p = { n: 12 };
      expect(g.check(p, 2)).toBe(true); // b=6
      expect(g.check(p, 3)).toBe(true); // b=4
      expect(g.check(p, 4)).toBe(true); // b=3
      expect(g.check(p, 6)).toBe(true); // b=2
    });

    it('check() rejects non-divisors and trivial factors for N=12', () => {
      const g = createMultiplicationFactorTreeGenerator();
      const p = { n: 12 };
      expect(g.check(p, 5)).toBe(false); // not a divisor
      expect(g.check(p, 1)).toBe(false); // trivial
      expect(g.check(p, 12)).toBe(false); // trivial
    });

    it('check() rejects NaN, null, non-numbers and floats', () => {
      const g = createMultiplicationFactorTreeGenerator();
      const p = { n: 12 };
      expect(g.check(p, Number.NaN)).toBe(false);
      expect(g.check(p, null)).toBe(false);
      expect(g.check(p, '4')).toBe(false);
      expect(g.check(p, { a: 4 })).toBe(false);
      expect(g.check(p, 3.5)).toBe(false);
    });

    it('check() rejects 0 — the START state must never open solved', () => {
      const g = createMultiplicationFactorTreeGenerator();
      for (const n of COMPOSITES) {
        expect(g.check({ n }, 0)).toBe(false);
      }
    });
  });
});
