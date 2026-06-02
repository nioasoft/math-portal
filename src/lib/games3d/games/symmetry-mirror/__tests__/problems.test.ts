import { describe, it, expect } from 'vitest';
import {
  createSymmetryGenerator,
  mirror,
  cellKey,
  inBounds,
  ROWS,
  COLS_PER_SIDE,
  type SymmetryProblem,
} from '../problems';

describe('symmetry-mirror mirror()', () => {
  it('maps left cells to right cells with identical (r,c) (distance-from-line convention)', () => {
    const left = [cellKey(0, 0), cellKey(2, 3), cellKey(4, 1)];
    const out = mirror(left);
    expect(out.has(cellKey(0, 0))).toBe(true);
    expect(out.has(cellKey(2, 3))).toBe(true);
    expect(out.has(cellKey(4, 1))).toBe(true);
    expect(out.size).toBe(3);
  });

  it('is an involution: mirror(mirror(x)) === x as a set', () => {
    const left = [cellKey(1, 0), cellKey(1, 2), cellKey(3, 3)];
    const once = mirror(left);
    const twice = mirror([...once]);
    expect([...twice].sort()).toEqual([...new Set(left)].sort());
  });

  it('drops out-of-bounds keys defensively', () => {
    const out = mirror([cellKey(0, 0), cellKey(-1, 0), cellKey(0, COLS_PER_SIDE), cellKey(ROWS, 0)]);
    expect(out.size).toBe(1);
    expect(out.has(cellKey(0, 0))).toBe(true);
  });
});

describe('symmetry-mirror inBounds()', () => {
  it('accepts in-range integer cells and rejects everything else', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(ROWS - 1, COLS_PER_SIDE - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, COLS_PER_SIDE)).toBe(false);
    expect(inBounds(ROWS, 0)).toBe(false);
    expect(inBounds(1.5, 0)).toBe(false);
  });
});

describe('symmetry-mirror check()', () => {
  const g = createSymmetryGenerator();
  const problem: SymmetryProblem = { leftCells: [cellKey(0, 0), cellKey(1, 0), cellKey(1, 1)] };
  const exactTarget = [cellKey(0, 0), cellKey(1, 0), cellKey(1, 1)];

  it('accepts the EXACT mirror set', () => {
    expect(g.check(problem, exactTarget)).toBe(true);
  });

  it('accepts the exact mirror regardless of order', () => {
    expect(g.check(problem, [cellKey(1, 1), cellKey(0, 0), cellKey(1, 0)])).toBe(true);
  });

  it('rejects a MISSING cell', () => {
    expect(g.check(problem, [cellKey(0, 0), cellKey(1, 0)])).toBe(false);
  });

  it('rejects an EXTRA cell', () => {
    expect(g.check(problem, [...exactTarget, cellKey(2, 2)])).toBe(false);
  });

  it('rejects EMPTY answer', () => {
    expect(g.check(problem, [])).toBe(false);
  });

  it('rejects wrong types / malformed', () => {
    expect(g.check(problem, 3)).toBe(false);
    expect(g.check(problem, null)).toBe(false);
    expect(g.check(problem, { a: 1 })).toBe(false);
    expect(g.check(problem, [1, 2, 3])).toBe(false);
    expect(g.check(problem, [cellKey(0, 0), 'bad'])).toBe(false);
    expect(g.check(problem, [...exactTarget, cellKey(-1, 0)])).toBe(false); // out-of-bounds extra
  });
});

describe('symmetry-mirror generator', () => {
  it('produces non-degenerate left patterns: ≥1 cell, never the whole side', () => {
    const g = createSymmetryGenerator();
    const max = ROWS * COLS_PER_SIDE;
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      const set = new Set(p.leftCells);
      expect(set.size).toBeGreaterThanOrEqual(1);
      expect(set.size).toBeLessThan(max);
      // every cell in bounds
      for (const key of set) {
        const [r, c] = key.split(',').map(Number);
        expect(inBounds(r, c)).toBe(true);
      }
    }
  });

  it('the exact mirror of a generated problem always checks correct (solvable)', () => {
    const g = createSymmetryGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      const target = [...mirror(p.leftCells)];
      expect(g.check(p, target)).toBe(true);
    }
  });

  it('an empty right side is never correct for a generated problem (never opens solved)', () => {
    const g = createSymmetryGenerator();
    for (let i = 0; i < 50; i++) {
      const p = g.next();
      expect(g.check(p, [])).toBe(false);
    }
  });
});
