import { describe, it, expect } from 'vitest';
import {
  createGeoboardGenerator,
  doubledShoelaceArea,
  shoelaceArea,
  TARGET_AREAS,
  GRID_MAX,
  type PegVertex,
} from '../problems';

const rect = (w: number, h: number): PegVertex[] => [
  { gx: 0, gy: 0 },
  { gx: w, gy: 0 },
  { gx: w, gy: h },
  { gx: 0, gy: h },
];

describe('shoelace area helper', () => {
  it('a 2×3 rectangle has area 6', () => {
    expect(shoelaceArea(rect(2, 3))).toBe(6);
    expect(doubledShoelaceArea(rect(2, 3))).toBe(12);
  });

  it('a right triangle with legs 2,3 has area 3', () => {
    const tri: PegVertex[] = [
      { gx: 0, gy: 0 },
      { gx: 2, gy: 0 },
      { gx: 0, gy: 3 },
    ];
    expect(shoelaceArea(tri)).toBe(3);
  });

  it('collinear points enclose zero area', () => {
    const line: PegVertex[] = [
      { gx: 0, gy: 0 },
      { gx: 1, gy: 1 },
      { gx: 2, gy: 2 },
    ];
    expect(shoelaceArea(line)).toBe(0);
    expect(doubledShoelaceArea(line)).toBe(0);
  });

  it('fewer than 3 vertices encloses zero area', () => {
    expect(shoelaceArea([])).toBe(0);
    expect(shoelaceArea([{ gx: 0, gy: 0 }])).toBe(0);
    expect(shoelaceArea([{ gx: 0, gy: 0 }, { gx: 1, gy: 1 }])).toBe(0);
  });

  it('a known L-shape (area 6) is computed correctly', () => {
    // L: a 3×3 square minus a 1×1 notch top-right → 9 - 1 ... build the actual
    // L polygon (6 corners). Outer 3×2 with a 1×1 step removed: area 5.
    const L: PegVertex[] = [
      { gx: 0, gy: 0 },
      { gx: 3, gy: 0 },
      { gx: 3, gy: 1 },
      { gx: 1, gy: 1 },
      { gx: 1, gy: 2 },
      { gx: 0, gy: 2 },
    ];
    // squares: bottom 3×1 = 3, plus left 1×1 above = 1 → 4
    expect(shoelaceArea(L)).toBe(4);
  });

  it('orientation does not matter (absolute value)', () => {
    const cw = [...rect(2, 3)].reverse();
    expect(shoelaceArea(cw)).toBe(6);
  });
});

describe('geoboard generator', () => {
  it('emits only targets realizable on the 5×5 grid and ≥ 2', () => {
    const g = createGeoboardGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(TARGET_AREAS).toContain(p.targetArea as (typeof TARGET_AREAS)[number]);
      expect(p.targetArea).toBeGreaterThanOrEqual(2);
      expect(p.targetArea).toBeLessThanOrEqual(GRID_MAX * GRID_MAX);
    }
  });

  it('accepts ANY polygon matching the target area (many shapes valid)', () => {
    const g = createGeoboardGenerator();
    // target 6 → 2×3 rect ✅, 3×2 rect ✅, triangle legs 4,3 (½·4·3=6) ✅
    expect(g.check({ targetArea: 6 }, rect(2, 3))).toBe(true);
    expect(g.check({ targetArea: 6 }, rect(3, 2))).toBe(true);
    expect(
      g.check({ targetArea: 6 }, [
        { gx: 0, gy: 0 },
        { gx: 4, gy: 0 },
        { gx: 0, gy: 3 },
      ])
    ).toBe(true);
  });

  it('rejects the wrong area strictly (off-by-one)', () => {
    const g = createGeoboardGenerator();
    expect(g.check({ targetArea: 6 }, rect(2, 2))).toBe(false); // area 4
    expect(g.check({ targetArea: 6 }, rect(1, 5))).toBe(false); // area 5
    expect(g.check({ targetArea: 6 }, rect(1, 7))).toBe(false); // off-grid anyway
  });

  it('rejects fewer than 3 vertices, degenerate, and bad types', () => {
    const g = createGeoboardGenerator();
    expect(g.check({ targetArea: 4 }, [{ gx: 0, gy: 0 }, { gx: 2, gy: 2 }])).toBe(false);
    expect(
      g.check({ targetArea: 4 }, [
        { gx: 0, gy: 0 },
        { gx: 1, gy: 1 },
        { gx: 2, gy: 2 },
      ])
    ).toBe(false); // collinear → area 0
    expect(g.check({ targetArea: 4 }, 4)).toBe(false);
    expect(g.check({ targetArea: 4 }, null)).toBe(false);
    expect(g.check({ targetArea: 4 }, [{ gx: 0.5, gy: 0 }, { gx: 2, gy: 0 }, { gx: 0, gy: 2 }])).toBe(false);
    expect(g.check({ targetArea: 4 }, [{ gx: -1, gy: 0 }, { gx: 2, gy: 0 }, { gx: 0, gy: 2 }])).toBe(false);
    expect(g.check({ targetArea: 4 }, [{ gx: 5, gy: 0 }, { gx: 2, gy: 0 }, { gx: 0, gy: 2 }])).toBe(false);
  });
});
