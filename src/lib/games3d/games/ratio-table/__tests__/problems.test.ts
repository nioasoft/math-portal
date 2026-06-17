import { describe, it, expect } from 'vitest';
import { createRatioTableGenerator } from '../problems';

describe('ratio-table generator', () => {
  it('produces valid problems', () => {
    const g = createRatioTableGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect([2, 3, 4, 5]).toContain(p.baseA);
      expect([3, 5, 6, 7, 8]).toContain(p.baseB);
      expect([2, 3, 4, 5]).toContain(p.multiplier);
      expect(['multiplier', 'scaledA', 'scaledB']).toContain(p.askFor);
    }
  });

  it('check() accepts correct answers for askFor=multiplier', () => {
    const g = createRatioTableGenerator();
    expect(g.check({ baseA: 2, baseB: 3, multiplier: 4, askFor: 'multiplier' }, 4)).toBe(true);
  });

  it('check() accepts correct answers for askFor=scaledA', () => {
    const g = createRatioTableGenerator();
    expect(g.check({ baseA: 2, baseB: 3, multiplier: 4, askFor: 'scaledA' }, 8)).toBe(true);
  });

  it('check() accepts correct answers for askFor=scaledB', () => {
    const g = createRatioTableGenerator();
    expect(g.check({ baseA: 2, baseB: 3, multiplier: 4, askFor: 'scaledB' }, 12)).toBe(true);
  });

  it('check() rejects off-by-one answers', () => {
    const g = createRatioTableGenerator();
    expect(g.check({ baseA: 2, baseB: 3, multiplier: 4, askFor: 'scaledA' }, 7)).toBe(false);
    expect(g.check({ baseA: 2, baseB: 3, multiplier: 4, askFor: 'scaledA' }, 9)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createRatioTableGenerator();
    const p = { baseA: 2, baseB: 3, multiplier: 4, askFor: 'scaledA' as const };
    expect(g.check(p, '8')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 8 })).toBe(false);
    expect(g.check(p, [8])).toBe(false);
    expect(g.check(p, 8.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -8)).toBe(false);
  });
});
