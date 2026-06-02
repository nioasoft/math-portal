import { describe, it, expect } from 'vitest';
import {
  createShapeSortGenerator,
  binFor,
  checkAssignment,
  SOLIDS_PER_PROBLEM,
  type Solid,
  type Assignments,
} from '../problems';

describe('binFor', () => {
  it('rolls: sphere, cylinder, cone → roll', () => {
    expect(binFor('sphere')).toBe('roll');
    expect(binFor('cylinder')).toBe('roll');
    expect(binFor('cone')).toBe('roll');
  });
  it('flat: cube, pyramid, box → flat', () => {
    expect(binFor('cube')).toBe('flat');
    expect(binFor('pyramid')).toBe('flat');
    expect(binFor('box')).toBe('flat');
  });
});

describe('checkAssignment', () => {
  const solids: Solid[] = [
    { id: 's0', kind: 'sphere' }, // roll
    { id: 's1', kind: 'cube' }, // flat
    { id: 's2', kind: 'cone' }, // roll
  ];

  it('all-correct → true', () => {
    const a: Assignments = { s0: 'roll', s1: 'flat', s2: 'roll' };
    expect(checkAssignment(solids, a)).toBe(true);
  });

  it('one wrong (mis-binned) → false', () => {
    const a: Assignments = { s0: 'roll', s1: 'roll', s2: 'roll' }; // cube in roll
    expect(checkAssignment(solids, a)).toBe(false);
  });

  it('one unassigned → false', () => {
    const a: Assignments = { s0: 'roll', s2: 'roll' }; // s1 missing
    expect(checkAssignment(solids, a)).toBe(false);
  });

  it('rejects extra/unknown keys', () => {
    const a = { s0: 'roll', s1: 'flat', s2: 'roll', sX: 'flat' };
    expect(checkAssignment(solids, a)).toBe(false);
  });

  it('rejects bad answer shapes / types', () => {
    expect(checkAssignment(solids, null)).toBe(false);
    expect(checkAssignment(solids, undefined)).toBe(false);
    expect(checkAssignment(solids, 42)).toBe(false);
    expect(checkAssignment(solids, [])).toBe(false);
    expect(checkAssignment(solids, { s0: 'roll', s1: 'flat', s2: 'spin' })).toBe(false); // bad bin value
    expect(checkAssignment(solids, { s0: 1, s1: 'flat', s2: 'roll' })).toBe(false); // wrong type
  });
});

describe('createShapeSortGenerator', () => {
  it('produces non-degenerate problems with a mix of both bins', () => {
    const g = createShapeSortGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect(p.solids).toHaveLength(SOLIDS_PER_PROBLEM);
      const bins = p.solids.map((s) => binFor(s.kind));
      expect(bins).toContain('roll');
      expect(bins).toContain('flat'); // never all-roll or all-flat
      // ids are unique
      expect(new Set(p.solids.map((s) => s.id)).size).toBe(p.solids.length);
    }
  });

  it('check() delegates to checkAssignment for the problem solids', () => {
    const g = createShapeSortGenerator();
    const p = g.next();
    const correct: Assignments = {};
    for (const s of p.solids) correct[s.id] = binFor(s.kind);
    expect(g.check(p, correct)).toBe(true);

    // Flip one to the wrong bin → false.
    const wrong: Assignments = { ...correct };
    const first = p.solids[0];
    wrong[first.id] = binFor(first.kind) === 'roll' ? 'flat' : 'roll';
    expect(g.check(p, wrong)).toBe(false);

    // Leave one unassigned → false.
    const partial: Assignments = { ...correct };
    delete partial[p.solids[0].id];
    expect(g.check(p, partial)).toBe(false);
  });
});
