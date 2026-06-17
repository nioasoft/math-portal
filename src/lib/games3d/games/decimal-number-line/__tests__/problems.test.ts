import { describe, it, expect } from 'vitest';
import { createDecimalLineGenerator, MIN_TARGET, MAX_TARGET, formatDecimal } from '../problems';

describe('decimal-number-line generator', () => {
  it('produces targets in valid range', () => {
    const g = createDecimalLineGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.targetHundredths).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.targetHundredths).toBeLessThanOrEqual(MAX_TARGET);
      expect(Number.isInteger(p.targetHundredths)).toBe(true);
    }
  });

  it('formatDecimal formats correctly', () => {
    expect(formatDecimal(37)).toBe('0.37');
    expect(formatDecimal(50)).toBe('0.5');
    expect(formatDecimal(5)).toBe('0.05');
    expect(formatDecimal(10)).toBe('0.1');
    expect(formatDecimal(99)).toBe('0.99');
    expect(formatDecimal(1)).toBe('0.01');
  });

  it('check() accepts answers within tolerance', () => {
    const g = createDecimalLineGenerator();
    expect(g.check({ targetHundredths: 50 }, 50)).toBe(true);
    expect(g.check({ targetHundredths: 50 }, 49)).toBe(true);
    expect(g.check({ targetHundredths: 50 }, 51)).toBe(true);
    expect(g.check({ targetHundredths: 50 }, 48)).toBe(true);
    expect(g.check({ targetHundredths: 50 }, 52)).toBe(true);
  });

  it('check() rejects answers outside tolerance', () => {
    const g = createDecimalLineGenerator();
    expect(g.check({ targetHundredths: 50 }, 47)).toBe(false);
    expect(g.check({ targetHundredths: 50 }, 53)).toBe(false);
    expect(g.check({ targetHundredths: 50 }, 0)).toBe(false);
    expect(g.check({ targetHundredths: 50 }, 100)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createDecimalLineGenerator();
    const p = { targetHundredths: 50 };
    expect(g.check(p, '50')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 50 })).toBe(false);
    expect(g.check(p, [50])).toBe(false);
    expect(g.check(p, 50.5)).toBe(false);
    expect(g.check(p, -50)).toBe(false);
  });

  it('accepts every valid target at its exact value', () => {
    const g = createDecimalLineGenerator();
    for (let v = MIN_TARGET; v <= MAX_TARGET; v++) {
      expect(g.check({ targetHundredths: v }, v)).toBe(true);
    }
  });
});
