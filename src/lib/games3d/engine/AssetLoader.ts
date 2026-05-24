import * as THREE from 'three';
import type { AssetCache } from '../types';

export interface LoadOptions {
  onProgress?: (fraction: number) => void;
}

export interface AssetLoaderInstance {
  cache: AssetCache;
  loadTextures(manifest: Record<string, string>, opts?: LoadOptions): Promise<void>;
  loadModels(manifest: Record<string, string>, opts?: LoadOptions): Promise<void>;
  evict(): void;
}

export function createAssetLoader(): AssetLoaderInstance {
  const textures = new Map<string, THREE.Texture>();
  const models = new Map<string, THREE.Object3D>();
  const textureLoader = new THREE.TextureLoader();

  async function loadTextures(
    manifest: Record<string, string>,
    opts?: LoadOptions
  ): Promise<void> {
    const entries = Object.entries(manifest);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, url]) => {
        if (!textures.has(key)) {
          const tex = await textureLoader.loadAsync(url);
          textures.set(key, tex);
        }
        done++;
        opts?.onProgress?.(done / entries.length);
      })
    );
  }

  async function loadModels(
    manifest: Record<string, string>,
    opts?: LoadOptions
  ): Promise<void> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const entries = Object.entries(manifest);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, url]) => {
        if (!models.has(key)) {
          const gltf = await loader.loadAsync(url);
          models.set(key, gltf.scene);
        }
        done++;
        opts?.onProgress?.(done / entries.length);
      })
    );
  }

  function disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }

  function evict(): void {
    textures.forEach((t) => t.dispose());
    textures.clear();
    models.forEach((m) => disposeObject(m));
    models.clear();
  }

  const cache: AssetCache = {
    texture(key: string): THREE.Texture {
      const t = textures.get(key);
      if (!t) throw new Error(`Texture "${key}" not loaded`);
      return t;
    },
    model(key: string): THREE.Object3D {
      const m = models.get(key);
      if (!m) throw new Error(`Model "${key}" not loaded`);
      return m.clone();
    },
    has(key: string): boolean {
      return textures.has(key) || models.has(key);
    },
  };

  return { cache, loadTextures, loadModels, evict };
}
