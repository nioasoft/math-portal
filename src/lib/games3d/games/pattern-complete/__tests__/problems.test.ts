import { describe, it, expect } from 'vitest';
import {
  createPatternCompleteGenerator,
  SEQUENCE_LENGTH,
  MAX_HEIGHT,
  MIN_START,
  MAX_START,
  MIN_STEP,
  MAX_STEP,
} from '../problems';

describe('pattern-complete generator', () => {
  it('produces a length-4 arithmetic sequence within range, gap never at index 0', () => {
    const g = createPatternCompleteGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.heights).toHaveLength(SEQUENCE_LENGTH);

      // Arithmetic: constant common difference.
      const step = p.heights[1] - p.heights[0];
      for (let k = 1; k < p.heights.length; k++) {
        expect(p.heights[k] - p.heights[k - 1]).toBe(step);
      }

      // Range constraints.
      expect(step).toBeGreaterThanOrEqual(MIN_STEP);
      expect(step).toBeLessThanOrEqual(MAX_STEP);
      expect(p.heights[0]).toBeGreaterThanOrEqual(MIN_START);
      expect(p.heights[0]).toBeLessThanOrEqual(MAX_START);
      expect(p.heights[p.heights.length - 1]).toBeLessThanOrEqual(MAX_HEIGHT);

      // Gap is interior/trailing, never the leading tower.
      expect(p.gapIndex).toBeGreaterThanOrEqual(1);
      expect(p.gapIndex).toBeLessThanOrEqual(SEQUENCE_LENGTH - 1);

      // missing matches the gapped height.
      expect(p.missing).toBe(p.heights[p.gapIndex]);
    }
  });

  it('never opens already solved (missing >= 1, distinct from a built=0 start)', () => {
    const g = createPatternCompleteGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.missing).toBeGreaterThanOrEqual(1);
    }
  });

  it('check() — sequence 2,4,6,?,length4 step2 start2 gap3 → 8 correct, 7/9 wrong', () => {
    const g = createPatternCompleteGenerator();
    // heights for start=2 step=2: [2,4,6,8], gapIndex 3 → missing 8.
    const problem = { heights: [2, 4, 6, 8], gapIndex: 3, missing: 8 };
    expect(g.check(problem, 8)).toBe(true);
    expect(g.check(problem, 7)).toBe(false); // off-by-one low
    expect(g.check(problem, 9)).toBe(false); // off-by-one high
  });

  it('check() — step 1 and step 3 sequences, interior gap', () => {
    const g = createPatternCompleteGenerator();
    // step 1, start 3: [3,4,5,6], gap at index 1 → 4
    expect(g.check({ heights: [3, 4, 5, 6], gapIndex: 1, missing: 4 }, 4)).toBe(true);
    expect(g.check({ heights: [3, 4, 5, 6], gapIndex: 1, missing: 4 }, 5)).toBe(false);
    // step 3, start 1: [1,4,7,10] would exceed MAX_HEIGHT — use start 1 step 2 [1,3,5,7] gap 2 → 5
    expect(g.check({ heights: [1, 3, 5, 7], gapIndex: 2, missing: 5 }, 5)).toBe(true);
    expect(g.check({ heights: [1, 3, 5, 7], gapIndex: 2, missing: 5 }, 6)).toBe(false);
  });

  it('check() — strict type rejection (NaN, null, float, object, string)', () => {
    const g = createPatternCompleteGenerator();
    const p = { heights: [2, 4, 6, 8], gapIndex: 3, missing: 8 };
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, 8.0001)).toBe(false);
    expect(g.check(p, 7.5)).toBe(false);
    expect(g.check(p, '8')).toBe(false);
    expect(g.check(p, { value: 8 })).toBe(false);
    expect(g.check(p, [8])).toBe(false);
  });
});
