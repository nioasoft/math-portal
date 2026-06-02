import confetti from 'canvas-confetti';
import { PALETTE_HEX } from './palette';

const COLORS = [
  PALETTE_HEX.coral,
  PALETTE_HEX.sun,
  PALETTE_HEX.mint,
  PALETTE_HEX.sky,
  PALETTE_HEX.grape,
];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * A single tasteful burst — for a correct answer or a small win.
 * SSR-safe (no-op on the server).
 */
export function celebrate(): void {
  if (!isBrowser()) return;
  void confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 38,
    origin: { x: 0.5, y: 0.42 },
    colors: COLORS,
    disableForReducedMotion: true,
    scalar: 0.9,
  });
}

/**
 * A bigger, multi-burst celebration — for finishing a quiz / clearing a level.
 * SSR-safe (no-op on the server).
 */
export function bigCelebrate(): void {
  if (!isBrowser()) return;
  const fire = (particleCount: number, spread: number, originX: number, angle: number) => {
    void confetti({
      particleCount,
      spread,
      angle,
      startVelocity: 45,
      origin: { x: originX, y: 0.55 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
  };
  // Center burst + two side cannons firing inward.
  fire(120, 100, 0.5, 90);
  fire(70, 60, 0.15, 60);
  fire(70, 60, 0.85, 120);
}
