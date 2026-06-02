import { describe, it, expect } from 'vitest';
import {
  createAdditionGenerator,
  normalize,
  valueOf,
  requiresCarry,
  MIN_ADDEND,
  MAX_ADDEND,
  MAX_SUM,
  MAX_PER_PLACE,
  type PlaceCounts,
} from '../problems';

describe('addition-mine generator', () => {
  it('addends stay in [MIN_ADDEND, MAX_ADDEND] and the sum never exceeds MAX_SUM', () => {
    const g = createAdditionGenerator();
    for (let i = 0; i < 1000; i++) {
      const p = g.next();
      expect(p.a).toBeGreaterThanOrEqual(MIN_ADDEND);
      expect(p.a).toBeLessThanOrEqual(MAX_ADDEND);
      expect(p.b).toBeGreaterThanOrEqual(MIN_ADDEND);
      expect(p.b).toBeLessThanOrEqual(MAX_ADDEND);
      expect(p.a + p.b).toBeLessThanOrEqual(MAX_SUM);
      // Non-degenerate: both addends are genuinely two-digit and positive.
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeGreaterThanOrEqual(10);
    }
  });

  it('generates a healthy MIX — some problems carry, some do not (not all-one-kind)', () => {
    const g = createAdditionGenerator();
    let carry = 0;
    let noCarry = 0;
    for (let i = 0; i < 1000; i++) {
      const p = g.next();
      if (requiresCarry(p)) carry++;
      else noCarry++;
    }
    // Both kinds appear in a meaningful fraction (varied, never degenerate).
    expect(carry).toBeGreaterThan(200);
    expect(noCarry).toBeGreaterThan(200);
  });

  it('requiresCarry reflects the ones-digit sum', () => {
    expect(requiresCarry({ a: 27, b: 35 })).toBe(true); // 7 + 5 = 12
    expect(requiresCarry({ a: 23, b: 41 })).toBe(false); // 3 + 1 = 4
    expect(requiresCarry({ a: 15, b: 25 })).toBe(true); // 5 + 5 = 10
  });

  it('check() is true ONLY when the built counts compose to exactly a + b', () => {
    const g = createAdditionGenerator();
    // 27 + 35 = 62 → 6 tens, 2 ones
    expect(g.check({ a: 27, b: 35 }, { hundreds: 0, tens: 6, ones: 2 })).toBe(true);
    // an un-normalized but equal composition still counts (62 ones == 62)
    expect(g.check({ a: 27, b: 35 }, { hundreds: 0, tens: 0, ones: 62 })).toBe(true);
    // 89 + 89 = 178 → spans into hundreds
    expect(g.check({ a: 89, b: 89 }, { hundreds: 1, tens: 7, ones: 8 })).toBe(true);
    // off-by-one in each place fails
    expect(g.check({ a: 27, b: 35 }, { hundreds: 0, tens: 6, ones: 3 })).toBe(false);
    expect(g.check({ a: 27, b: 35 }, { hundreds: 0, tens: 5, ones: 2 })).toBe(false);
    expect(g.check({ a: 27, b: 35 }, { hundreds: 1, tens: 6, ones: 2 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null and malformed objects', () => {
    const g = createAdditionGenerator();
    expect(g.check({ a: 20, b: 22 }, 42)).toBe(false);
    expect(g.check({ a: 20, b: 22 }, null)).toBe(false);
    expect(g.check({ a: 20, b: 22 }, undefined)).toBe(false);
    expect(g.check({ a: 20, b: 22 }, 'forty-two')).toBe(false);
    expect(g.check({ a: 20, b: 22 }, { hundreds: 0, tens: 4 })).toBe(false); // missing ones
    expect(g.check({ a: 20, b: 22 }, { hundreds: NaN, tens: 4, ones: 2 })).toBe(false);
    expect(g.check({ a: 20, b: 22 }, { hundreds: 0, tens: Infinity, ones: 2 })).toBe(false);
    expect(g.check({ a: 20, b: 22 }, { hundreds: 0, tens: 4, ones: 2.5 })).toBe(false); // would value to 42.5
  });
});

describe('valueOf', () => {
  it('computes 100·H + 10·T + 1·O', () => {
    expect(valueOf({ hundreds: 0, tens: 0, ones: 0 })).toBe(0);
    expect(valueOf({ hundreds: 1, tens: 7, ones: 8 })).toBe(178);
    expect(valueOf({ hundreds: 0, tens: 6, ones: 2 })).toBe(62);
  });
});

describe('normalize (carry cart / regroup) — value preserving', () => {
  it('bundling ten ones into a ten preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 5, ones: 12 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 0, tens: 6, ones: 2 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('bundling ten tens into a hundred preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 17, ones: 8 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 1, tens: 7, ones: 8 });
    expect(valueOf(after)).toBe(valueOf(before));
  });

  it('cascading carry (ones overflow pushes a tens overflow) preserves value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 9, ones: 10 };
    const after = normalize(before);
    expect(after).toEqual({ hundreds: 1, tens: 0, ones: 0 });
    expect(valueOf(after)).toBe(valueOf(before)); // 90 + 10 == 100
  });

  it('every place ends up in 0..9 AND the total value is preserved (pure carry)', () => {
    for (let i = 0; i < 300; i++) {
      // valueOf(before) kept ≤ 999 so the hundreds cap is never triggered → pure carry.
      const before: PlaceCounts = {
        hundreds: Math.floor(Math.random() * 9), // 0..8
        tens: Math.floor(Math.random() * 19), // 0..18
        ones: Math.floor(Math.random() * 19), // 0..18
      };
      const after = normalize(before);
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
