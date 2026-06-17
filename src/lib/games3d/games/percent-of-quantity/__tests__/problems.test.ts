import { describe, it, expect } from 'vitest';
import { createPercentOfQuantityGenerator, MIN_ANSWER, MAX_ANSWER } from '../problems';

describe('percent-of-quantity generator', () => {
  it('produces problems with clean integer answers', () => {
    const g = createPercentOfQuantityGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const result = (p.total * p.percent) / 100;
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(MIN_ANSWER);
      expect(result).toBeLessThanOrEqual(MAX_ANSWER);
    }
  });

  it('check() accepts correct answers', () => {
    const g = createPercentOfQuantityGenerator();
    expect(g.check({ total: 80, percent: 30 }, 24)).toBe(true);
    expect(g.check({ total: 100, percent: 25 }, 25)).toBe(true);
    expect(g.check({ total: 50, percent: 50 }, 25)).toBe(true);
    expect(g.check({ total: 20, percent: 75 }, 15)).toBe(true);
  });

  it('check() rejects off-by-one answers', () => {
    const g = createPercentOfQuantityGenerator();
    expect(g.check({ total: 80, percent: 30 }, 23)).toBe(false);
    expect(g.check({ total: 80, percent: 30 }, 25)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createPercentOfQuantityGenerator();
    const p = { total: 50, percent: 20 };
    expect(g.check(p, '10')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { total: 50 })).toBe(false);
    expect(g.check(p, [10])).toBe(false);
    expect(g.check(p, 10.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -10)).toBe(false);
  });

  it('accepts every valid total/percent combination at its correct answer', () => {
    const g = createPercentOfQuantityGenerator();
    const totals = [10, 20, 25, 40, 50, 80, 100];
    const percents = [10, 20, 25, 30, 40, 50, 75];
    for (const total of totals) {
      for (const percent of percents) {
        const expected = Math.round((total * percent) / 100);
        expect(g.check({ total, percent }, expected)).toBe(true);
      }
    }
  });
});
