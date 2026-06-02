import { describe, it, expect } from 'vitest';
import {
  createAngleGenerator,
  STEP_DEGREES,
  MIN_TARGET,
  MAX_TARGET,
} from '../problems';

describe('angle-builder generator', () => {
  it('targets are multiples of 15° within 15..165 (never opens solved at 0°)', () => {
    const g = createAngleGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.target % STEP_DEGREES).toBe(0);
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.target).toBeGreaterThan(0); // start ray is 0°, so target ≠ start
    }
  });

  it('check() is true only when the built angle equals the target exactly', () => {
    const g = createAngleGenerator();
    expect(g.check({ target: 90 }, 90)).toBe(true);
    expect(g.check({ target: 90 }, 75)).toBe(false); // off-by-15
    expect(g.check({ target: 90 }, 105)).toBe(false); // off-by-15 the other way
    expect(g.check({ target: 15 }, 15)).toBe(true);
    expect(g.check({ target: 165 }, 165)).toBe(true);
    expect(g.check({ target: 90 }, 0)).toBe(false); // the start angle is wrong
  });

  it('check() rejects wrong types, NaN/null, and objects', () => {
    const g = createAngleGenerator();
    expect(g.check({ target: 90 }, '90')).toBe(false);
    expect(g.check({ target: 90 }, NaN)).toBe(false);
    expect(g.check({ target: 90 }, null)).toBe(false);
    expect(g.check({ target: 90 }, undefined)).toBe(false);
    expect(g.check({ target: 90 }, { angle: 90 })).toBe(false);
    expect(g.check({ target: 90 }, [90])).toBe(false);
    expect(g.check({ target: 90 }, Infinity)).toBe(false);
  });
});
