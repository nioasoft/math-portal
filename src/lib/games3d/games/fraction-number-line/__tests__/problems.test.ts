import { describe, it, expect } from 'vitest';
import {
  createFractionNumberLineGenerator,
  fractionsEqual,
  GRADE_3_DENOMINATORS,
  GRADE_4_MAX_DENOMINATOR,
  type FractionTarget,
} from '../problems';

describe('fractionsEqual (value-based, integer cross-multiply)', () => {
  it('treats equivalent fractions as equal', () => {
    // 2/4 == 1/2, 3/6 == 1/2, 2/3 == 4/6
    expect(fractionsEqual({ num: 2, den: 4 }, { num: 1, den: 2 })).toBe(true);
    expect(fractionsEqual({ num: 3, den: 6 }, { num: 1, den: 2 })).toBe(true);
    expect(fractionsEqual({ num: 4, den: 6 }, { num: 2, den: 3 })).toBe(true);
    expect(fractionsEqual({ num: 1, den: 2 }, { num: 1, den: 2 })).toBe(true);
  });

  it('treats non-equivalent fractions as unequal', () => {
    expect(fractionsEqual({ num: 1, den: 3 }, { num: 1, den: 2 })).toBe(false);
    expect(fractionsEqual({ num: 2, den: 5 }, { num: 1, den: 2 })).toBe(false);
    expect(fractionsEqual({ num: 3, den: 4 }, { num: 1, den: 2 })).toBe(false);
  });

  it('handles 0/n equivalence (all zeros equal regardless of denominator)', () => {
    expect(fractionsEqual({ num: 0, den: 4 }, { num: 0, den: 2 })).toBe(true);
    expect(fractionsEqual({ num: 0, den: 7 }, { num: 0, den: 1 })).toBe(true);
    expect(fractionsEqual({ num: 0, den: 4 }, { num: 1, den: 2 })).toBe(false);
  });

  it('returns false when a denominator is zero (degenerate / undefined value)', () => {
    expect(fractionsEqual({ num: 1, den: 0 }, { num: 1, den: 2 })).toBe(false);
    expect(fractionsEqual({ num: 1, den: 2 }, { num: 1, den: 0 })).toBe(false);
    expect(fractionsEqual({ num: 0, den: 0 }, { num: 0, den: 0 })).toBe(false);
  });
});

describe('fraction-number-line generator — target validity', () => {
  it('grade 3: denominators are within {2,3,4}, numerator 1..den, non-degenerate', () => {
    const g = createFractionNumberLineGenerator({ grade: 3 });
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(GRADE_3_DENOMINATORS).toContain(p.den);
      expect(p.num).toBeGreaterThanOrEqual(1);
      expect(p.num).toBeLessThanOrEqual(p.den);
    }
  });

  it('grade 4: denominators within 2..8, numerator 1..den, non-degenerate', () => {
    const g = createFractionNumberLineGenerator({ grade: 4 });
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.den).toBeGreaterThanOrEqual(2);
      expect(p.den).toBeLessThanOrEqual(GRADE_4_MAX_DENOMINATOR);
      expect(p.num).toBeGreaterThanOrEqual(1);
      expect(p.num).toBeLessThanOrEqual(p.den);
    }
  });

  it('never emits a degenerate target (num >= 1 always, so 0/den is impossible)', () => {
    const g = createFractionNumberLineGenerator({ grade: 4 });
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.num).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('fraction-number-line generator — check() is VALUE-based', () => {
  const g = createFractionNumberLineGenerator({ grade: 4 });

  it('accepts an equivalent fraction (2/4 correct for target 1/2)', () => {
    const target: FractionTarget = { num: 1, den: 2 };
    expect(g.check(target, { num: 2, den: 4 })).toBe(true);
    expect(g.check(target, { num: 1, den: 2 })).toBe(true);
    expect(g.check(target, { num: 4, den: 8 })).toBe(true);
  });

  it('rejects a different value (1/3 wrong for target 1/2)', () => {
    const target: FractionTarget = { num: 1, den: 2 };
    expect(g.check(target, { num: 1, den: 3 })).toBe(false);
    expect(g.check(target, { num: 2, den: 3 })).toBe(false);
    expect(g.check(target, { num: 0, den: 2 })).toBe(false);
  });

  it('rejects wrong types, null, NaN, objects without numeric num/den', () => {
    const target: FractionTarget = { num: 3, den: 4 };
    expect(g.check(target, 0.75)).toBe(false);
    expect(g.check(target, '3/4')).toBe(false);
    expect(g.check(target, null)).toBe(false);
    expect(g.check(target, undefined)).toBe(false);
    expect(g.check(target, {})).toBe(false);
    expect(g.check(target, { num: NaN, den: 4 })).toBe(false);
    expect(g.check(target, { num: 3, den: NaN })).toBe(false);
    expect(g.check(target, { num: '3', den: '4' })).toBe(false);
  });

  it('rejects an answer with denominator 0 (no division by zero, no false-positive)', () => {
    // A 0-denominator answer is an undefined value → always false, even against a
    // zero-valued target.
    expect(g.check({ num: 1, den: 2 }, { num: 1, den: 0 })).toBe(false);
    expect(g.check({ num: 0, den: 1 } as FractionTarget, { num: 0, den: 0 })).toBe(false);
  });
});
