import { describe, it, expect } from 'vitest';
import { createVolumeCubeFillGenerator, MAX_DIM } from '../problems';

describe('volume-cube-fill generator', () => {
  it('targets are non-degenerate (>= 2) and reachable with integer dims in 1..MAX_DIM', () => {
    const g = createVolumeCubeFillGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(2);
      let solvable = false;
      for (let l = 1; l <= MAX_DIM && !solvable; l++) {
        for (let w = 1; w <= MAX_DIM && !solvable; w++) {
          for (let h = 1; h <= MAX_DIM; h++) {
            if (l * w * h === p.target) { solvable = true; break; }
          }
        }
      }
      expect(solvable).toBe(true);
    }
  });

  it('check() is by VALUE — equivalent boxes both pass for target 24', () => {
    const g = createVolumeCubeFillGenerator();
    const p = { target: 24 };
    expect(g.check(p, { length: 2, width: 3, height: 4 })).toBe(true); // 2×3×4 ✅
    expect(g.check(p, { length: 4, width: 6, height: 1 })).toBe(true); // 4×6×1 ✅
    expect(g.check(p, { length: 1, width: 4, height: 6 })).toBe(true); // 1×4×6 ✅
    expect(g.check(p, { length: 2, width: 2, height: 4 })).toBe(false); // 16 ❌
  });

  it('check() is strict — rejects wrong product, off-by-one, out-of-range, bad types', () => {
    const g = createVolumeCubeFillGenerator();
    const p = { target: 12 };
    expect(g.check(p, { length: 2, width: 2, height: 3 })).toBe(true); // 12 ✅
    expect(g.check(p, { length: 2, width: 2, height: 4 })).toBe(false); // 16, off
    expect(g.check(p, { length: 1, width: 1, height: 11 })).toBe(false); // 11, off-by-one + out of range
    expect(g.check(p, { length: 7, width: 1, height: 2 })).toBe(false); // 7 > MAX_DIM
    expect(g.check(p, { length: 2.5, width: 2, height: 2.4 })).toBe(false); // non-integer
    expect(g.check(p, { length: 0, width: 4, height: 3 })).toBe(false); // zero dim
    expect(g.check(p, { length: -2, width: -2, height: 3 })).toBe(false); // negatives
    expect(g.check(p, { length: NaN, width: 2, height: 3 })).toBe(false); // NaN
    expect(g.check(p, 12)).toBe(false); // number, not a box
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, { length: 2, width: 3 })).toBe(false); // missing height
    expect(g.check(p, {})).toBe(false);
    expect(g.check(p, 'twelve')).toBe(false);
  });

  it('check() respects the MAX_DIM (6) boundary', () => {
    const g = createVolumeCubeFillGenerator();
    expect(g.check({ target: 216 }, { length: 6, width: 6, height: 6 })).toBe(true);   // max valid box
    expect(g.check({ target: 210 }, { length: 6, width: 5, height: 7 })).toBe(false);  // 7 > MAX_DIM rejected
  });
});
