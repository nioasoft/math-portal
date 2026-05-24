import * as THREE from 'three';
import type { LightingPresetsAPI } from '../types';

/**
 * Create lighting preset utilities for common scene lighting setups.
 */
export function createLightingPresets(): LightingPresetsAPI {
  return {
    daylight(scene: THREE.Scene): void {
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(5, 10, 7);
      scene.add(ambient, directional);
    },

    soft(scene: THREE.Scene): void {
      const hemi = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.7);
      scene.add(hemi);
    },

    dramatic(scene: THREE.Scene): void {
      const ambient = new THREE.AmbientLight(0x404040, 0.3);
      const spot = new THREE.SpotLight(0xffffff, 1.2, 50, Math.PI / 6, 0.3);
      spot.position.set(0, 10, 5);
      scene.add(ambient, spot);
    },
  };
}
