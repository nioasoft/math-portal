import { describe, it, expect } from 'vitest';
import {
  createPercentBarGenerator,
  MIN_PERCENT,
  MAX_PERCENT,
  PERCENT_STEP,
} from '../problems';

describe('percent-bar generator', () => {
  it('targets are multiples of 5 strictly inside 0..100 (never 0 or 100)', () => {
    const g = createPercentBarGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.percent % PERCENT_STEP).toBe(0);
      expect(p.percent).toBeGreaterThanOrEqual(MIN_PERCENT);
      expect(p.percent).toBeLessThanOrEqual(MAX_PERCENT);
      expect(p.percent).not.toBe(0);
      expect(p.percent).not.toBe(100);
    }
  });

  it('check() is exact: T=65 accepts 65, rejects 60 and 70', () => {
    const g = createPercentBarGenerator();
    expect(g.check({ percent: 65 }, 65)).toBe(true);
    expect(g.check({ percent: 65 }, 60)).toBe(false);
    expect(g.check({ percent: 65 }, 70)).toBe(false);
  });

  it('check() rejects wrong types, NaN/null, objects, and out-of-range/non-step values', () => {
    const g = createPercentBarGenerator();
    const p = { percent: 50 };
    expect(g.check(p, '50')).toBe(false); // string
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { percent: 50 })).toBe(false); // object, not a number
    expect(g.check(p, [50])).toBe(false);
    expect(g.check(p, 52)).toBe(false); // not a multiple of 5
    expect(g.check(p, 50.0000001)).toBe(false); // non-integer
    expect(g.check(p, 0)).toBe(false); // out of range (and wrong)
    expect(g.check(p, 100)).toBe(false); // out of range (and wrong)
  });

  it('accepts every valid target value at its own percent', () => {
    const g = createPercentBarGenerator();
    for (let v = MIN_PERCENT; v <= MAX_PERCENT; v += PERCENT_STEP) {
      expect(g.check({ percent: v }, v)).toBe(true);
    }
  });
});
