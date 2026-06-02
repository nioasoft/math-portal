import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/** The six 3D solid kinds the child sorts. */
export type SolidKind = 'sphere' | 'cylinder' | 'cone' | 'cube' | 'pyramid' | 'box';
/** The two bins: rolls (has a curved surface) vs flat (flat faces only). */
export type Bin = 'roll' | 'flat';

/** One solid in a problem: a stable id plus its kind. */
export interface Solid {
  /** Unique within the problem (used as the mesh's userData.solidId + assignment key). */
  id: string;
  kind: SolidKind;
}

export interface ShapeSortProblem {
  solids: Solid[];
}

/** A child's answer: solidId → the bin they dropped it into (absent = unassigned). */
export type Assignments = Record<string, Bin>;

/** How many solids each problem presents. */
export const SOLIDS_PER_PROBLEM = 5;

/** Kinds whose curved surface makes them ROLL. */
const ROLL_KINDS: readonly SolidKind[] = ['sphere', 'cylinder', 'cone'];
/** Kinds with flat faces only — they DON'T roll. */
const FLAT_KINDS: readonly SolidKind[] = ['cube', 'pyramid', 'box'];

/**
 * The single source of truth for the math: which bin a solid kind belongs in.
 * Rolls (curved surface): sphere, cylinder, cone. Flat (flat faces only): cube,
 * pyramid, box. Pure + total over SolidKind.
 */
export function binFor(kind: SolidKind): Bin {
  return ROLL_KINDS.includes(kind) ? 'roll' : 'flat';
}

function isBin(v: unknown): v is Bin {
  return v === 'roll' || v === 'flat';
}

function isAssignments(a: unknown): a is Assignments {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return false;
  return Object.values(a as Record<string, unknown>).every(isBin);
}

/**
 * STRICT check: correct ⟺ EVERY solid is assigned to a bin AND each solid's
 * assigned bin equals binFor(kind). Rejects any unassigned solid, any
 * mis-binned solid, extra/unknown keys, wrong types, and bad answer shapes.
 */
export function checkAssignment(solids: readonly Solid[], assignments: unknown): boolean {
  if (!isAssignments(assignments)) return false;
  // Every solid must be present and correctly binned.
  for (const solid of solids) {
    const assigned = assignments[solid.id];
    if (!isBin(assigned)) return false; // unassigned (or wrong type)
    if (assigned !== binFor(solid.kind)) return false; // mis-binned
  }
  // No stray keys for solids that don't exist in this problem.
  const ids = new Set(solids.map((s) => s.id));
  for (const key of Object.keys(assignments)) {
    if (!ids.has(key)) return false;
  }
  return true;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build a non-degenerate problem: SOLIDS_PER_PROBLEM solids with a guaranteed
 * MIX — at least one roll-kind and at least one flat-kind (never all-roll or
 * all-flat). Remaining solids are drawn from the full set.
 */
function makeProblem(): ShapeSortProblem {
  const kinds: SolidKind[] = [pick(ROLL_KINDS), pick(FLAT_KINDS)];
  const all: readonly SolidKind[] = [...ROLL_KINDS, ...FLAT_KINDS];
  while (kinds.length < SOLIDS_PER_PROBLEM) {
    kinds.push(pick(all));
  }
  // Shuffle so the guaranteed roll/flat aren't always first (Fisher–Yates).
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const solids: Solid[] = kinds.map((kind, i) => ({ id: `s${i}`, kind }));
  return { solids };
}

export function createShapeSortGenerator(): ProblemGenerator<ShapeSortProblem> {
  return {
    next(): ShapeSortProblem {
      return makeProblem();
    },
    check(problem: ShapeSortProblem, answer: unknown): boolean {
      return checkAssignment(problem.solids, answer);
    },
  };
}
