import { describe, it, expect } from 'vitest';
import {
  createFractionStripGenerator,
  isEquivalentDifferentDen,
  LEFT_DEN_MIN,
  LEFT_DEN_MAX,
  RIGHT_DEN_MAX,
  type FractionStripProblem,
} from '../problems';

describe('fraction-strip-compare generator', () => {
  it('given fractions are proper with leftDen in 2..4 and value < 1', () => {
    const g = createFractionStripGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.leftDen).toBeGreaterThanOrEqual(LEFT_DEN_MIN);
      expect(p.leftDen).toBeLessThanOrEqual(LEFT_DEN_MAX);
      expect(p.leftNum).toBeGreaterThanOrEqual(1);
      expect(p.leftNum).toBeLessThanOrEqual(p.leftDen - 1); // proper → value < 1
    }
  });

  it('an equivalent with a DIFFERENT denominator always exists within the right range', () => {
    const g = createFractionStripGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      // doubling is the guaranteed witness: 2·num / 2·den, with 2·den ≤ 8 and ≠ den.
      const witness = { num: 2 * p.leftNum, den: 2 * p.leftDen };
      expect(witness.den).toBeLessThanOrEqual(RIGHT_DEN_MAX);
      expect(witness.den).not.toBe(p.leftDen);
      expect(g.check(p, witness)).toBe(true);
    }
  });

  it('check(): correct equivalents with a different denominator', () => {
    const g = createFractionStripGenerator();
    const half: FractionStripProblem = { leftNum: 1, leftDen: 2 };
    expect(g.check(half, { num: 2, den: 4 })).toBe(true); // 2/4 = 1/2 ✅
    expect(g.check(half, { num: 3, den: 6 })).toBe(true); // 3/6 = 1/2 ✅
    expect(g.check(half, { num: 4, den: 8 })).toBe(true); // 4/8 = 1/2 ✅
    const third: FractionStripProblem = { leftNum: 1, leftDen: 3 };
    expect(g.check(third, { num: 2, den: 6 })).toBe(true); // 2/6 = 1/3 ✅
  });

  it('check(): rejects same-denominator copy, wrong value, malformed input', () => {
    const half: FractionStripProblem = { leftNum: 1, leftDen: 2 };
    expect(half.leftNum).toBe(1); // anchor
    const g = createFractionStripGenerator();
    expect(g.check(half, { num: 1, den: 2 })).toBe(false); // literal copy, same den ❌
    expect(g.check(half, { num: 2, den: 3 })).toBe(false); // 2/3 ≠ 1/2 ❌
    expect(g.check(half, { num: 3, den: 4 })).toBe(false); // 3/4 ≠ 1/2 ❌
    expect(g.check(half, { num: 2, den: 5 })).toBe(false); // 2/5 ≠ 1/2 ❌ off-value
    // malformed:
    expect(g.check(half, { num: 2 })).toBe(false); // missing den
    expect(g.check(half, { num: 1, den: 0 })).toBe(false); // zero denominator
    expect(g.check(half, { num: -1, den: -2 })).toBe(false); // negative pieces
    expect(g.check(half, { num: 2.5, den: 5 })).toBe(false); // non-integer
    expect(g.check(half, { num: NaN, den: 4 })).toBe(false); // NaN
    expect(g.check(half, 0.5)).toBe(false); // a number, not {num,den}
    expect(g.check(half, null)).toBe(false);
    expect(g.check(half, 'half')).toBe(false);
    expect(g.check(half, {})).toBe(false);
  });

  it('isEquivalentDifferentDen mirrors check() for the core rules', () => {
    const third: FractionStripProblem = { leftNum: 2, leftDen: 3 };
    expect(isEquivalentDifferentDen(third, { num: 4, den: 6 })).toBe(true); // 4/6 = 2/3 ✅
    expect(isEquivalentDifferentDen(third, { num: 2, den: 3 })).toBe(false); // same den ❌
    expect(isEquivalentDifferentDen(third, { num: 1, den: 2 })).toBe(false); // 1/2 ≠ 2/3 ❌
    expect(isEquivalentDifferentDen({ leftNum: 1, leftDen: 4 }, { num: 2, den: 8 })).toBe(true); // 2/8 = 1/4 ✅
  });
});
