import { describe, it, expect } from 'vitest';
import { createAreaPerimeterGenerator, MAX_SIDE } from '../problems';

describe('area-perimeter generator', () => {
  it('targets are solvable with integer sides within the grid', () => {
    const g = createAreaPerimeterGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      let solvable = false;
      for (let w = 1; w <= MAX_SIDE && !solvable; w++) {
        for (let h = 1; h <= MAX_SIDE; h++) {
          const value = p.kind === 'area' ? w * h : 2 * (w + h);
          if (value === p.target) { solvable = true; break; }
        }
      }
      expect(solvable).toBe(true);
    }
  });

  it('check() matches the rectangle metric to the target', () => {
    const g = createAreaPerimeterGenerator();
    expect(g.check({ kind: 'area', target: 12 }, { width: 3, height: 4 })).toBe(true);
    expect(g.check({ kind: 'area', target: 12 }, { width: 2, height: 4 })).toBe(false);
    expect(g.check({ kind: 'perimeter', target: 14 }, { width: 3, height: 4 })).toBe(true);
    expect(g.check({ kind: 'perimeter', target: 14 }, { width: 3, height: 3 })).toBe(false);
    expect(g.check({ kind: 'area', target: 12 }, 12)).toBe(false); // needs {width,height}
  });
});
