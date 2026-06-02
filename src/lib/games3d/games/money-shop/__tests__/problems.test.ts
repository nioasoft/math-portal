import { describe, it, expect } from 'vitest';
import {
  createMoneyShopGenerator,
  trayTotal,
  emptyTray,
  DENOMINATIONS,
  MIN_TARGET,
  MAX_TARGET,
  type TrayCounts,
} from '../problems';

describe('money-shop generator', () => {
  it('targets are whole numbers within the non-degenerate range', () => {
    const g = createMoneyShopGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      expect(Number.isInteger(p.target)).toBe(true);
      expect(p.target).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(p.target).toBeLessThanOrEqual(MAX_TARGET);
      expect(p.target).toBeGreaterThanOrEqual(1); // never degenerate (≥ 1)
    }
  });

  it('every target is reachable with the available denominations (₪1 exists)', () => {
    const g = createMoneyShopGenerator();
    for (let i = 0; i < 500; i++) {
      const { target } = g.next();
      // Reaching any target: target × ₪1 coins always works.
      const counts: TrayCounts = { ...emptyTray(), 1: target };
      expect(trayTotal(counts)).toBe(target);
    }
    expect(DENOMINATIONS).toContain(1);
  });

  it('trayTotal sums denomination × count', () => {
    const counts: TrayCounts = { 1: 3, 2: 0, 5: 1, 10: 2, 20: 0, 50: 1 };
    // 3×1 + 1×5 + 2×10 + 1×50 = 3 + 5 + 20 + 50 = 78
    expect(trayTotal(counts)).toBe(78);
    expect(trayTotal(emptyTray())).toBe(0);
  });

  it('check() is strict: correct iff total === target, any combination', () => {
    const g = createMoneyShopGenerator();
    // Exact via mixed denominations.
    expect(g.check({ target: 17 }, { counts: { 1: 0, 2: 1, 5: 1, 10: 1, 20: 0, 50: 0 }, total: 17 })).toBe(true);
    // Exact via a different combination (all ₪1).
    expect(g.check({ target: 17 }, { counts: { ...emptyTray(), 1: 17 }, total: 17 })).toBe(true);
    // Off-by-one rejected.
    expect(g.check({ target: 17 }, { counts: emptyTray(), total: 16 })).toBe(false);
    expect(g.check({ target: 17 }, { counts: emptyTray(), total: 18 })).toBe(false);
    // Empty tray ≠ target.
    expect(g.check({ target: 5 }, { counts: emptyTray(), total: 0 })).toBe(false);
  });

  it('check() rejects wrong types, NaN/null, and objects without numeric total', () => {
    const g = createMoneyShopGenerator();
    const p = { target: 10 };
    expect(g.check(p, 10)).toBe(false); // bare number, not the answer shape
    expect(g.check(p, null)).toBe(false);
    expect(g.check(p, undefined)).toBe(false);
    expect(g.check(p, {})).toBe(false);
    expect(g.check(p, { counts: emptyTray() })).toBe(false); // no total
    expect(g.check(p, { total: NaN })).toBe(false);
    expect(g.check(p, { total: '10' })).toBe(false);
    expect(g.check(p, { total: Infinity })).toBe(false);
    expect(g.check(p, [10])).toBe(false);
  });
});
