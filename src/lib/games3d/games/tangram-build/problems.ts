import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * Tangram is a SPATIAL composition game: fit 6 distinct coloured pieces into a
 * target figure made of 6 ghost outline slots. Each piece has a unique shape AND
 * colour, so there is EXACTLY ONE matching slot per piece (a bijection between
 * piece ids and slot ids — they share the same set of `shapeId`s). There is no
 * scalar to dial in, so the "problem" is constant: the fixed set of 6 shapes.
 * `check()` verifies that every slot holds the piece whose id equals the slot id.
 */

/** The six distinct tangram shapes — each id is unique and used as BOTH piece id and its matching slot id. */
export type ShapeId =
  | 'largeTriangle'
  | 'mediumTriangle'
  | 'smallTriangle'
  | 'square'
  | 'parallelogram'
  | 'trapezoid';

/** Stable ordered list of the six shape ids (used to build pieces + slots). */
export const SHAPE_IDS: readonly ShapeId[] = [
  'largeTriangle',
  'mediumTriangle',
  'smallTriangle',
  'square',
  'parallelogram',
  'trapezoid',
] as const;

/**
 * The single (constant) tangram problem. There is one figure to assemble; the
 * quiz reuses it for each round (the child must re-assemble it 10 times).
 */
export interface TangramProblem {
  /** Slot ids that must be filled — the full set of shape ids (a bijection target). */
  slotIds: readonly ShapeId[];
}

/**
 * The child's assignment: a map from slotId → the pieceId currently placed there.
 * A slot absent from the map (or mapped to null) is empty.
 */
export type Assignment = Partial<Record<ShapeId, ShapeId | null>>;

function isShapeId(v: unknown): v is ShapeId {
  return typeof v === 'string' && (SHAPE_IDS as readonly string[]).includes(v);
}

/**
 * Pure correctness check (unit-tested): the figure is complete IFF every slot in
 * `slotIds` holds the piece whose id EQUALS the slot id — i.e. each piece is in
 * its own matching outline. Rejects: any empty slot, any mismatched piece, any
 * non-shape value, and assignments that aren't a clean per-slot map.
 */
export function checkAssignment(slotIds: readonly ShapeId[], assignment: Assignment): boolean {
  if (assignment === null || typeof assignment !== 'object') return false;
  for (const slotId of slotIds) {
    const placed = assignment[slotId];
    if (!isShapeId(placed)) return false; // empty or non-shape
    if (placed !== slotId) return false; // wrong piece in this slot
  }
  return true;
}

export function createTangramGenerator(): ProblemGenerator<TangramProblem> {
  const problem: TangramProblem = { slotIds: SHAPE_IDS };
  return {
    next(): TangramProblem {
      // One fixed figure; return the same constant problem each round.
      return problem;
    },
    check(p: TangramProblem, answer: unknown): boolean {
      if (answer === null || typeof answer !== 'object') return false;
      return checkAssignment(p.slotIds, answer as Assignment);
    },
  };
}
