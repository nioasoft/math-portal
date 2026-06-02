import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * The set of solids whose flat NET folds up into a 3D shape. Chosen so the face
 * counts span ≥3 distinct values among {4,5,6}, so the child genuinely has to
 * count (not memorize one answer).
 */
export type SolidKind =
  | 'cube' // 6 faces
  | 'rectangularBox' // 6 faces
  | 'triangularPrism' // 5 faces
  | 'squarePyramid' // 5 faces
  | 'tetrahedron'; // 4 faces

export interface NetFoldProblem {
  solid: SolidKind;
  /** The number of faces of the solid — the value the child must enter. */
  faceCount: number;
}

/** Canonical face count per solid (single source of truth, also used by tests). */
export const FACE_COUNT: Record<SolidKind, number> = {
  cube: 6,
  rectangularBox: 6,
  triangularPrism: 5,
  squarePyramid: 5,
  tetrahedron: 4,
};

export const SOLID_KINDS: readonly SolidKind[] = [
  'cube',
  'rectangularBox',
  'triangularPrism',
  'squarePyramid',
  'tetrahedron',
];

/**
 * Strict integer guard for the entered face count. Rejects non-numbers, NaN,
 * Infinity, and non-integers (floats) so an off-by-anything or a malformed value
 * can never be accepted.
 */
function isStrictInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function createNetFoldGenerator(): ProblemGenerator<NetFoldProblem> {
  return {
    next(): NetFoldProblem {
      const solid = SOLID_KINDS[Math.floor(Math.random() * SOLID_KINDS.length)];
      return { solid, faceCount: FACE_COUNT[solid] };
    },
    check(problem: NetFoldProblem, answer: unknown): boolean {
      // Strict: the answer must be an integer EXACTLY equal to the face count.
      // Off-by-one, floats, NaN, null, objects, strings → all rejected.
      if (!isStrictInteger(answer)) return false;
      return answer === problem.faceCount;
    },
  };
}
