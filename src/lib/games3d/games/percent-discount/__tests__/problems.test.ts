import { describe, it, expect } from 'vitest';
import { createPercentDiscountGenerator, MIN_SALE_PRICE } from '../problems';

describe('percent-discount generator', () => {
  it('produces problems with clean integer sale prices', () => {
    const g = createPercentDiscountGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const discountAmount = (p.original * p.discount) / 100;
      const salePrice = p.original - discountAmount;
      expect(Number.isInteger(salePrice)).toBe(true);
      expect(salePrice).toBeGreaterThanOrEqual(MIN_SALE_PRICE);
    }
  });

  it('check() accepts correct sale prices', () => {
    const g = createPercentDiscountGenerator();
    expect(g.check({ original: 100, discount: 20 }, 80)).toBe(true);
    expect(g.check({ original: 50, discount: 50 }, 25)).toBe(true);
    expect(g.check({ original: 200, discount: 10 }, 180)).toBe(true);
    expect(g.check({ original: 80, discount: 25 }, 60)).toBe(true);
  });

  it('check() rejects off-by-one answers', () => {
    const g = createPercentDiscountGenerator();
    expect(g.check({ original: 100, discount: 20 }, 79)).toBe(false);
    expect(g.check({ original: 100, discount: 20 }, 81)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createPercentDiscountGenerator();
    const p = { original: 100, discount: 20 };
    expect(g.check(p, '80')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { original: 100 })).toBe(false);
    expect(g.check(p, [80])).toBe(false);
    expect(g.check(p, 80.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -80)).toBe(false);
  });

  it('accepts every valid price/discount combination at its correct answer', () => {
    const g = createPercentDiscountGenerator();
    const prices = [20, 30, 40, 50, 60, 80, 100, 120, 150, 200];
    const discounts = [10, 20, 25, 30, 40, 50];
    for (const original of prices) {
      for (const discount of discounts) {
        const expected = original - Math.round((original * discount) / 100);
        if (Number.isInteger(expected)) {
          expect(g.check({ original, discount }, expected)).toBe(true);
        }
      }
    }
  });
});
