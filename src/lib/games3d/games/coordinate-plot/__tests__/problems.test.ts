import { describe, it, expect } from 'vitest';
import { createCoordinatePlotGenerator, GRID_MAX, TARGET_MIN } from '../problems';

describe('coordinate-plot generator', () => {
  it('targets are in 1..GRID_MAX on both axes (never the origin)', () => {
    const g = createCoordinatePlotGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(Number.isInteger(p.tx)).toBe(true);
      expect(Number.isInteger(p.ty)).toBe(true);
      expect(p.tx).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(p.tx).toBeLessThanOrEqual(GRID_MAX);
      expect(p.ty).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(p.ty).toBeLessThanOrEqual(GRID_MAX);
      // Never degenerate: target is never the origin start point.
      expect(p.tx === 0 && p.ty === 0).toBe(false);
    }
  });

  it('check() is integer-strict and order-sensitive', () => {
    const g = createCoordinatePlotGenerator();
    const target = { tx: 3, ty: 5 };
    expect(g.check(target, { x: 3, y: 5 })).toBe(true); // exact
    expect(g.check(target, { x: 5, y: 3 })).toBe(false); // swapped
    expect(g.check(target, { x: 3, y: 4 })).toBe(false); // off-by-one on y
    expect(g.check(target, { x: 2, y: 5 })).toBe(false); // off-by-one on x
    expect(g.check(target, { x: 4, y: 6 })).toBe(false); // both off
  });

  it('check() rejects bad types / shapes', () => {
    const g = createCoordinatePlotGenerator();
    const target = { tx: 3, ty: 5 };
    expect(g.check(target, null)).toBe(false);
    expect(g.check(target, undefined)).toBe(false);
    expect(g.check(target, 35)).toBe(false);
    expect(g.check(target, '3,5')).toBe(false);
    expect(g.check(target, { x: 3 })).toBe(false); // missing y
    expect(g.check(target, { x: NaN, y: 5 })).toBe(false);
    expect(g.check(target, { x: 3.0001, y: 5 })).toBe(false); // float
    expect(g.check(target, { x: 3, y: 5.5 })).toBe(false); // float
    expect(g.check(target, { x: Infinity, y: 5 })).toBe(false);
    expect(g.check(target, { x: -1, y: 5 })).toBe(false); // below grid
    expect(g.check(target, { x: 9, y: 5 })).toBe(false); // above grid
  });

  it('accepts coordinates across the full 1..GRID_MAX target range', () => {
    const g = createCoordinatePlotGenerator();
    for (let x = TARGET_MIN; x <= GRID_MAX; x++) {
      for (let y = TARGET_MIN; y <= GRID_MAX; y++) {
        expect(g.check({ tx: x, ty: y }, { x, y })).toBe(true);
      }
    }
  });
});
