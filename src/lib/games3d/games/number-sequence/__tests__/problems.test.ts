import { describe, it, expect } from 'vitest';
import {
  createNumberSequenceGenerator,
  MAX_VALUE,
  MIN_LENGTH,
  MAX_LENGTH,
  type NumberSequenceProblem,
} from '../problems';

describe('number-sequence generator', () => {
  it('produces valid arithmetic or geometric sequences within bounds', () => {
    const g = createNumberSequenceGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      // All terms positive integers.
      for (const t of p.terms) {
        expect(Number.isInteger(t)).toBe(true);
        expect(t).toBeGreaterThanOrEqual(1);
      }
      // Missing value in range [1, MAX_VALUE].
      expect(p.answer).toBeGreaterThanOrEqual(1);
      expect(p.answer).toBeLessThanOrEqual(MAX_VALUE);
      // answer matches the term at the missing index.
      expect(p.answer).toBe(p.terms[p.missingIndex]);
      // Missing index inside the sequence.
      expect(p.missingIndex).toBeGreaterThanOrEqual(0);
      expect(p.missingIndex).toBeLessThan(p.terms.length);

      if (p.kind === 'arithmetic') {
        expect(p.terms.length).toBeGreaterThanOrEqual(MIN_LENGTH);
        expect(p.terms.length).toBeLessThanOrEqual(MAX_LENGTH);
        const d = p.terms[1] - p.terms[0];
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
        for (let k = 1; k < p.terms.length; k++) {
          expect(p.terms[k] - p.terms[k - 1]).toBe(d);
        }
      } else {
        const r = p.terms[1] / p.terms[0];
        expect([2, 3]).toContain(r);
        for (let k = 1; k < p.terms.length; k++) {
          expect(p.terms[k]).toBe(p.terms[k - 1] * r);
        }
      }
    }
  });

  it('eventually generates BOTH arithmetic and geometric kinds', () => {
    const g = createNumberSequenceGenerator();
    const kinds = new Set<string>();
    for (let i = 0; i < 200; i++) kinds.add(g.next().kind);
    expect(kinds.has('arithmetic')).toBe(true);
    expect(kinds.has('geometric')).toBe(true);
  });

  it('eventually puts the missing term somewhere other than the last position', () => {
    const g = createNumberSequenceGenerator();
    let nonLast = false;
    for (let i = 0; i < 200 && !nonLast; i++) {
      const p = g.next();
      if (p.missingIndex !== p.terms.length - 1) nonLast = true;
    }
    expect(nonLast).toBe(true);
  });

  it('check(): arithmetic 2,5,8,?,14 → 11 correct, 10 wrong', () => {
    const g = createNumberSequenceGenerator();
    const problem: NumberSequenceProblem = {
      kind: 'arithmetic',
      terms: [2, 5, 8, 11, 14],
      missingIndex: 3,
      answer: 11,
    };
    expect(g.check(problem, 11)).toBe(true);
    expect(g.check(problem, 10)).toBe(false); // off-by-one
    expect(g.check(problem, 12)).toBe(false); // off-by-one other side
  });

  it('check(): geometric 3,6,?,24 → 12 correct, 18 wrong', () => {
    const g = createNumberSequenceGenerator();
    const problem: NumberSequenceProblem = {
      kind: 'geometric',
      terms: [3, 6, 12, 24],
      missingIndex: 2,
      answer: 12,
    };
    expect(g.check(problem, 12)).toBe(true);
    expect(g.check(problem, 18)).toBe(false); // arithmetic-rule mistake
  });

  it('check(): rejects wrong types, NaN, null, objects', () => {
    const g = createNumberSequenceGenerator();
    const problem: NumberSequenceProblem = {
      kind: 'arithmetic',
      terms: [1, 2, 3, 4],
      missingIndex: 1,
      answer: 2,
    };
    expect(g.check(problem, '2' as unknown)).toBe(false);
    expect(g.check(problem, NaN)).toBe(false);
    expect(g.check(problem, null as unknown)).toBe(false);
    expect(g.check(problem, undefined as unknown)).toBe(false);
    expect(g.check(problem, { value: 2 } as unknown)).toBe(false);
    expect(g.check(problem, 2.5)).toBe(false); // non-integer
  });
});
