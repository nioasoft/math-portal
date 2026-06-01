import { describe, it, expect } from 'vitest';
import { createMeasureFillGenerator, MEASURE_TOLERANCE_ML } from '../problems';

describe('measure-fill generator', () => {
  it('targets are positive multiples of 50 within capacity', () => {
    const g = createMeasureFillGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.targetMl % 50).toBe(0);
      expect(p.targetMl).toBeGreaterThan(0);
      expect(p.targetMl).toBeLessThanOrEqual(p.capacityMl);
    }
  });

  it('check() accepts answers within tolerance and rejects outside', () => {
    const g = createMeasureFillGenerator();
    const p = { targetMl: 250, capacityMl: 1000 };
    expect(g.check(p, 250)).toBe(true);
    expect(g.check(p, 250 + MEASURE_TOLERANCE_ML)).toBe(true);
    expect(g.check(p, 250 + MEASURE_TOLERANCE_ML + 1)).toBe(false);
    expect(g.check(p, 'x')).toBe(false);
  });
});
