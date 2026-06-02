import { describe, it, expect } from 'vitest';
import { createRatioGenerator, MAX_TARGET, MAX_AMOUNT } from '../problems';

describe('ratio-mixer generator', () => {
  it('targets are coprime, non-degenerate, with both parts in 1..MAX_TARGET', () => {
    const g = createRatioGenerator();
    const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.targetA).toBeGreaterThanOrEqual(1);
      expect(p.targetB).toBeGreaterThanOrEqual(1);
      expect(p.targetA).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.targetB).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.targetA).not.toBe(p.targetB); // not 1:1 / 2:2 …
      expect(gcd(p.targetA, p.targetB)).toBe(1); // reduced
      // Always solvable within the amount cap (the target itself fits).
      expect(p.targetA).toBeLessThanOrEqual(MAX_AMOUNT);
      expect(p.targetB).toBeLessThanOrEqual(MAX_AMOUNT);
    }
  });

  it('check() accepts EQUIVALENT ratios and rejects non-equivalent / empty', () => {
    const g = createRatioGenerator();
    const t = { targetA: 2, targetB: 3 };
    // Equivalent (scaled up) → accepted
    expect(g.check(t, { a: 2, b: 3 })).toBe(true);
    expect(g.check(t, { a: 4, b: 6 })).toBe(true);
    expect(g.check(t, { a: 6, b: 9 })).toBe(true);
    // Non-equivalent → rejected
    expect(g.check(t, { a: 2, b: 4 })).toBe(false); // 1:2, not 2:3
    expect(g.check(t, { a: 3, b: 3 })).toBe(false); // 1:1
    expect(g.check(t, { a: 3, b: 2 })).toBe(false); // swapped
    // Degenerate amounts (an empty glass is never a valid mix)
    expect(g.check(t, { a: 0, b: 0 })).toBe(false);
    expect(g.check(t, { a: 2, b: 0 })).toBe(false);
    expect(g.check(t, { a: 0, b: 3 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, floats, null and bare numbers', () => {
    const g = createRatioGenerator();
    const t = { targetA: 1, targetB: 4 };
    expect(g.check(t, 4)).toBe(false);
    expect(g.check(t, null)).toBe(false);
    expect(g.check(t, undefined)).toBe(false);
    expect(g.check(t, { a: 1 })).toBe(false);
    expect(g.check(t, { a: '1', b: '4' })).toBe(false);
    expect(g.check(t, { a: NaN, b: 4 })).toBe(false);
    expect(g.check(t, { a: 1.5, b: 6 })).toBe(false); // non-integer
    expect(g.check(t, { a: 1, b: 4 })).toBe(true); // sanity: the exact target works
    expect(g.check(t, { a: 2, b: 8 })).toBe(true); // equivalent scale-up
  });
});
