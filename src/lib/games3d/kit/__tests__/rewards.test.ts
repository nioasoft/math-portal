import { describe, it, expect } from 'vitest';
import { computeStars } from '../rewards';

describe('computeStars', () => {
  it('gives 3 stars for accuracy >= 0.9', () => {
    expect(computeStars(0.9)).toBe(3);
    expect(computeStars(1)).toBe(3);
  });

  it('gives 2 stars for accuracy in [0.6, 0.9)', () => {
    expect(computeStars(0.6)).toBe(2);
    expect(computeStars(0.75)).toBe(2);
    expect(computeStars(0.8999)).toBe(2);
  });

  it('gives 1 star for accuracy < 0.6', () => {
    expect(computeStars(0)).toBe(1);
    expect(computeStars(0.59)).toBe(1);
  });

  it('clamps to [1, 3]', () => {
    expect(computeStars(-5)).toBe(1);
    expect(computeStars(2)).toBe(3);
  });

  it('treats non-finite accuracy as 0 (1 star)', () => {
    expect(computeStars(NaN)).toBe(1);
    expect(computeStars(Infinity)).toBe(1); // non-finite → treated as 0
  });

  it('fastBonus adds a star but stays clamped to 3', () => {
    expect(computeStars(0.5, { fastBonus: true })).toBe(2);
    expect(computeStars(0.7, { fastBonus: true })).toBe(3);
    expect(computeStars(0.95, { fastBonus: true })).toBe(3);
  });
});
