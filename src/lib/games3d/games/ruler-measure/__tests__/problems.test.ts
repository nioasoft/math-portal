import { describe, it, expect } from 'vitest';
import {
  createRulerMeasureGenerator,
  RULER_MAX,
  START_MAX,
  LENGTH_MIN,
  LENGTH_MAX,
} from '../problems';

describe('ruler-measure generator', () => {
  it('produces problems within the declared ranges that fit on the ruler', () => {
    const g = createRulerMeasureGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(Number.isInteger(p.start)).toBe(true);
      expect(Number.isInteger(p.length)).toBe(true);
      expect(p.start).toBeGreaterThanOrEqual(0);
      expect(p.start).toBeLessThanOrEqual(START_MAX);
      expect(p.length).toBeGreaterThanOrEqual(LENGTH_MIN);
      expect(p.length).toBeLessThanOrEqual(LENGTH_MAX);
      // Object fits on the ruler.
      expect(p.start + p.length).toBeLessThanOrEqual(RULER_MAX);
      // Non-degenerate.
      expect(p.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('check() is true ONLY when both markers align to the object ends', () => {
    const g = createRulerMeasureGenerator();
    // Object: start=2, length=5 → ends at [2, 7].
    const p = { start: 2, length: 5 };
    expect(g.check(p, { left: 2, right: 7 })).toBe(true);
  });

  it('rejects span-correct but MISALIGNED markers (the start≠0 misconception)', () => {
    const g = createRulerMeasureGenerator();
    const p = { start: 2, length: 5 };
    // Same span (5 cm) but shifted left: 1..6 — WRONG, markers not on the ends.
    expect(g.check(p, { left: 1, right: 6 })).toBe(false);
    // Left marker left at 0, right at the object's right end (reading length as the
    // right number, S+L=7) — WRONG. This is the core misconception.
    expect(g.check(p, { left: 0, right: 7 })).toBe(false);
  });

  it('rejects off-by-one on either marker', () => {
    const g = createRulerMeasureGenerator();
    const p = { start: 3, length: 4 }; // ends at [3, 7]
    expect(g.check(p, { left: 3, right: 7 })).toBe(true);
    expect(g.check(p, { left: 2, right: 7 })).toBe(false);
    expect(g.check(p, { left: 4, right: 7 })).toBe(false);
    expect(g.check(p, { left: 3, right: 6 })).toBe(false);
    expect(g.check(p, { left: 3, right: 8 })).toBe(false);
  });

  it('rejects wrong types, NaN, null and bare numbers', () => {
    const g = createRulerMeasureGenerator();
    const p = { start: 1, length: 3 }; // ends at [1, 4]
    expect(g.check(p, 4)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { left: NaN, right: 4 })).toBe(false);
    expect(g.check(p, { left: 1, right: NaN })).toBe(false);
    expect(g.check(p, { left: '1', right: '4' })).toBe(false);
    expect(g.check(p, { left: 1 })).toBe(false);
    expect(g.check(p, {})).toBe(false);
    expect(g.check(p, [1, 4])).toBe(false);
  });

  it('an object starting at 0 still requires the right marker at the length', () => {
    const g = createRulerMeasureGenerator();
    const p = { start: 0, length: 6 }; // ends at [0, 6]
    expect(g.check(p, { left: 0, right: 6 })).toBe(true);
    expect(g.check(p, { left: 0, right: 5 })).toBe(false);
  });
});
