import { describe, it, expect } from 'vitest';
import { createGeometricSequenceGenerator, MAX_VALUE } from '../problems';

describe('geometric-sequence generator', () => {
  it('produces valid sequences with correct terms', () => {
    const g = createGeometricSequenceGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.length).toBe(5);
      expect([2, 3]).toContain(p.multiplier);
      expect([1, 2, 3]).toContain(p.start);
      expect(p.missingIndex).toBeGreaterThanOrEqual(2);
      expect(p.missingIndex).toBeLessThanOrEqual(3);
      expect(p.terms.length).toBe(5);
      expect(p.terms[0]).toBe(p.start);
      for (let j = 1; j < 5; j++) {
        expect(p.terms[j]).toBe(p.terms[j - 1] * p.multiplier);
      }
      expect(p.terms[4]).toBeLessThanOrEqual(MAX_VALUE);
    }
  });

  it('check() accepts correct answers', () => {
    const g = createGeometricSequenceGenerator();
    expect(g.check({ start: 1, multiplier: 2, length: 5, missingIndex: 2, terms: [1, 2, 4, 8, 16] }, 4)).toBe(true);
    expect(g.check({ start: 2, multiplier: 3, length: 5, missingIndex: 3, terms: [2, 6, 18, 54, 162] }, 54)).toBe(true);
  });

  it('check() rejects off-by-one answers', () => {
    const g = createGeometricSequenceGenerator();
    expect(g.check({ start: 1, multiplier: 2, length: 5, missingIndex: 2, terms: [1, 2, 4, 8, 16] }, 3)).toBe(false);
    expect(g.check({ start: 1, multiplier: 2, length: 5, missingIndex: 2, terms: [1, 2, 4, 8, 16] }, 5)).toBe(false);
  });

  it('check() rejects wrong types, NaN, null, strings, objects', () => {
    const g = createGeometricSequenceGenerator();
    const p = { start: 1, multiplier: 2, length: 5, missingIndex: 2, terms: [1, 2, 4, 8, 16] };
    expect(g.check(p, '4')).toBe(false);
    expect(g.check(p, NaN)).toBe(false);
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, { val: 4 })).toBe(false);
    expect(g.check(p, [4])).toBe(false);
    expect(g.check(p, 4.5)).toBe(false);
    expect(g.check(p, 0)).toBe(false);
    expect(g.check(p, -4)).toBe(false);
  });
});
