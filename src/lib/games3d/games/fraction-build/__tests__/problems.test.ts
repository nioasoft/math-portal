import { describe, it, expect } from 'vitest';
import { createFractionGenerator, FRACTION_DENOMINATORS } from '../problems';

describe('fraction-build generator', () => {
  it('produces proper fractions with allowed denominators', () => {
    const g = createFractionGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(FRACTION_DENOMINATORS).toContain(p.denominator);
      expect(p.numerator).toBeGreaterThanOrEqual(1);
      expect(p.numerator).toBeLessThan(p.denominator);
    }
  });

  it('check() accepts the numerator (filled-slice count) and rejects others', () => {
    const g = createFractionGenerator();
    const p = { numerator: 3, denominator: 4 };
    expect(g.check(p, 3)).toBe(true);
    expect(g.check(p, 2)).toBe(false);
    expect(g.check(p, '3')).toBe(false);
  });
});
