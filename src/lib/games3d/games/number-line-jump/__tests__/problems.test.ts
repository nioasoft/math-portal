import { describe, it, expect } from 'vitest';
import {
  createNumberLineJumpGenerator,
  MAX,
  START_MAX,
  type NumberLineJumpProblem,
} from '../problems';

describe('number-line-jump generator', () => {
  it('produces non-degenerate, in-range, reachable problems', () => {
    const g = createNumberLineJumpGenerator();
    let sawForward = false;
    let sawBack = false;
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      // start in 0..START_MAX
      expect(Number.isInteger(p.start)).toBe(true);
      expect(p.start).toBeGreaterThanOrEqual(0);
      expect(p.start).toBeLessThanOrEqual(START_MAX);
      // target in 0..MAX
      expect(Number.isInteger(p.target)).toBe(true);
      expect(p.target).toBeGreaterThanOrEqual(0);
      expect(p.target).toBeLessThanOrEqual(MAX);
      // non-degenerate: start ≠ target
      expect(p.start).not.toBe(p.target);
      // reachable within the line: |delta| ≤ MAX
      expect(Math.abs(p.target - p.start)).toBeLessThanOrEqual(MAX);
      if (p.target > p.start) sawForward = true;
      if (p.target < p.start) sawBack = true;
    }
    // both addition (forward) and subtraction (back) problems appear
    expect(sawForward).toBe(true);
    expect(sawBack).toBe(true);
  });

  it('check() accepts only the exact target position (e.g. S=3 → T=11 via +5,+3 → pos 11)', () => {
    const g = createNumberLineJumpGenerator();
    const p: NumberLineJumpProblem = { start: 3, target: 11 };
    // 3 → +5 → 8 → +3 → 11: final position 11 is correct.
    expect(g.check(p, 11)).toBe(true);
    // off-by-one undershoot/overshoot rejected.
    expect(g.check(p, 10)).toBe(false);
    expect(g.check(p, 12)).toBe(false);
    // a backward problem
    expect(g.check({ start: 9, target: 4 }, 4)).toBe(true);
    expect(g.check({ start: 9, target: 4 }, 5)).toBe(false);
  });

  it('boundary: start=0 / car-still-at-start and target=MAX edge cases', () => {
    const g = createNumberLineJumpGenerator();

    // --- Case 1: start=0, target=5 ---
    // Car at start (pos=0), not at target → false
    expect(g.check({ start: 0, target: 5 }, 0)).toBe(false);
    // Car lands exactly on target → true
    expect(g.check({ start: 0, target: 5 }, 5)).toBe(true);

    // --- Case 2: target=MAX (20) boundary ---
    // Forward to the very end of the line
    expect(g.check({ start: 0, target: MAX }, MAX)).toBe(true);
    expect(g.check({ start: 0, target: MAX }, 19)).toBe(false);

    // SUBTRACT-near-MAX: start=18, target=2 (backward problem near top of line)
    expect(g.check({ start: 18, target: 2 }, 2)).toBe(true);
    expect(g.check({ start: 18, target: 2 }, 3)).toBe(false);
  });

  it('check() strictly rejects wrong types, NaN, null, and objects', () => {
    const g = createNumberLineJumpGenerator();
    const p: NumberLineJumpProblem = { start: 3, target: 11 };
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '11')).toBe(false);
    expect(g.check(p, 11.0001)).toBe(false);
    expect(g.check(p, { position: 11 })).toBe(false);
    expect(g.check(p, [11])).toBe(false);
    expect(g.check(p, true)).toBe(false);
  });
});
