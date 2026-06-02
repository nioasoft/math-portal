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
} as const;
