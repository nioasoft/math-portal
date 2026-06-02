import { describe, it, expect } from 'vitest';
import {
  createExplodingDotsGenerator,
  normalize,
  valueOf,
  MIN_TARGET,
  MAX_TARGET,
  MAX_PER_BOX,
  EXPLODE_AT,
  type BoxCounts,
} from '../problems';

describe('exploding-dots generator', () => {
  it('default targets stay within [MIN_TARGET, MAX_TARGET] and always need an explosion (≥ 10)', () => {
    const g = createExplodingDotsGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      // ≥ 10 ⇒ reaching it requires at least one ones→tens explosion.
      expect(p.target).toBeGreaterThanOrEqual(EXPLODE_AT);
    }
  });

  it('targets are spread across the range (so explosions matter, not always trivial)', () => {
    const g = createExplodingDotsGenerator();
    let sawBig = false; // a target ≥ 100 needs a cascading double explosion
    for (let i = 0; i < 500; i++) {
      if (g.next().target >= 100) sawBig = true;
    }
    expect(sawBig).toBe(true);
  });

  it('a scoped range (grade 2: tens+ones, ≤ 99) is honored', () => {
    const g = createExplodingDotsGenerator(MIN_TARGET, 99);
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(99);
    }
  });

  it('clamps an out-of-bounds requested range to the valid window', () => {
    const g = createExplodingDotsGenerator(-100, 100000);
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
    }
  });

  it('check() is true ONLY when the built boxes compose to exactly the target', () => {
    const g = createExplodingDotsGenerator();
    // 134 = 1 hundred, 3 tens, 4 ones
    expect(g.check({ target: 134 }, { hundreds: 1, tens: 3, ones: 4 })).toBe(true);
    // an un-exploded but equal composition still counts (13 tens + 4 = 134)
    expect(g.check({ target: 134 }, { hundreds: 0, tens: 13, ones: 4 })).toBe(true);
    // straight 134 ones (pre-explosion) is still value-equal
    expect(g.check({ target: 134 }, { hundreds: 0, tens: 0, ones: 134 })).toBe(true);
    // off-by-one in each box fails
    expect(g.check({ target: 134 }, { hundreds: 1, tens: 3, ones: 5 })).toBe(false);
    expect(g.check({ target: 134 }, { hundreds: 1, tens: 4, ones: 4 })).toBe(false);
    expect(g.check({ target: 134 }, { hundreds: 2, tens: 3, ones: 4 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null and malformed objects', () => {
    const g = createExplodingDotsGenerator();
    expect(g.check({ target: 42 }, 42)).toBe(false);
    expect(g.check({ target: 42 }, null)).toBe(false);
    expect(g.check({ target: 42 }, undefined)).toBe(false);
    expect(g.check({ target: 42 }, 'forty-two')).toBe(false);
    expect(g.check({ target: 42 }, { hundreds: 0, tens: 4 })).toBe(false); // missing ones
    expect(g.check({ target: 42 }, { hundreds: NaN, tens: 4, ones: 2 })).toBe(false);
    expect(g.check({ target: 42 }, { hundreds: 0, tens: Infinity, ones: 2 })).toBe(false);
    expect(g.check({ target: 42 }, [4, 2])).toBe(false);
  });
});

describe('valueOf', () => {
  it('computes 100·H + 10·T + 1·O', () => {
    expect(valueOf({ hundreds: 0, tens: 0, ones: 0 })).toBe(0);
    expect(valueOf({ hundreds: 1, tens: 3, ones: 4 })).toBe(134);
    expect(valueOf({ hundreds: 0, tens: 13, ones: 0 })).toBe(130);
    expect(valueOf({ hundreds: 1, tens: 9, ones: 9 })).toBe(199);
  });
});

describe('normalize (explosion / regroup is value-preserving)', () => {
  it('ten ones EXPLODE into one ten, preserving the total value', () => {
    const before: BoxCounts = { hundreds: 0, tens: 0, ones: 10 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 0, tens: 1, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('ten tens EXPLODE into one hundred, preserving the total value', () => {
    const before: BoxCounts = { hundreds: 0, tens: 10, ones: 0 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 1, tens: 0, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('cascading explosion (ones overflow triggers a tens overflow) preserves value', () => {
    // ones 10 → tens +1 (=10) → hundreds +1 (=1), tens 0, ones 0 → 100
    const before: BoxCounts = { hundreds: 0, tens: 9, ones: 10 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 1, tens: 0, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before)); // 0+90+10 == 100
  });

  it('every box settles in 0..9 AND the total value is preserved (pure explosion, no cap)', () => {
    for (let i = 0; i < 300; i++) {
      // Constrain inputs so valueOf(before) ≤ 999 → the hundreds Math.min cap is
      // never triggered, so the explosion cascade is PURE (must not change value).
      const before: BoxCounts = {
        hundreds: Math.floor(Math.random() * 9), // 0..8
        tens: Math.floor(Math.random() * 19), // 0..18 — drives tens→hundreds
        ones: Math.floor(Math.random() * 19), // 0..18 — drives ones→tens
      };
      const after = normalize(before);
      expect(valueOf(after)).toBe(valueOf(before));
      expect(after.ones).toBeGreaterThanOrEqual(0);
      expect(after.ones).toBeLessThanOrEqual(MAX_PER_BOX);
      expect(after.tens).toBeGreaterThanOrEqual(0);
      expect(after.tens).toBeLessThanOrEqual(MAX_PER_BOX);
      expect(after.hundreds).toBeLessThanOrEqual(MAX_PER_BOX);
    }
  });

  it('floors fractional / clamps negative inputs defensively', () => {
    expect(normalize({ hundreds: -3, tens: 0, ones: 0 })).toEqual({ hundreds: 0, tens: 0, ones: 0 });
    expect(normalize({ hundreds: 0, tens: 0, ones: 7.8 })).toEqual({ hundreds: 0, tens: 0, ones: 7 });
  });
});
