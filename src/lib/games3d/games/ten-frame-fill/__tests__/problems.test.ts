import { describe, it, expect } from 'vitest';
import { createTenFrameGenerator, MAX_TARGET, MIN_TARGET } from '../problems';

describe('ten-frame-fill generator', () => {
  it('targets stay within the valid range (1..20) and are integers', () => {
    const g = createTenFrameGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(Number.isInteger(p.target)).toBe(true);
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
    }
  });

  it('respects a custom max target (easy band ≤ 10)', () => {
    const g = createTenFrameGenerator(10);
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(1);
      expect(p.target).toBeLessThanOrEqual(10);
    }
  });

  it('clamps an out-of-range max target into [1, 20]', () => {
    const high = createTenFrameGenerator(999);
    const low = createTenFrameGenerator(-5);
    for (let i = 0; i < 100; i++) {
      expect(high.next().target).toBeLessThanOrEqual(MAX_TARGET);
      expect(low.next().target).toBe(1); // ceiling clamped to MIN_TARGET=1
    }
  });

  it('no degenerate "place 0" problems', () => {
    const g = createTenFrameGenerator();
    for (let i = 0; i < 300; i++) {
      expect(g.next().target).not.toBe(0);
    }
  });

  it('check() is true only when the built count equals the target', () => {
    const g = createTenFrameGenerator();
    expect(g.check({ target: 7 }, 7)).toBe(true);
    expect(g.check({ target: 7 }, 6)).toBe(false);
    expect(g.check({ target: 7 }, 8)).toBe(false);
    expect(g.check({ target: 14 }, 14)).toBe(true);
    expect(g.check({ target: 14 }, 13)).toBe(false);
  });

  it('check() rejects malformed answers', () => {
    const g = createTenFrameGenerator();
    expect(g.check({ target: 5 }, '5' as unknown)).toBe(false);
    expect(g.check({ target: 5 }, 5.5)).toBe(false);
    expect(g.check({ target: 5 }, null)).toBe(false);
    expect(g.check({ target: 5 }, undefined)).toBe(false);
    expect(g.check({ target: 5 }, { count: 5 })).toBe(false);
    expect(g.check({ target: 5 }, NaN)).toBe(false);
  });
});
