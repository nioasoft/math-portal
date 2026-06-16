import * as THREE from 'three';
import type { CameraPresetsAPI } from '../types';

/**
 * Create camera preset utilities for common viewing angles and positions.
 */
export function createCameraPresets(camera: THREE.PerspectiveCamera): CameraPresetsAPI {
  return {
    orbit(target: THREE.Vector3, distance: number, opts?: { yaw?: number; pitch?: number }): void {
      const yaw = opts?.yaw ?? Math.PI / 4;
      const pitch = opts?.pitch ?? Math.PI / 6;
      camera.position.set(
        target.x + distance * Math.cos(pitch) * Math.sin(yaw),
        target.y + distance * Math.sin(pitch),
        target.z + distance * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(target);
    },

    topDown(target: THREE.Vector3, distance: number): void {
      camera.position.set(target.x, target.y + distance, target.z + 0.0001);
      camera.lookAt(target);
    },

    side(target: THREE.Vector3, distance: number): void {
      camera.position.set(target.x + distance, target.y, target.z);
      camera.lookAt(target);
    },

    locked(position: THREE.Vector3, lookAt: THREE.Vector3): void {
      camera.position.copy(position);
      camera.lookAt(lookAt);
    },
  };
}
