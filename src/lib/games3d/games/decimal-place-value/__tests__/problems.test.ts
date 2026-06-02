import { describe, it, expect } from 'vitest';
import {
  createDecimalGenerator,
  valueOfHundredths,
  formatHundredths,
  MIN_HUNDREDTHS,
  MAX_HUNDREDTHS,
} from '../problems';

describe('decimal-place-value generator', () => {
  it('default targets stay within [MIN, MAX] integer hundredths and are never 0.00', () => {
    const g = createDecimalGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.targetHundredths).toBeGreaterThanOrEqual(MIN_HUNDREDTHS);
      expect(p.targetHundredths).toBeLessThanOrEqual(MAX_HUNDREDTHS);
      expect(p.targetHundredths).toBeGreaterThanOrEqual(1); // never degenerate 0.00
    }
  });

  it('a tenths-only band (multiples of 10 hundredths) is honored when requested', () => {
    const g = createDecimalGenerator(10, 90);
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.targetHundredths).toBeGreaterThanOrEqual(10);
      expect(p.targetHundredths).toBeLessThanOrEqual(90);
    }
  });

  it('clamps an out-of-bounds requested range to the valid window', () => {
    const g = createDecimalGenerator(-100, 100000);
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.targetHundredths).toBeGreaterThanOrEqual(MIN_HUNDREDTHS);
      expect(p.targetHundredths).toBeLessThanOrEqual(MAX_HUNDREDTHS);
    }
  });

  it('check() is true ONLY when the built digits compose to exactly the target (integer hundredths)', () => {
    const g = createDecimalGenerator();
    // 3.47 = 347 hundredths = 3 ones, 4 tenths, 7 hundredths
    expect(g.check({ targetHundredths: 347 }, { ones: 3, tenths: 4, hundredths: 7 })).toBe(true);
    // 0.60 = 60 = 0 ones, 6 tenths, 0 hundredths
    expect(g.check({ targetHundredths: 60 }, { ones: 0, tenths: 6, hundredths: 0 })).toBe(true);
    // 5.08 = 508 = 5 ones, 0 tenths, 8 hundredths
    expect(g.check({ targetHundredths: 508 }, { ones: 5, tenths: 0, hundredths: 8 })).toBe(true);
    // off-by-one in each place fails
    expect(g.check({ targetHundredths: 347 }, { ones: 3, tenths: 4, hundredths: 8 })).toBe(false);
    expect(g.check({ targetHundredths: 347 }, { ones: 3, tenths: 5, hundredths: 7 })).toBe(false);
    expect(g.check({ targetHundredths: 347 }, { ones: 4, tenths: 4, hundredths: 7 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null and malformed objects', () => {
    const g = createDecimalGenerator();
    expect(g.check({ targetHundredths: 42 }, 42)).toBe(false);
    expect(g.check({ targetHundredths: 42 }, null)).toBe(false);
    expect(g.check({ targetHundredths: 42 }, undefined)).toBe(false);
    expect(g.check({ targetHundredths: 42 }, '0.42')).toBe(false);
    expect(g.check({ targetHundredths: 42 }, { ones: 0, tenths: 4 })).toBe(false); // missing hundredths
    expect(g.check({ targetHundredths: 42 }, { ones: NaN, tenths: 4, hundredths: 2 })).toBe(false);
    expect(g.check({ targetHundredths: 42 }, { ones: 0, tenths: Infinity, hundredths: 2 })).toBe(false);
  });
});

describe('valueOfHundredths', () => {
  it('computes ones·100 + tenths·10 + hundredths in integer hundredths', () => {
    expect(valueOfHundredths({ ones: 0, tenths: 0, hundredths: 0 })).toBe(0);
    expect(valueOfHundredths({ ones: 3, tenths: 4, hundredths: 7 })).toBe(347);
    expect(valueOfHundredths({ ones: 0, tenths: 6, hundredths: 0 })).toBe(60);
    expect(valueOfHundredths({ ones: 9, tenths: 9, hundredths: 9 })).toBe(999);
  });
});

describe('formatHundredths', () => {
  it('formats with trailing zeros trimmed and the point after ones', () => {
    expect(formatHundredths(347)).toBe('3.47');
    expect(formatHundredths(60)).toBe('0.6'); // trailing zero trimmed
    expect(formatHundredths(508)).toBe('5.08'); // inner zero kept
    expect(formatHundredths(500)).toBe('5'); // both trailing zeros trimmed
    expect(formatHundredths(1)).toBe('0.01');
    expect(formatHundredths(999)).toBe('9.99');
    expect(formatHundredths(0)).toBe('0');
  });

  it('floors and clamps defensively', () => {
    expect(formatHundredths(347.9)).toBe('3.47');
    expect(formatHundredths(-50)).toBe('0');
  });
});
