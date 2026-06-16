import * as THREE from 'three';
import type { LightingPresetsAPI, DisposableLook } from '../types';

function trackAndDispose(scene: THREE.Scene, lights: THREE.Light[]): DisposableLook {
  lights.forEach((l) => scene.add(l));
  return {
    dispose() {
      lights.forEach((l) => {
        scene.remove(l);
        l.dispose();
      });
    },
  };
}

export function createLightingPresets(): LightingPresetsAPI {
  return {
    daylight(scene: THREE.Scene): DisposableLook {
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(5, 10, 7);
      return trackAndDispose(scene, [ambient, directional]);
    },

    soft(scene: THREE.Scene): DisposableLook {
      const hemi = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.7);
      return trackAndDispose(scene, [hemi]);
    },

    dramatic(scene: THREE.Scene): DisposableLook {
      const ambient = new THREE.AmbientLight(0x404040, 0.3);
      const spot = new THREE.SpotLight(0xffffff, 1.2, 50, Math.PI / 6, 0.3);
      spot.position.set(0, 10, 5);
      return trackAndDispose(scene, [ambient, spot]);
    },

    night(scene: THREE.Scene): DisposableLook {
      const ambient = new THREE.AmbientLight(0x1a1a3e, 0.15);
      const directional = new THREE.DirectionalLight(0x4466aa, 0.4);
      directional.position.set(3, 8, 5);
      return trackAndDispose(scene, [ambient, directional]);
    },
  };
}
