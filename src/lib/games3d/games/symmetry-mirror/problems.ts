import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Symmetry / mirror-reflection game logic.
 *
 * The board is ROWS × COLS_PER_SIDE cells on EACH side of a central vertical
 * mirror line. A cell is identified by `{ r, c }` where `r` is the row (0 = top)
 * and `c` is the COLUMN MEASURED FROM THE MIRROR LINE (c = 0 is the column right
 * next to the line, c = COLS_PER_SIDE-1 is the outermost column). With this
 * "distance-from-the-line" convention a cell at column `c` on the LEFT reflects to
 * the SAME column `c` on the RIGHT — i.e. the mirror map on cells is the identity
 * on `(r, c)` and only the SIDE flips. `mirror()` below therefore takes the set of
 * filled LEFT cells and returns the set of target RIGHT cells with identical
 * `(r, c)` coordinates.
 */

export const ROWS = 5;
export const COLS_PER_SIDE = 4;

/** A single grid cell, column measured as distance from the central mirror line. */
export interface Cell {
  r: number;
  c: number;
}

export interface SymmetryProblem {
  /** Filled cells on the LEFT (given) side, encoded as "r,c" keys. */
  leftCells: string[];
}

/** Encode a cell as a stable string key for set membership. */
export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

/** True when (r, c) is inside one side of the board. */
export function inBounds(r: number, c: number): boolean {
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < ROWS && c >= 0 && c < COLS_PER_SIDE;
}

/**
 * Reflect a set of LEFT cells across the vertical mirror line, returning the set
 * of TARGET RIGHT cells. Because columns are measured from the line, the reflected
 * right cell has the SAME `(r, c)` — only the side flips. Returned as a Set of
 * "r,c" keys. Filters out-of-bounds defensively.
 */
export function mirror(leftCells: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const key of leftCells) {
    const [r, c] = key.split(',').map(Number);
    if (inBounds(r, c)) out.add(cellKey(r, c));
  }
  return out;
}

/** Set equality on string-key sets. */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((x) => typeof x === 'string');
}

/**
 * Grow a connected-ish blob of `size` cells on one side, starting from a random
 * seed and stepping to 4-neighbour cells. Guarantees `1 ≤ result.size`, never the
 * whole side, and (by construction) reasonably connected so it reads as a "wing".
 */
function growBlob(size: number, rng: () => number): Set<string> {
  const total = ROWS * COLS_PER_SIDE;
  const target = Math.max(1, Math.min(size, total - 1)); // never the whole side
  const filled = new Set<string>();
  const frontier: Cell[] = [];
  const seed = { r: Math.floor(rng() * ROWS), c: Math.floor(rng() * COLS_PER_SIDE) };
  filled.add(cellKey(seed.r, seed.c));
  frontier.push(seed);

  while (filled.size < target && frontier.length > 0) {
    const from = frontier[Math.floor(rng() * frontier.length)];
    const dirs: Cell[] = [
      { r: from.r - 1, c: from.c },
      { r: from.r + 1, c: from.c },
      { r: from.r, c: from.c - 1 },
      { r: from.r, c: from.c + 1 },
    ];
    const candidates = dirs.filter((d) => inBounds(d.r, d.c) && !filled.has(cellKey(d.r, d.c)));
    if (candidates.length === 0) {
      // Dead end: drop this frontier cell so we explore elsewhere.
      const idx = frontier.indexOf(from);
      frontier.splice(idx, 1);
      continue;
    }
    const next = candidates[Math.floor(rng() * candidates.length)];
    filled.add(cellKey(next.r, next.c));
    frontier.push(next);
  }
  return filled;
}

/**
 * Generator for the mirror game. Each problem is a random connected blob of 4–7
 * cells on the LEFT side (≥1, never the whole side). The TARGET right pattern is
 * `mirror(leftCells)`. `check()` is STRICT set equality between the filled right
 * cells and the target — no missing, no extra, never empty.
 */
export function createSymmetryGenerator(rng: () => number = Math.random): ProblemGenerator<SymmetryProblem> {
  return {
    next(): SymmetryProblem {
      const size = 4 + Math.floor(rng() * 4); // 4..7
      const left = growBlob(size, rng);
      return { leftCells: [...left] };
    },
    /**
     * `answer` is the array of "r,c" keys the child filled on the RIGHT side.
     * Correct ⟺ that set EXACTLY equals mirror(leftCells).
     */
    check(problem: SymmetryProblem, answer: unknown): boolean {
      if (!isStringArray(answer)) return false;
      const target = mirror(problem.leftCells);
      // Reject out-of-bounds / malformed keys in the answer (would never match anyway,
      // but be explicit and avoid accidental equality on a degenerate target).
      const filled = new Set<string>();
      for (const key of answer) {
        const [r, c] = key.split(',').map(Number);
        if (!inBounds(r, c)) return false;
        filled.add(cellKey(r, c));
      }
      if (filled.size === 0) return false;
      return setsEqual(filled, target);
    },
  };
}
