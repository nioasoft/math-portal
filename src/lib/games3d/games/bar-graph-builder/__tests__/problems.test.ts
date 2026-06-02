import { describe, it, expect } from 'vitest';
import { createBarGraphGenerator, MAX_COUNT, BAR_EMOJI, type BarGraphProblem } from '../problems';

describe('bar-graph-builder generator', () => {
  it('produces 3 distinct counts in 1..MAX_COUNT with a non-degenerate positive diff', () => {
    const g = createBarGraphGenerator();
    for (let i = 0; i < 400; i++) {
      const p = g.next();
      expect(p.bars).toHaveLength(3);
      const counts = p.bars.map((b) => b.count);
      // distinct
      expect(new Set(counts).size).toBe(3);
      // in range
      for (const c of counts) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(MAX_COUNT);
      }
      // a is strictly more than b, diff ≥ 1
      expect(p.aIndex).not.toBe(p.bIndex);
      expect(p.bars[p.aIndex].count).toBeGreaterThan(p.bars[p.bIndex].count);
      expect(p.diff).toBe(p.bars[p.aIndex].count - p.bars[p.bIndex].count);
      expect(p.diff).toBeGreaterThanOrEqual(1);
      // emoji are the language-free category labels
      expect(p.bars.map((b) => b.emoji)).toEqual([...BAR_EMOJI]);
    }
  });

  it('check() accepts the exact read-off difference', () => {
    const g = createBarGraphGenerator();
    const p: BarGraphProblem = {
      bars: [
        { emoji: '🍎', count: 7 },
        { emoji: '🍌', count: 3 },
        { emoji: '🍇', count: 5 },
      ],
      aIndex: 0,
      bIndex: 1,
      diff: 4,
    };
    expect(g.check(p, 4)).toBe(true); // 7 − 3 = 4 ✅
    expect(g.check(p, 3)).toBe(false); // off-by-one ❌
    expect(g.check(p, 5)).toBe(false);
    expect(g.check(p, 0)).toBe(false); // the start value is never the answer
  });

  it('check() rejects wrong types, NaN, null, objects, non-integers', () => {
    const g = createBarGraphGenerator();
    const p: BarGraphProblem = {
      bars: [
        { emoji: '🍎', count: 6 },
        { emoji: '🍌', count: 2 },
        { emoji: '🍇', count: 9 },
      ],
      aIndex: 2,
      bIndex: 1,
      diff: 7,
    };
    expect(g.check(p, 7)).toBe(true);
    expect(g.check(p, '7' as unknown)).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, Infinity)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { value: 7 } as unknown)).toBe(false);
    expect(g.check(p, 7.5)).toBe(false);
    expect(g.check(p, [7] as unknown)).toBe(false);
  });
});
