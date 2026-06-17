import { describe, it, expect } from 'vitest';
import { createRecipeGenerator, MIN_ANSWER, MAX_ANSWER } from '../problems';

describe('ratio-recipe generator', () => {
  it('produces problems with clean integer answers', () => {
    const g = createRecipeGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const result = p.baseAmount * (p.targetServings / p.baseServings);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(MIN_ANSWER);
      expect(result).toBeLessThanOrEqual(MAX_ANSWER);
      expect(p.baseServings).toBe(2);
      expect(p.targetServings % 2).toBe(0);
    }
  });

  it('check() accepts correct answers', () => {
    const g = createRecipeGenerator();
    expect(g.check({ baseServings: 2, targetServings: 4, baseAmount: 3 }, 6)).toBe(true);
    expect(g.check({ baseServings: 2, targetServings: 8, baseAmount: 2 }, 8)).toBe(true);
    expect(g.check({ baseServings: 2, targetServings: 10, baseAmount: 5 }, 25)).toBe(true);
  });

  it('check() rejects off-by-one answers', () => {
    const g = createRecipeGenerator();
    expect(g.check({ baseServings: 2, targetServings: 4, baseAmount: 3 }, 5)).toBe(false);
    expect(g.check({ baseServings: 2, targetServings: 4, baseAmount: 3 }, 7)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createRecipeGenerator();
    const p = { baseServings: 2, targetServings: 4, baseAmount: 3 };
    expect(g.check(p, '6')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 6 })).toBe(false);
    expect(g.check(p, [6])).toBe(false);
    expect(g.check(p, 6.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -6)).toBe(false);
  });

  it('accepts every valid combination at its correct answer', () => {
    const g = createRecipeGenerator();
    const targets = [4, 6, 8, 10];
    const amounts = [1, 2, 3, 4, 5];
    for (const target of targets) {
      for (const amount of amounts) {
        const expected = amount * (target / 2);
        expect(g.check({ baseServings: 2, targetServings: target, baseAmount: amount }, expected)).toBe(true);
      }
    }
  });
});
