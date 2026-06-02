import { describe, it, expect } from 'vitest';
import { createNetFoldGenerator, FACE_COUNT, SOLID_KINDS, type SolidKind } from '../problems';

describe('net-fold generator', () => {
  it('every solid maps to the documented face count (4..6)', () => {
    expect(FACE_COUNT.cube).toBe(6);
    expect(FACE_COUNT.rectangularBox).toBe(6);
    expect(FACE_COUNT.triangularPrism).toBe(5);
    expect(FACE_COUNT.squarePyramid).toBe(5);
    expect(FACE_COUNT.tetrahedron).toBe(4);
    for (const kind of SOLID_KINDS) {
      expect(FACE_COUNT[kind]).toBeGreaterThanOrEqual(4);
      expect(FACE_COUNT[kind]).toBeLessThanOrEqual(6);
    }
  });

  it('next() always returns a problem whose faceCount matches its solid', () => {
    const g = createNetFoldGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(SOLID_KINDS).toContain(p.solid);
      expect(p.faceCount).toBe(FACE_COUNT[p.solid]);
    }
  });

  it('yields at least 3 distinct face counts over many samples (variety)', () => {
    const g = createNetFoldGenerator();
    const seen = new Set<number>();
    const seenSolids = new Set<SolidKind>();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      seen.add(p.faceCount);
      seenSolids.add(p.solid);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3); // {4,5,6}
    expect(seenSolids.size).toBeGreaterThanOrEqual(4); // not stuck on one solid
  });

  it('check() accepts the exact integer face count', () => {
    const g = createNetFoldGenerator();
    expect(g.check({ solid: 'cube', faceCount: 6 }, 6)).toBe(true);
    expect(g.check({ solid: 'tetrahedron', faceCount: 4 }, 4)).toBe(true);
    expect(g.check({ solid: 'squarePyramid', faceCount: 5 }, 5)).toBe(true);
  });

  it('check() rejects off-by-one', () => {
    const g = createNetFoldGenerator();
    expect(g.check({ solid: 'cube', faceCount: 6 }, 5)).toBe(false);
    expect(g.check({ solid: 'cube', faceCount: 6 }, 7)).toBe(false);
    expect(g.check({ solid: 'tetrahedron', faceCount: 4 }, 3)).toBe(false);
  });

  it('check() rejects floats, NaN, Infinity, null, objects, strings', () => {
    const g = createNetFoldGenerator();
    const p = { solid: 'cube' as SolidKind, faceCount: 6 };
    expect(g.check(p, 6.0001)).toBe(false);
    expect(g.check(p, 5.9999)).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, Infinity)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '6')).toBe(false);
    expect(g.check(p, { faceCount: 6 })).toBe(false);
    expect(g.check(p, [6])).toBe(false);
  });
});
