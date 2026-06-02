import { describe, it, expect } from 'vitest';
import {
  createFractionSliceGenerator,
  isWholeNumber,
  MIN_DENOMINATOR,
  MAX_DENOMINATOR,
} from '../problems';

describe('fraction-slice generator', () => {
  it('always produces a proper, non-degenerate fraction within the grade band', () => {
    const g = createFractionSliceGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.d).toBeGreaterThanOrEqual(MIN_DENOMINATOR);
      expect(p.d).toBeLessThanOrEqual(MAX_DENOMINATOR);
      expect(p.n).toBeGreaterThanOrEqual(1); // never empty
      expect(p.n).toBeLessThanOrEqual(p.d - 1); // never the whole
      expect(Number.isInteger(p.n)).toBe(true);
      expect(Number.isInteger(p.d)).toBe(true);
    }
  });

  it('check() is strict on BOTH slice count and shaded count (target 3/4)', () => {
    const g = createFractionSliceGenerator();
    const target = { n: 3, d: 4 };
    expect(g.check(target, { slices: 4, shaded: 3 })).toBe(true); // exact match
    expect(g.check(target, { slices: 4, shaded: 2 })).toBe(false); // wrong shaded
    expect(g.check(target, { slices: 4, shaded: 4 })).toBe(false); // whole shaded
    expect(g.check(target, { slices: 3, shaded: 3 })).toBe(false); // wrong slices
  });

  it('REJECTS equivalent fractions — the slicing must literally match', () => {
    const g = createFractionSliceGenerator();
    // 6/8 reduces to 3/4 but is sliced differently → wrong for a 3/4 task.
    expect(g.check({ n: 3, d: 4 }, { slices: 8, shaded: 6 })).toBe(false);
    // 1/2 == 2/4 by value, but a 1/2 task demands exactly 2 slices.
    expect(g.check({ n: 1, d: 2 }, { slices: 4, shaded: 2 })).toBe(false);
  });

  it('check() rejects malformed answers (non-number, NaN, float, null, object, primitive)', () => {
    const g = createFractionSliceGenerator();
    const target = { n: 1, d: 2 };
    expect(g.check(target, null)).toBe(false);
    expect(g.check(target, undefined)).toBe(false);
    expect(g.check(target, 2)).toBe(false); // bare number, not {slices,shaded}
    expect(g.check(target, { slices: NaN, shaded: 1 })).toBe(false);
    expect(g.check(target, { slices: 2.5, shaded: 1 })).toBe(false); // float
    expect(g.check(target, { slices: 2, shaded: '1' })).toBe(false); // string
    expect(g.check(target, { slices: 2 })).toBe(false); // missing shaded
    expect(g.check(target, {})).toBe(false);
  });

  it('isWholeNumber helper rejects NaN/null/float/string and accepts integers', () => {
    expect(isWholeNumber(3)).toBe(true);
    expect(isWholeNumber(0)).toBe(true);
    expect(isWholeNumber(NaN)).toBe(false);
    expect(isWholeNumber(null)).toBe(false);
    expect(isWholeNumber(2.5)).toBe(false);
    expect(isWholeNumber('4')).toBe(false);
    expect(isWholeNumber(undefined)).toBe(false);
  });
});
