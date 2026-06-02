import { describe, it, expect } from 'vitest';
import { createArrayMultiplyGenerator, MIN_SIDE, MAX_SIDE } from '../problems';

describe('array-multiply-slice generator', () => {
  it('produces non-degenerate arrays with sides in 2..6 and product in 4..36', () => {
    const g = createArrayMultiplyGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.rows).toBeGreaterThanOrEqual(MIN_SIDE);
      expect(p.rows).toBeLessThanOrEqual(MAX_SIDE);
      expect(p.cols).toBeGreaterThanOrEqual(MIN_SIDE);
      expect(p.cols).toBeLessThanOrEqual(MAX_SIDE);
      // Both sides ≥ 2 → never a trivial 1×N line.
      expect(p.rows).toBeGreaterThanOrEqual(2);
      expect(p.cols).toBeGreaterThanOrEqual(2);
      expect(p.product).toBe(p.rows * p.cols);
      expect(p.product).toBeGreaterThanOrEqual(4);
      expect(p.product).toBeLessThanOrEqual(36);
    }
  });

  it('check() accepts the exact product as the total', () => {
    const g = createArrayMultiplyGenerator();
    expect(g.check({ rows: 4, cols: 3, product: 12 }, 12)).toBe(true);
    expect(g.check({ rows: 6, cols: 6, product: 36 }, 36)).toBe(true);
    expect(g.check({ rows: 2, cols: 2, product: 4 }, 4)).toBe(true);
  });

  it('check() rejects off-by-one and other wrong totals', () => {
    const g = createArrayMultiplyGenerator();
    expect(g.check({ rows: 4, cols: 3, product: 12 }, 11)).toBe(false);
    expect(g.check({ rows: 4, cols: 3, product: 12 }, 13)).toBe(false);
    expect(g.check({ rows: 4, cols: 3, product: 12 }, 7)).toBe(false); // 4+3 sum, not product
    expect(g.check({ rows: 4, cols: 3, product: 12 }, 0)).toBe(false);
  });

  it('check() strictly rejects non-numbers, NaN/null/undefined, and floats', () => {
    const g = createArrayMultiplyGenerator();
    const p = { rows: 4, cols: 3, product: 12 } as const;
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, Infinity)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '12')).toBe(false);
    expect(g.check(p, { product: 12 })).toBe(false);
    expect(g.check(p, [12])).toBe(false);
    expect(g.check(p, 12.0001)).toBe(false);
    expect(g.check(p, 11.999)).toBe(false);
  });
});
