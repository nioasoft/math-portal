/**
 * GameKit palette — playful, warm "clay/toy" colors as hex numbers ready for
 * Three.js materials (`new THREE.Color(PALETTE.coral)`).
 */
export const PALETTE = {
  coral: 0xff6b6b,
  sun: 0xffd93d,
  mint: 0x6bcb77,
  sky: 0x4d96ff,
  grape: 0x9b5de5,
  cream: 0xfff3e0,
  ground: 0xede0d4,
  blush: 0xff9a9e,
  ocean: 0x0077b6,
  lemon: 0xf7dc6f,
} as const;

export type PaletteKey = keyof typeof PALETTE;

/**
 * Ordered, visually-distinct subset for indexing per-item colors (e.g. the i-th
 * answer block). Cycle with `PALETTE_SERIES[i % PALETTE_SERIES.length]`.
 */
export const PALETTE_SERIES: readonly number[] = [
  PALETTE.coral,
  PALETTE.sun,
  PALETTE.mint,
  PALETTE.sky,
  PALETTE.grape,
  PALETTE.blush,
  PALETTE.ocean,
  PALETTE.lemon,
] as const;

/** Hex-string variants of the palette, for canvas/CSS contexts (gradients, confetti). */
export const PALETTE_HEX = {
  coral: '#ff6b6b',
  sun: '#ffd93d',
  mint: '#6bcb77',
  sky: '#4d96ff',
  grape: '#9b5de5',
  cream: '#fff3e0',
  ground: '#ede0d4',
  blush: '#ff9a9e',
  ocean: '#0077b6',
  lemon: '#f7dc6f',
} as const;

/** Semantic feedback colors shared across 2D and 3D games. */
export const FEEDBACK_COLORS = {
  correct: 0x6bcb77,
  wrong: 0xff6b6b,
  hint: 0xffd93d,
  neutral: 0x4d96ff,
} as const;

export const FEEDBACK_COLORS_HEX = {
  correct: '#6bcb77',
  wrong: '#ff6b6b',
  hint: '#ffd93d',
  neutral: '#4d96ff',
} as const;
