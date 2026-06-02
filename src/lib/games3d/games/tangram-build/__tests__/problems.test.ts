import { describe, it, expect } from 'vitest';
import {
  createTangramGenerator,
  checkAssignment,
  SHAPE_IDS,
  type Assignment,
  type ShapeId,
} from '../problems';

/** A fully-correct assignment: every slot holds its own matching piece. */
function correctAssignment(): Assignment {
  const a: Assignment = {};
  for (const id of SHAPE_IDS) a[id] = id;
  return a;
}

describe('tangram-build problems', () => {
  it('exposes exactly six distinct shape ids (a bijection target)', () => {
    expect(SHAPE_IDS).toHaveLength(6);
    expect(new Set(SHAPE_IDS).size).toBe(6);
  });

  it('generator returns the constant 6-slot figure and is solvable', () => {
    const g = createTangramGenerator();
    const p = g.next();
    expect([...p.slotIds].sort()).toEqual([...SHAPE_IDS].sort());
    expect(g.check(p, correctAssignment())).toBe(true);
  });

  it('checkAssignment: all pieces in their matching slots → true', () => {
    expect(checkAssignment(SHAPE_IDS, correctAssignment())).toBe(true);
  });

  it('checkAssignment: one swapped pair → false', () => {
    const a = correctAssignment();
    // Swap the square and the trapezoid (each now sits in the wrong slot).
    a.square = 'trapezoid';
    a.trapezoid = 'square';
    expect(checkAssignment(SHAPE_IDS, a)).toBe(false);
  });

  it('checkAssignment: one empty slot → false', () => {
    const a = correctAssignment();
    delete a.smallTriangle; // slot left empty
    expect(checkAssignment(SHAPE_IDS, a)).toBe(false);
    const b = correctAssignment();
    b.smallTriangle = null; // explicit empty
    expect(checkAssignment(SHAPE_IDS, b)).toBe(false);
  });

  it('checkAssignment: empty assignment (all in tray) → false', () => {
    expect(checkAssignment(SHAPE_IDS, {})).toBe(false);
  });

  it('checkAssignment rejects non-shape / wrong-type values', () => {
    const a = correctAssignment() as Record<string, unknown>;
    a.square = 'banana';
    expect(checkAssignment(SHAPE_IDS, a as Assignment)).toBe(false);
    const b = correctAssignment() as Record<string, unknown>;
    b.square = 42;
    expect(checkAssignment(SHAPE_IDS, b as Assignment)).toBe(false);
  });

  it('generator.check rejects non-object answers (null / number / string)', () => {
    const g = createTangramGenerator();
    const p = g.next();
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, 6)).toBe(false);
    expect(g.check(p, 'square')).toBe(false);
  });

  it('a single misplaced piece (others correct) → false (wrong genuinely possible)', () => {
    const a = correctAssignment();
    a.largeTriangle = 'mediumTriangle'; // put medium where large belongs
    expect(checkAssignment(SHAPE_IDS, a)).toBe(false);
  });

  it('piece ids and slot ids form the same set (each piece has one matching slot)', () => {
    const slotSet = new Set<ShapeId>(SHAPE_IDS);
    const pieceSet = new Set<ShapeId>(SHAPE_IDS);
    expect(slotSet).toEqual(pieceSet);
  });
});
