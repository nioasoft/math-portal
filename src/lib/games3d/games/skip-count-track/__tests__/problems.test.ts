import { describe, it, expect } from 'vitest';
import {
  createSkipCountGenerator,
  solutionSet,
  STEPS,
  MIN_SKIPS,
  MAX_SKIPS,
  MAX_TARGET,
} from '../problems';

describe('skip-count-track generator', () => {
  it('produces only valid, non-degenerate problems within ranges', () => {
    const g = createSkipCountGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(STEPS).toContain(p.step);
      expect(p.target % p.step).toBe(0); // target is a multiple of step
      const k = p.target / p.step;
      expect(k).toBeGreaterThanOrEqual(MIN_SKIPS);
      expect(k).toBeLessThanOrEqual(MAX_SKIPS);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
    }
  });

  it('solutionSet is exactly {step, 2·step, …, target}', () => {
    expect([...solutionSet({ step: 5, target: 20 })].sort((a, b) => a - b)).toEqual([5, 10, 15, 20]);
    expect([...solutionSet({ step: 2, target: 8 })].sort((a, b) => a - b)).toEqual([2, 4, 6, 8]);
    expect([...solutionSet({ step: 10, target: 30 })].sort((a, b) => a - b)).toEqual([10, 20, 30]);
  });

  it('check() accepts the exact multiple set (any order)', () => {
    const g = createSkipCountGenerator();
    expect(g.check({ step: 5, target: 20 }, [5, 10, 15, 20])).toBe(true);
    expect(g.check({ step: 5, target: 20 }, [20, 5, 15, 10])).toBe(true); // order-independent
    expect(g.check({ step: 2, target: 8 }, [2, 4, 6, 8])).toBe(true);
  });

  it('check() rejects missing, extra, and wrong marks', () => {
    expect(g().check({ step: 5, target: 20 }, [5, 10, 20])).toBe(false); // missing 15
    expect(g().check({ step: 5, target: 20 }, [5, 10, 15, 20, 7])).toBe(false); // extra 7
    expect(g().check({ step: 5, target: 20 }, [2, 4, 6, 8])).toBe(false); // wrong step
    expect(g().check({ step: 5, target: 20 }, [5, 10, 15, 25])).toBe(false); // overshoots target
    expect(g().check({ step: 5, target: 20 }, [])).toBe(false); // empty (start state)
    expect(g().check({ step: 5, target: 20 }, [5, 5, 10, 15, 20])).toBe(false); // duplicate
  });

  it('check() rejects wrong types / NaN / null / objects', () => {
    expect(g().check({ step: 5, target: 20 }, 20)).toBe(false);
    expect(g().check({ step: 5, target: 20 }, null)).toBe(false);
    expect(g().check({ step: 5, target: 20 }, { a: 1 })).toBe(false);
    expect(g().check({ step: 5, target: 20 }, [5, 10, NaN, 20])).toBe(false);
    expect(g().check({ step: 5, target: 20 }, [5, 10.5, 15, 20])).toBe(false); // non-integer
    expect(g().check({ step: 5, target: 20 }, ['5', '10'] as unknown)).toBe(false);
  });
});

function g() {
  return createSkipCountGenerator();
}
