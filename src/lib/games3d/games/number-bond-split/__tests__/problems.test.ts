import { describe, it, expect } from 'vitest';
import {
  createNumberBondGenerator,
  MIN_TARGET,
  MAX_TARGET,
  EASY_MAX_TARGET,
} from '../problems';

describe('number-bond-split generator', () => {
  it('produces non-degenerate targets in range (3..18), never auto-solved at 0+0', () => {
    const g = createNumberBondGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      expect(Number.isInteger(p.target)).toBe(true);
      // Starting state A=0,B=0 must NOT already satisfy the target.
      expect(0 + 0).not.toBe(p.target);
      // Many integer splits exist: 0+T and 1+(T-1) are both valid for T>=3.
      expect(g.check(p, { a: 0, b: p.target })).toBe(true);
      expect(g.check(p, { a: 1, b: p.target - 1 })).toBe(true);
    }
  });

  it('respects the easy band for the majority of draws', () => {
    const g = createNumberBondGenerator();
    let easy = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (g.next().target <= EASY_MAX_TARGET) easy++;
    }
    // ~70% easy by design — allow a wide statistical margin.
    expect(easy / N).toBeGreaterThan(0.55);
  });

  it('check() accepts ANY pair whose parts sum to the target (T=7)', () => {
    const g = createNumberBondGenerator();
    const p = { target: 7 };
    expect(g.check(p, { a: 3, b: 4 })).toBe(true);
    expect(g.check(p, { a: 4, b: 3 })).toBe(true);
    expect(g.check(p, { a: 0, b: 7 })).toBe(true);
    expect(g.check(p, { a: 7, b: 0 })).toBe(true);
    expect(g.check(p, { a: 1, b: 6 })).toBe(true);
  });

  it('check() rejects a wrong sum (gap or overlap), strictly (T=7)', () => {
    const g = createNumberBondGenerator();
    const p = { target: 7 };
    expect(g.check(p, { a: 2, b: 4 })).toBe(false); // 6 — a gap
    expect(g.check(p, { a: 5, b: 5 })).toBe(false); // 10 — an overlap
    expect(g.check(p, { a: 3, b: 3 })).toBe(false); // 6
    expect(g.check(p, { a: 4, b: 4 })).toBe(false); // 8
  });

  it('check() rejects off-by-one in either direction', () => {
    const g = createNumberBondGenerator();
    const p = { target: 10 };
    expect(g.check(p, { a: 4, b: 5 })).toBe(false); // 9
    expect(g.check(p, { a: 5, b: 6 })).toBe(false); // 11
    expect(g.check(p, { a: 5, b: 5 })).toBe(true); // 10 exact
  });

  it('check() rejects wrong types, NaN, null, and objects without numeric parts', () => {
    const g = createNumberBondGenerator();
    const p = { target: 7 };
    expect(g.check(p, 7)).toBe(false);
    expect(g.check(p, '3+4')).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, {})).toBe(false);
    expect(g.check(p, { a: 3 })).toBe(false);
    expect(g.check(p, { a: '3', b: '4' })).toBe(false);
    expect(g.check(p, { a: NaN, b: 7 })).toBe(false);
    expect(g.check(p, { a: Infinity, b: -Infinity })).toBe(false);
    expect(g.check(p, { a: 3.5, b: 3.5 })).toBe(false); // non-integer parts
    expect(g.check(p, [3, 4])).toBe(false);
  });
});
