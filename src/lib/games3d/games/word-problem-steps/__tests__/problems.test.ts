import { describe, it, expect } from 'vitest';
import { createMultiStepGenerator } from '../problems';

describe('word-problem-steps generator', () => {
  it('produces problems with results in 1..20', () => {
    const g = createMultiStepGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.stepA).toBeGreaterThanOrEqual(5);
      expect(p.stepA).toBeLessThanOrEqual(15);
      expect(p.stepB).toBeGreaterThanOrEqual(3);
      expect(p.stepB).toBeLessThanOrEqual(10);
      expect(['add', 'sub']).toContain(p.op1);
      expect(['add', 'sub']).toContain(p.op2);
      expect(p.op1).not.toBe(p.op2);

      // Compute result
      let result = p.stepA;
      if (p.op1 === 'add') result += p.stepB;
      else result -= p.stepB;
      if (p.op2 === 'add') result += p.stepB;
      else result -= p.stepB;
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });

  it('check() accepts correct answers', () => {
    const g = createMultiStepGenerator();
    // 10 + 5 - 5 = 10
    expect(g.check({ stepA: 10, op1: 'add', stepB: 5, op2: 'sub', storyIndex: 0 }, 10)).toBe(true);
    // 8 - 3 + 3 = 8
    expect(g.check({ stepA: 8, op1: 'sub', stepB: 3, op2: 'add', storyIndex: 0 }, 8)).toBe(true);
  });

  it('check() rejects wrong answers', () => {
    const g = createMultiStepGenerator();
    expect(g.check({ stepA: 10, op1: 'add', stepB: 5, op2: 'sub', storyIndex: 0 }, 11)).toBe(false);
    expect(g.check({ stepA: 10, op1: 'add', stepB: 5, op2: 'sub', storyIndex: 0 }, 9)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createMultiStepGenerator();
    const p = { stepA: 10, op1: 'add' as const, stepB: 5, op2: 'sub' as const, storyIndex: 0 };
    expect(g.check(p, '10')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 10 })).toBe(false);
    expect(g.check(p, [10])).toBe(false);
    expect(g.check(p, 10.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -10)).toBe(false);
  });
});
