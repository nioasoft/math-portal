import { describe, it, expect } from 'vitest';
import {
  createSubtractionGenerator,
  borrow,
  decrement,
  increment,
  valueOf,
  toPlaceCounts,
  higherPlace,
  requiresBorrow,
  MIN_MINUEND,
  MAX_MINUEND,
  MAX_PER_PLACE,
  type PlaceCounts,
} from '../problems';

describe('subtraction-bridge generator', () => {
  it('A in [MIN_MINUEND, MAX_MINUEND], B in [1, A], and A − B ≥ 0', () => {
    const g = createSubtractionGenerator();
    for (let i = 0; i < 1000; i++) {
      const p = g.next();
      expect(p.a).toBeGreaterThanOrEqual(MIN_MINUEND);
      expect(p.a).toBeLessThanOrEqual(MAX_MINUEND);
      expect(p.b).toBeGreaterThanOrEqual(1); // B ≥ 1 → display opens unsolved (A ≠ A − B)
      expect(p.b).toBeLessThanOrEqual(p.a);
      expect(p.a - p.b).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates a healthy MIX — some problems borrow, some do not (not all-one-kind)', () => {
    const g = createSubtractionGenerator();
    let borrowN = 0;
    let plain = 0;
    for (let i = 0; i < 1000; i++) {
      const p = g.next();
      if (requiresBorrow(p)) borrowN++;
      else plain++;
    }
    // A good fraction REQUIRE a borrow, and a good fraction do not.
    expect(borrowN).toBeGreaterThan(200);
    expect(plain).toBeGreaterThan(200);
  });

  it('requiresBorrow reflects a column being too small', () => {
    expect(requiresBorrow({ a: 52, b: 9 })).toBe(true); // ones: 9 > 2
    expect(requiresBorrow({ a: 58, b: 23 })).toBe(false); // 8≥3, 5≥2
    expect(requiresBorrow({ a: 123, b: 80 })).toBe(true); // tens: 8 > 2
    expect(requiresBorrow({ a: 99, b: 11 })).toBe(false);
  });

  it('check() is true ONLY when the built counts compose to exactly A − B', () => {
    const g = createSubtractionGenerator();
    // 52 − 9 = 43 → 4 tens, 3 ones
    expect(g.check({ a: 52, b: 9 }, { hundreds: 0, tens: 4, ones: 3 })).toBe(true);
    // an un-normalized but equal composition still counts (43 ones == 43)
    expect(g.check({ a: 52, b: 9 }, { hundreds: 0, tens: 0, ones: 43 })).toBe(true);
    // 123 − 80 = 43
    expect(g.check({ a: 123, b: 80 }, { hundreds: 0, tens: 4, ones: 3 })).toBe(true);
    // off-by-one in each place fails
    expect(g.check({ a: 52, b: 9 }, { hundreds: 0, tens: 4, ones: 4 })).toBe(false);
    expect(g.check({ a: 52, b: 9 }, { hundreds: 0, tens: 3, ones: 3 })).toBe(false);
    expect(g.check({ a: 52, b: 9 }, { hundreds: 1, tens: 4, ones: 3 })).toBe(false);
  });

  it('check() rejects wrong types, NaN, null and malformed objects', () => {
    const g = createSubtractionGenerator();
    expect(g.check({ a: 50, b: 8 }, 42)).toBe(false);
    expect(g.check({ a: 50, b: 8 }, null)).toBe(false);
    expect(g.check({ a: 50, b: 8 }, undefined)).toBe(false);
    expect(g.check({ a: 50, b: 8 }, 'forty-two')).toBe(false);
    expect(g.check({ a: 50, b: 8 }, { hundreds: 0, tens: 4 })).toBe(false); // missing ones
    expect(g.check({ a: 50, b: 8 }, { hundreds: NaN, tens: 4, ones: 2 })).toBe(false);
    expect(g.check({ a: 50, b: 8 }, { hundreds: 0, tens: Infinity, ones: 2 })).toBe(false);
    expect(g.check({ a: 50, b: 8 }, { hundreds: 0, tens: 4, ones: 2.5 })).toBe(false); // 42.5
  });

  it('a wrong answer is genuinely reachable (built value can differ from A − B)', () => {
    const g = createSubtractionGenerator();
    // child stops one short: 52 − 9 should be 43, but they built 44
    expect(g.check({ a: 52, b: 9 }, { hundreds: 0, tens: 4, ones: 4 })).toBe(false);
  });
});

describe('valueOf / toPlaceCounts', () => {
  it('valueOf computes 100·H + 10·T + 1·O', () => {
    expect(valueOf({ hundreds: 0, tens: 0, ones: 0 })).toBe(0);
    expect(valueOf({ hundreds: 1, tens: 2, ones: 3 })).toBe(123);
    expect(valueOf({ hundreds: 0, tens: 4, ones: 3 })).toBe(43);
  });

  it('toPlaceCounts splits a number into base-ten places (round-trips through valueOf)', () => {
    expect(toPlaceCounts(0)).toEqual({ hundreds: 0, tens: 0, ones: 0 });
    expect(toPlaceCounts(199)).toEqual({ hundreds: 1, tens: 9, ones: 9 });
    expect(toPlaceCounts(52)).toEqual({ hundreds: 0, tens: 5, ones: 2 });
    for (let n = 0; n <= 199; n++) {
      expect(valueOf(toPlaceCounts(n))).toBe(n);
    }
  });

  it('higherPlace walks the borrow chain upward', () => {
    expect(higherPlace('ones')).toBe('tens');
    expect(higherPlace('tens')).toBe('hundreds');
    expect(higherPlace('hundreds')).toBe(null);
  });
});

describe('borrow (bridge stone breaks) — value preserving REGROUP', () => {
  it('breaking a ten into the ones column preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 5, ones: 0 };
    const after = borrow(before, 'ones');
    expect(after).toEqual({ hundreds: 0, tens: 4, ones: 10 });
    expect(valueOf(after)).toBe(valueOf(before)); // 50 == 50
  });

  it('breaking a hundred into the tens column preserves the total value', () => {
    const before: PlaceCounts = { hundreds: 1, tens: 0, ones: 7 };
    const after = borrow(before, 'tens');
    expect(after).toEqual({ hundreds: 0, tens: 10, ones: 7 });
    expect(valueOf(after)).toBe(valueOf(before)); // 107 == 107
  });

  it('cascades when the immediate higher place is also empty (100 → tens → ones)', () => {
    const before: PlaceCounts = { hundreds: 1, tens: 0, ones: 0 };
    const after = borrow(before, 'ones');
    // 100 → break a hundred into tens (0→10) → break a ten into ones (10) leaving 9 tens
    expect(after).toEqual({ hundreds: 0, tens: 9, ones: 10 });
    expect(valueOf(after)).toBe(valueOf(before)); // 100 == 100
  });

  it('does nothing when there is nothing above to break', () => {
    expect(borrow({ hundreds: 0, tens: 0, ones: 0 }, 'ones')).toEqual({ hundreds: 0, tens: 0, ones: 0 });
    expect(borrow({ hundreds: 0, tens: 0, ones: 5 }, 'hundreds')).toEqual({ hundreds: 0, tens: 0, ones: 5 });
  });

  it('does not borrow into a non-empty place', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 5, ones: 3 };
    expect(borrow(before, 'ones')).toEqual(before);
  });
});

describe('decrement — the borrow-decrement is exactly −1 to the value', () => {
  it('plain decrement on a non-empty place', () => {
    expect(decrement({ hundreds: 0, tens: 4, ones: 3 }, 'ones')).toEqual({ hundreds: 0, tens: 4, ones: 2 });
  });

  it('borrow-decrement: {tens:5,ones:0} −1 on ones → {tens:4,ones:9} (50 → 49)', () => {
    const before: PlaceCounts = { hundreds: 0, tens: 5, ones: 0 };
    const after = decrement(before, 'ones');
    expect(after).toEqual({ hundreds: 0, tens: 4, ones: 9 });
    expect(valueOf(after)).toBe(valueOf(before) - 1); // 50 → 49
  });

  it('borrow-decrement across hundreds: {hundreds:1,tens:0,ones:0} −1 on ones → 99', () => {
    const before: PlaceCounts = { hundreds: 1, tens: 0, ones: 0 };
    const after = decrement(before, 'ones');
    expect(after).toEqual({ hundreds: 0, tens: 9, ones: 9 });
    expect(valueOf(after)).toBe(99);
  });

  it('every decrement (plain or borrow) drops the total value by exactly 1, down to 0', () => {
    let counts = toPlaceCounts(199);
    let value = 199;
    while (value > 0) {
      counts = decrement(counts, 'ones');
      value -= 1;
      expect(valueOf(counts)).toBe(value);
    }
    // at 0 there is nothing left to remove → no-op, never negative
    expect(decrement(counts, 'ones')).toEqual(counts);
    expect(valueOf(counts)).toBe(0);
  });
});

describe('increment — local undo, clamps at 9, no carry', () => {
  it('adds one back on a place', () => {
    expect(increment({ hundreds: 0, tens: 4, ones: 2 }, 'ones')).toEqual({ hundreds: 0, tens: 4, ones: 3 });
  });

  it('clamps at MAX_PER_PLACE with no carry into the next place', () => {
    const at9: PlaceCounts = { hundreds: 0, tens: 0, ones: MAX_PER_PLACE };
    expect(increment(at9, 'ones')).toEqual(at9); // stays 9, tens untouched
  });
});
