/**
 * GameKit — shared "juice + visual polish + reward" toolkit for the games3d engine.
 * Foundation only; individual games opt in by importing these helpers.
 */

// Color
export { PALETTE, PALETTE_SERIES, PALETTE_HEX, FEEDBACK_COLORS, FEEDBACK_COLORS_HEX } from './palette';
export type { PaletteKey } from './palette';

// Scene look
export { applyClayLook } from './scene';
export type { ClayLookOptions } from './scene';
export type { DisposableLook } from '../types';

// Geometry
export { roundedBox } from './geometry';

// Juice (tweens)
export { tweenGroup, popIn, punch, tweenTo, shake, clearAllTweens, spinTo, slideTo, float, popInGroup } from './juice';

// Confetti
export { celebrate, bigCelebrate } from './confetti';

// Rewards (pure)
export { computeStars } from './rewards';
export type { ComputeStarsOptions } from './rewards';
