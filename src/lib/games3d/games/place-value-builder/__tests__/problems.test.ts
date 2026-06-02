import { describe, it, expect } from 'vitest';
import {
  createPlaceValueGenerator,
  normalize,
  valueOf,
  MIN_TARGET,
  MAX_TARGET,
  MAX_PER_PLACE,
  type PlaceCounts,
} from '../problems';

describe('place-value-builder generator', () => {
  it('default targets stay within [MIN_TARGET, MAX_TARGET] and are never degenerate (≥ 2 digits)', () => {
    const g = createPlaceValueGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.target).toBeGreaterThanOrEqual(10); // at least two digits
    }
  });

  it('a difficulty-scoped range (grade 2: tens+ones, ≤ 99) is honored', () => {
    const g = createPlaceValueGenerator(MIN_TARGET, 99);
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(99);
    }
  });

  it('clamps an out-of-bounds requested range to the valid window', () => {
    const g = createPlaceValueGenerator(-100, 100000);
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
    }
  });

  it('check() is true ONLY when the built counts compose to exactly the target', () => {
    const g = createPlaceValueGenerator();
    // 234 = 2 hundreds, 3 tens, 4 ones
    expect(g.check({ target: 234 }, { hundreds: 2, tens: 3, ones: 4 })).toBe(true);
    // an un-normalized but equal composition still counts (23 tens + 4 = 234)
    expect(g.check({ target: 234 }, { hundreds: 0, tens: 23, ones: 4 })).toBe(true);
    // off-by-one in each place fails
    expect(g.check({ target: 234 }, { hundreds: 2, tens: 3, ones: 5 })).toBe(false);
    expect(g.check({ target: 234 }, { hundreds: 2, tens: 4, ones: 4 })).toBe(false);
    expect(g.check({ target: 234 }, { hundreds: 3, tens: 3, ones: 4 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null and malformed objects', () => {
    const g = createPlaceValueGenerator();
    expect(g.check({ target: 42 }, 42)).toBe(false);
    expect(g.check({ target: 42 }, null)).toBe(false);
    expect(g.check({ target: 42 }, undefined)).toBe(false);
    expect(g.check({ target: 42 }, 'forty-two')).toBe(false);
    expect(g.check({ target: 42 }, { hundreds: 0, tens: 4 })).toBe(false); // missing ones
    expect(g.check({ target: 42 }, { hundreds: NaN, tens: 4, ones: 2 })).toBe(false);
    expect(g.check({ target: 42 }, { hundreds: 0, tens: Infinity, ones: 2 })).toBe(false);
  });
});

describe('valueOf', () => {
  it('computes 100·H + 10·T + 1·O', () => {
    expect(valueOf({ hundreds: 0, tens: 0, ones: 0 })).toBe(0);
    expect(valueOf({ hundreds: 2, tens: 3, ones: 4 })).toBe(234);
    expect(valueOf({ hundreds: 0, tens: 12, ones: 0 })).toBe(120);
    expect(valueOf({ hundreds: 9, tens: 9, ones: 9 })).toBe(999);
  });
});

describe('normalize (carry / regroup)', () => {
  it('bundling ten ones into a ten preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 0, ones: 10 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 0, tens: 1, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('bundling ten tens into a hundred preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 10, ones: 0 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 1, tens: 0, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('cascading carry (ones overflow pushes a tens overflow) preserves value', () => {
    // 9 hundreds? no — start with ones=9+something that cascades:
    const before: PlaceCounts = { hundreds: 1, tens: 9, ones: 10 };
    // ones 10 → tens +1 (=10) → hundreds +1 (=2), tens 0, ones 0 → 200
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 2, tens: 0, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before)); // 100+90+10 == 200
  });

  it('every place ends up in 0..9 AND the total value is preserved (pure carry, no overflow cap)', () => {
    for (let i = 0; i < 200; i++) {
      // Constrain inputs so valueOf(before) ≤ 999 → the hundreds Math.min cap is
      // never triggered, so the carry is PURE (regrouping must not change value).
      // hundreds 0..8 exercises carry into hundreds without risking the cap.
      const before: PlaceCounts = {
        hundreds: Math.floor(Math.random() * 9), // 0..8
        tens: Math.floor(Math.random() * 19), // 0..18 — drives tens→hundreds carry
        ones: Math.floor(Math.random() * 19), // 0..18 — drives ones→tens carry
      };
      const after = normalize(before);
      // Pure carry invariant: regrouping ones→tens→hundreds never changes the total.
      expect(valueOf(after)).toBe(valueOf(before));
      expect(after.ones).toBeGreaterThanOrEqual(0);
      expect(after.ones).toBeLessThanOrEqual(MAX_PER_PLACE);
      expect(after.tens).toBeGreaterThanOrEqual(0);
      expect(after.tens).toBeLessThanOrEqual(MAX_PER_PLACE);
      expect(after.hundreds).toBeLessThanOrEqual(MAX_PER_PLACE);
    }
  });

  it('floors fractional / clamps negative inputs defensively', () => {
    expect(normalize({ hundreds: -3, tens: 0, ones: 0 })).toEqual({ hundreds: 0, tens: 0, ones: 0 });
    expect(normalize({ hundreds: 0, tens: 0, ones: 7.8 })).toEqual({ hundreds: 0, tens: 0, ones: 7 });
  });
});
