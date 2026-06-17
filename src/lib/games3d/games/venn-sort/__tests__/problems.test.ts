import { describe, it, expect } from 'vitest';
import { createVennGenerator, MIN_VALUE, MAX_VALUE } from '../problems';

describe('venn-sort generator', () => {
  it('produces valid problems', () => {
    const g = createVennGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.value).toBeGreaterThanOrEqual(MIN_VALUE);
      expect(p.value).toBeLessThanOrEqual(MAX_VALUE);
      expect([2, 3, 4, 5, 6, 10]).toContain(p.divisorA);
      expect([2, 3, 4, 5, 6, 10]).toContain(p.divisorB);
      expect(p.divisorA).not.toBe(p.divisorB);
    }
  });

  it('check() accepts correct regions', () => {
    const g = createVennGenerator();
    // 15 ÷ 3 = yes, ÷ 5 = yes → both (3)
    expect(g.check({ value: 15, divisorA: 3, divisorB: 5 }, 3)).toBe(true);
    // 6 ÷ 2 = yes, ÷ 5 = no → left-only (1)
    expect(g.check({ value: 6, divisorA: 2, divisorB: 5 }, 1)).toBe(true);
    // 10 ÷ 3 = no, ÷ 5 = yes → right-only (2)
    expect(g.check({ value: 10, divisorA: 3, divisorB: 5 }, 2)).toBe(true);
    // 7 ÷ 2 = no, ÷ 3 = no → neither (0)
    expect(g.check({ value: 7, divisorA: 2, divisorB: 3 }, 0)).toBe(true);
  });

  it('check() rejects wrong regions', () => {
    const g = createVennGenerator();
    expect(g.check({ value: 15, divisorA: 3, divisorB: 5 }, 0)).toBe(false);
    expect(g.check({ value: 15, divisorA: 3, divisorB: 5 }, 1)).toBe(false);
    expect(g.check({ value: 15, divisorA: 3, divisorB: 5 }, 2)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createVennGenerator();
    const p = { value: 15, divisorA: 3, divisorB: 5 };
    expect(g.check(p, '3')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 3 })).toBe(false);
    expect(g.check(p, [3])).toBe(false);
    expect(g.check(p, 3.5)).toBe(false);
    expect(g.check(p, -1)).toBe(false);
    expect(g.check(p, 4)).toBe(false);
  });
});
