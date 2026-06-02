import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Geoboard Shapes — build a polygon on a 5×5 peg grid whose enclosed AREA equals
 * a target. The board has pegs at integer coords gx,gy ∈ 0..4 (spacing 1 unit),
 * so the max enclosable area is 4×4 = 16. Many shapes share one area, which is
 * exactly what the game teaches (area on a grid via square-counting / shoelace).
 */

/** A peg vertex by its integer grid coordinates (0..GRID_MAX on each axis). */
export interface PegVertex {
  gx: number;
  gy: number;
}

export interface GeoboardProblem {
  /** Target enclosed area in square units (an integer, ≥ 2). */
  targetArea: number;
}

/** 5×5 pegs → coords 0..4 → max enclosable area 4×4 = 16. */
export const GRID_SIZE = 5;
export const GRID_MAX = GRID_SIZE - 1; // 4
export const MAX_AREA = GRID_MAX * GRID_MAX; // 16

/**
 * Targets each REALIZABLE with vertices on the 5×5 pegs, non-degenerate (≥ 2):
 *  - 2  = right triangle legs 2,2  → ½·2·2                    (or 1×2 rectangle)
 *  - 3  = right triangle legs 2,3  → ½·2·3
 *  - 4  = 2×2 rectangle
 *  - 6  = 2×3 rectangle
 *  - 8  = 2×4 rectangle
 *  - 9  = 3×3 rectangle
 *  - 12 = 3×4 rectangle
 * All ≤ MAX_AREA (16) and each is shoelace-achievable on integer pegs.
 */
export const TARGET_AREAS = [2, 3, 4, 6, 8, 9, 12] as const;

function isPegVertexArray(a: unknown): a is PegVertex[] {
  if (!Array.isArray(a)) return false;
  return a.every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      Number.isInteger((v as PegVertex).gx) &&
      Number.isInteger((v as PegVertex).gy) &&
      (v as PegVertex).gx >= 0 &&
      (v as PegVertex).gx <= GRID_MAX &&
      (v as PegVertex).gy >= 0 &&
      (v as PegVertex).gy <= GRID_MAX
  );
}

/**
 * DOUBLED shoelace area of a polygon given its vertices in tap order (auto-closed
 * back to the first). Returns `|Σ (x_i·y_{i+1} − x_{i+1}·y_i)|` — i.e. 2×area, an
 * INTEGER for integer pegs (so comparisons are exact, no float epsilon needed).
 * Collinear / degenerate polygons return 0.
 */
export function doubledShoelaceArea(vertices: PegVertex[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    sum += a.gx * b.gy - b.gx * a.gy;
  }
  return Math.abs(sum);
}

/** Real (possibly half-integer) enclosed area from the vertices. */
export function shoelaceArea(vertices: PegVertex[]): number {
  return doubledShoelaceArea(vertices) / 2;
}

export function createGeoboardGenerator(): ProblemGenerator<GeoboardProblem> {
  return {
    next(): GeoboardProblem {
      const targetArea = TARGET_AREAS[Math.floor(Math.random() * TARGET_AREAS.length)];
      return { targetArea };
    },
    /**
     * Correct ⟺ ≥ 3 vertices AND the polygon's shoelace area EXACTLY equals the
     * target. Compares doubled (integer) areas to avoid float issues. A polygon
     * with the wrong area, fewer than 3 vertices, or zero area (collinear /
     * degenerate) is rejected. Off-grid / wrong-typed answers are rejected.
     */
    check(problem: GeoboardProblem, answer: unknown): boolean {
      if (!isPegVertexArray(answer)) return false;
      if (answer.length < 3) return false;
      const doubled = doubledShoelaceArea(answer);
      if (doubled === 0) return false; // degenerate / collinear
      return doubled === problem.targetArea * 2;
    },
  };
}
