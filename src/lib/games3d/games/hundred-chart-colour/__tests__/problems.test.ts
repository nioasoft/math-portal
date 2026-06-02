import { describe, it, expect } from 'vitest';
import {
  createHundredChartGenerator,
  multiplesOf,
  MAX,
  MIN_N,
  MAX_N,
} from '../problems';

describe('multiplesOf', () => {
  it('n=3, MAX=30 → {3,6,9,...,30}', () => {
    expect(multiplesOf(3, 30)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
  });

  it('n=5, MAX=30 → {5,10,15,20,25,30}', () => {
    expect(multiplesOf(5, 30)).toEqual([5, 10, 15, 20, 25, 30]);
  });

  it('is non-degenerate for every n in 2..6 (≥5 multiples, never all/none)', () => {
    for (let n = MIN_N; n <= MAX_N; n++) {
      const m = multiplesOf(n, MAX);
      expect(m.length).toBeGreaterThanOrEqual(5); // n=6 → exactly 5
      expect(m.length).toBeLessThan(MAX); // never the whole chart
    }
  });
});

describe('hundred-chart generator', () => {
  it('only produces n in 2..6', () => {
    const g = createHundredChartGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.n).toBeGreaterThanOrEqual(MIN_N);
      expect(p.n).toBeLessThanOrEqual(MAX_N);
      expect(Number.isInteger(p.n)).toBe(true);
    }
  });

  it('check() accepts the EXACT multiples set (n=3)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 3 }, [3, 6, 9, 12, 15, 18, 21, 24, 27, 30])).toBe(true);
  });

  it('check() accepts regardless of order (set, not list)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 5 }, [30, 5, 25, 10, 20, 15])).toBe(true);
  });

  it('check() rejects a MISSING multiple (n=3 without 30)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 3 }, [3, 6, 9, 12, 15, 18, 21, 24, 27])).toBe(false);
  });

  it('check() rejects an EXTRA non-multiple (n=3 with 7)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 3 }, [3, 6, 7, 9, 12, 15, 18, 21, 24, 27, 30])).toBe(false);
  });

  it('check() rejects EMPTY', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 3 }, [])).toBe(false);
  });

  it('check() rejects duplicates', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 5 }, [5, 5, 10, 15, 20, 25, 30])).toBe(false);
  });

  it('check() rejects out-of-range values (0, >30)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 5 }, [5, 10, 15, 20, 25, 30, 35])).toBe(false);
    expect(g.check({ n: 5 }, [0, 5, 10, 15, 20, 25, 30])).toBe(false);
  });

  it('check() rejects wrong types (NaN, float, object, number, null)', () => {
    const g = createHundredChartGenerator();
    expect(g.check({ n: 5 }, [5, 10, 15, 20, 25, NaN])).toBe(false);
    expect(g.check({ n: 5 }, [5, 10, 15, 20, 25, 30.5])).toBe(false);
    expect(g.check({ n: 5 }, 5)).toBe(false);
    expect(g.check({ n: 5 }, null)).toBe(false);
    expect(g.check({ n: 5 }, { 5: true })).toBe(false);
    expect(g.check({ n: 5 }, ['5', '10'] as unknown)).toBe(false);
  });
});
