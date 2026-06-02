/**
 * Pure reward helpers — no DOM, no Three.js, unit-testable.
 */

export interface ComputeStarsOptions {
  /** Bump by one star (capped at 3) when the player was fast. */
  fastBonus?: boolean;
}

/**
 * Map an accuracy fraction (0..1) to a 1–3 star rating.
 *   accuracy ≥ 0.9 → 3 · ≥ 0.6 → 2 · else → 1.
 * `fastBonus` adds a star (still clamped to 3). Result always clamped to [1, 3].
 */
export function computeStars(accuracy: number, opts?: ComputeStarsOptions): number {
  const a = Number.isFinite(accuracy) ? accuracy : 0;
  let stars: number;
  if (a >= 0.9) stars = 3;
  else if (a >= 0.6) stars = 2;
  else stars = 1;
  if (opts?.fastBonus) stars += 1;
  return Math.max(1, Math.min(3, stars));
}
