import { describe, it, expect } from 'vitest';
import { createMultiplicationGenerator } from '../problems';

describe('multiplication generator', () => {
  it('produces factors within grade 3-4 range (2..10)', () => {
    const g = createMultiplicationGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.rows).toBeGreaterThanOrEqual(2);
      expect(p.rows).toBeLessThanOrEqual(10);
      expect(p.cols).toBeGreaterThanOrEqual(2);
      expect(p.cols).toBeLessThanOrEqual(10);
      expect(p.product).toBe(p.rows * p.cols);
    }
  });

  it('check() accepts the product and rejects others', () => {
    const g = createMultiplicationGenerator();
    const p = g.next();
    expect(g.check(p, p.product)).toBe(true);
    expect(g.check(p, p.product + 1)).toBe(false);
    expect(g.check(p, String(p.product))).toBe(false); // strict: number expected
  });
});
