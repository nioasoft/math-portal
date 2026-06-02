import { describe, it, expect } from 'vitest';
import {
  createWordProblemBarGenerator,
  MAX_VALUE,
  NAME_COUNT,
  ITEM_COUNT,
  type WordProblemBarProblem,
} from '../problems';

describe('word-problem-bar generator', () => {
  it('produces in-range, non-degenerate, solvable problems', () => {
    const g = createWordProblemBarGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      // answer always a positive integer within the child's dial range
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.answer).toBeGreaterThanOrEqual(1);
      expect(p.answer).toBeLessThanOrEqual(18);
      expect(p.answer).toBeLessThanOrEqual(MAX_VALUE);
      // localisation indices are within the agreed lists
      expect(p.nameIndex).toBeGreaterThanOrEqual(0);
      expect(p.nameIndex).toBeLessThan(NAME_COUNT);
      expect(p.itemIndex).toBeGreaterThanOrEqual(0);
      expect(p.itemIndex).toBeLessThan(ITEM_COUNT);

      if (p.type === 'add') {
        expect(p.a).toBeGreaterThanOrEqual(2);
        expect(p.a).toBeLessThanOrEqual(9);
        expect(p.b).toBeGreaterThanOrEqual(2);
        expect(p.b).toBeLessThanOrEqual(9);
        expect(p.whole).toBeUndefined();
        expect(p.answer).toBe((p.a as number) + (p.b as number));
      } else {
        expect(p.whole).toBeGreaterThanOrEqual(5);
        expect(p.whole).toBeLessThanOrEqual(12);
        expect(p.a).toBeGreaterThanOrEqual(1);
        expect(p.a).toBeLessThan(p.whole as number); // non-degenerate: remaining >= 1
        expect(p.b).toBeUndefined();
        expect(p.answer).toBe((p.whole as number) - p.a);
      }
    }
  });

  it('check() is exact for add', () => {
    const g = createWordProblemBarGenerator();
    const add: WordProblemBarProblem = { type: 'add', nameIndex: 0, itemIndex: 0, a: 5, b: 3, answer: 8 };
    expect(g.check(add, 8)).toBe(true);
    expect(g.check(add, 7)).toBe(false); // off-by-one
    expect(g.check(add, 9)).toBe(false); // off-by-one
  });

  it('check() is exact for sub', () => {
    const g = createWordProblemBarGenerator();
    const sub: WordProblemBarProblem = { type: 'sub', nameIndex: 1, itemIndex: 2, a: 4, whole: 10, answer: 6 };
    expect(g.check(sub, 6)).toBe(true);
    expect(g.check(sub, 5)).toBe(false); // off-by-one
    expect(g.check(sub, 7)).toBe(false); // off-by-one
  });

  it('check() rejects non-integers, wrong types, NaN/null/objects', () => {
    const g = createWordProblemBarGenerator();
    const p: WordProblemBarProblem = { type: 'add', nameIndex: 0, itemIndex: 0, a: 5, b: 3, answer: 8 };
    expect(g.check(p, 8.0001)).toBe(false); // float near-miss
    expect(g.check(p, 7.5)).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, '8')).toBe(false); // string
    expect(g.check(p, { value: 8 })).toBe(false); // object
    expect(g.check(p, [8])).toBe(false);
  });

  it('answer never starts solved at 0 (answer >= 1 always)', () => {
    const g = createWordProblemBarGenerator();
    for (let i = 0; i < 200; i++) {
      expect(g.next().answer).not.toBe(0);
    }
  });
});
