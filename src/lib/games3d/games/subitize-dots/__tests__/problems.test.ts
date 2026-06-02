import { describe, it, expect } from 'vitest';
import { createSubitizeGenerator, MIN_DOTS, MAX_DOTS } from '../problems';

describe('subitize-dots generator', () => {
  it('generates counts within the subitizing range, non-degenerate', () => {
    const g = createSubitizeGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(Number.isInteger(p.count)).toBe(true);
      expect(p.count).toBeGreaterThanOrEqual(MIN_DOTS);
      expect(p.count).toBeLessThanOrEqual(MAX_DOTS);
    }
  });

  it('check() accepts the exact count and rejects off-by-one', () => {
    const g = createSubitizeGenerator();
    expect(g.check({ count: 7 }, 7)).toBe(true);
    expect(g.check({ count: 7 }, 6)).toBe(false); // off-by-one low
    expect(g.check({ count: 7 }, 8)).toBe(false); // off-by-one high
    expect(g.check({ count: 1 }, 1)).toBe(true);
    expect(g.check({ count: 10 }, 10)).toBe(true);
    expect(g.check({ count: 3 }, 0)).toBe(false); // start-of-input value never solves (count ≥ 1)
  });

  it('check() strictly rejects wrong types, NaN/null, and floats', () => {
    const g = createSubitizeGenerator();
    expect(g.check({ count: 5 }, '5')).toBe(false);
    expect(g.check({ count: 5 }, null)).toBe(false);
    expect(g.check({ count: 5 }, undefined)).toBe(false);
    expect(g.check({ count: 5 }, NaN)).toBe(false);
    expect(g.check({ count: 5 }, Infinity)).toBe(false);
    expect(g.check({ count: 5 }, 5.0001)).toBe(false);
    expect(g.check({ count: 5 }, { count: 5 })).toBe(false);
    expect(g.check({ count: 5 }, [5])).toBe(false);
  });
});
