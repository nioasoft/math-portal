import * as THREE from 'three';

/**
 * Compute a camera distance that fits `halfExtent` (in world units) into the
 * viewport at a 60° vertical FOV. Accounts for the real camera aspect so
 * content never clips on narrow screens or wastes space on wide ones.
 *
 * @param halfExtent  Half the content's binding dimension (width or height).
 * @param aspect      The camera's current aspect ratio (ctx.camera.aspect).
 * @param margin      Extra padding in world units (default 2).
 */
export function fitDistance(halfExtent: number, aspect: number, margin = 2): number {
  const fovRad = (60 * Math.PI) / 180;
  return halfExtent / (Math.tan(fovRad / 2) * Math.min(aspect, 2)) + margin;
}

/**
 * Recompute a locked-camera Z distance so `halfWidth` stays in frame.
 * Returns the camera position and lookAt ready for `ctx.presets.camera.locked()`.
 *
 * @param halfWidth   Half the content's width in world units.
 * @param lookY       Y position for camera and lookAt (content center).
 * @param aspect      The camera's current aspect ratio (ctx.camera.aspect).
 * @param margin      Extra padding in world units (default 3).
 */
export function lockedCameraFrame(
  halfWidth: number,
  lookY: number,
  aspect: number,
  margin = 3,
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const D = fitDistance(halfWidth, aspect, margin);
  return {
    position: new THREE.Vector3(0, lookY, D),
    lookAt: new THREE.Vector3(0, lookY, 0),
  };
}
