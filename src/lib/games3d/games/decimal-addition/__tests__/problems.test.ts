import { describe, it, expect } from 'vitest';
import { createDecimalAdditionGenerator, formatHundredths, valueOfHundredths } from '../problems';

describe('decimal-addition generator', () => {
  it('produces problems with sums <= MAX_SUM', () => {
    const g = createDecimalAdditionGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const sum = p.aHundredths + p.bHundredths;
      expect(sum).toBeLessThanOrEqual(999);
      expect(p.aHundredths).toBeGreaterThanOrEqual(10);
      expect(p.bHundredths).toBeGreaterThanOrEqual(10);
      expect(Number.isInteger(p.aHundredths)).toBe(true);
      expect(Number.isInteger(p.bHundredths)).toBe(true);
    }
  });

  it('check() accepts correct digit compositions', () => {
    const g = createDecimalAdditionGenerator();
    // 1.23 + 4.56 = 5.79
    expect(g.check({ aHundredths: 123, bHundredths: 456 }, { ones: 5, tenths: 7, hundredths: 9 })).toBe(true);
    // 0.50 + 0.50 = 1.00
    expect(g.check({ aHundredths: 50, bHundredths: 50 }, { ones: 1, tenths: 0, hundredths: 0 })).toBe(true);
  });

  it('check() rejects incorrect digits', () => {
    const g = createDecimalAdditionGenerator();
    // 1.23 + 4.56 = 5.79, not 5.78
    expect(g.check({ aHundredths: 123, bHundredths: 456 }, { ones: 5, tenths: 7, hundredths: 8 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createDecimalAdditionGenerator();
    const p = { aHundredths: 123, bHundredths: 456 };
    expect(g.check(p, '579')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, 579)).toBe(false); // number, not DecimalDigits
    expect(g.check(p, [5, 7, 9])).toBe(false);
    expect(g.check(p, { ones: 5, tenths: 7 })).toBe(false); // missing hundredths
  });

  it('valueOfHundredths and formatHundredths work correctly', () => {
    expect(valueOfHundredths({ ones: 5, tenths: 7, hundredths: 9 })).toBe(579);
    expect(formatHundredths(579)).toBe('5.79');
    expect(formatHundredths(50)).toBe('0.5');
    expect(formatHundredths(500)).toBe('5');
  });
});
