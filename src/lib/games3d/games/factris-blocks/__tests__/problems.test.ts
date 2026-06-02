import { describe, it, expect } from 'vitest';
import {
  createFactrisGenerator,
  slotCandidates,
  MIN_AREA,
  MAX_AREA,
  MAX_HEIGHT,
  MAX_SLOT_WIDTH,
} from '../problems';

describe('factris-blocks generator', () => {
  it('slotW is a proper divisor of area, non-degenerate, with bounded height', () => {
    const g = createFactrisGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.area).toBeGreaterThanOrEqual(MIN_AREA);
      expect(p.area).toBeLessThanOrEqual(MAX_AREA);
      // proper divisor
      expect(p.area % p.slotW).toBe(0);
      // non-degenerate: never the full strip 1×A or A×1
      expect(p.slotW).toBeGreaterThanOrEqual(2);
      expect(p.slotW).toBeLessThanOrEqual(Math.floor(p.area / 2));
      // reachable with the width controls
      expect(p.slotW).toBeLessThanOrEqual(MAX_SLOT_WIDTH);
      // bounded stack height
      expect(p.area / p.slotW).toBeLessThanOrEqual(MAX_HEIGHT);
      expect(Number.isInteger(p.area / p.slotW)).toBe(true);
    }
  });

  it('slotCandidates excludes 1, A, and over-tall stacks', () => {
    // A=12: divisors 1,2,3,4,6,12 → proper 2..6 with 12/d ≤ 8 → 2,3,4,6
    expect(slotCandidates(12)).toEqual([2, 3, 4, 6]);
    // A=36: 36/d ≤ 8 → d ≥ 4.5 → {6,9}; 12,18 excluded by MAX_SLOT_WIDTH=9
    expect(slotCandidates(36)).toEqual([6, 9]);
    // prime area has no proper divisor in range
    expect(slotCandidates(7)).toEqual([]);
  });

  it('check(): correct only when width === slotW (A=12, slotW=3)', () => {
    const g = createFactrisGenerator();
    const p = { area: 12, slotW: 3 };
    expect(g.check(p, 3)).toBe(true); // exact slot width → clean 3×4 rectangle
    expect(g.check(p, 4)).toBe(false); // wrong width (4×3 fills, but ≠ slot)
    expect(g.check(p, 5)).toBe(false); // ragged: 12 % 5 !== 0, and ≠ slot
    expect(g.check(p, 2)).toBe(false); // divisor but wrong slot width
    expect(g.check(p, 6)).toBe(false); // 6 divides 12 but isn't the slot width
  });

  it('check(): rejects wrong types, NaN, null, objects, non-integers', () => {
    const g = createFactrisGenerator();
    const p = { area: 12, slotW: 3 };
    expect(g.check(p, '3' as unknown)).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null as unknown)).toBe(false);
    expect(g.check(p, undefined as unknown)).toBe(false);
    expect(g.check(p, { width: 3 } as unknown)).toBe(false);
    expect(g.check(p, 3.0001)).toBe(false);
    expect(g.check(p, [3] as unknown)).toBe(false);
  });
});
