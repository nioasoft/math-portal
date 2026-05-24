import * as THREE from 'three';
import type { CameraPresetsAPI } from '../types';

/**
 * Create camera preset utilities for common viewing angles and positions.
 */
export function createCameraPresets(camera: THREE.PerspectiveCamera): CameraPresetsAPI {
  return {
    orbit(target: THREE.Vector3, distance: number): void {
      const yaw = Math.PI / 4; // 45 degrees
      const pitch = Math.PI / 6; // 30 degrees
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

    locked(position: THREE.Vector3, lookAt: THREE.Vector3): void {
      camera.position.copy(position);
      camera.lookAt(lookAt);
    },
  };
}
