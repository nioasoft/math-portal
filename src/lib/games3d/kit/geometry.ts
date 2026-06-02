import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Toy-like rounded box. Wraps three's {@link RoundedBoxGeometry} so games get the
 * soft "clay" silhouette with one call. The caller owns disposal
 * (`geometry.dispose()`), exactly like a plain `BoxGeometry`.
 *
 * Falls back to a plain {@link THREE.BoxGeometry} if rounded-box construction
 * throws (e.g. degenerate dimensions), so a game never crashes on geometry.
 */
export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius = 0.12,
  segments = 3
): THREE.BufferGeometry {
  try {
    // Radius must be < half of the smallest dimension or RoundedBoxGeometry NaNs.
    const safeRadius = Math.min(radius, Math.min(width, height, depth) / 2 - 1e-3);
    if (safeRadius <= 0) return new THREE.BoxGeometry(width, height, depth);
    return new RoundedBoxGeometry(width, height, depth, segments, safeRadius);
  } catch {
    return new THREE.BoxGeometry(width, height, depth);
  }
}
