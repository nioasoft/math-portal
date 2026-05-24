import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createAssetLoader } from '../engine/AssetLoader';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AssetLoader', () => {
  it('loads a texture and caches it', async () => {
    const fakeTex = new THREE.Texture();
    const loadSpy = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t/tile.png' });
    expect(loader.cache.texture('tile')).toBe(fakeTex);
    expect(loadSpy).toHaveBeenCalledOnce();
  });

  it('returns same instance on second load (cache hit)', async () => {
    const fakeTex = new THREE.Texture();
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t/tile.png' });
    await loader.loadTextures({ tile: '/t/tile.png' });
    expect(loader.cache.texture('tile')).toBe(fakeTex);
  });

  it('reports progress via onProgress callback', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const progress: number[] = [];
    const loader = createAssetLoader();
    await loader.loadTextures(
      { a: '/a.png', b: '/b.png', c: '/c.png' },
      { onProgress: (p) => progress.push(p) }
    );
    expect(progress.at(-1)).toBe(1);
    expect(progress.length).toBeGreaterThanOrEqual(3);
  });

  it('throws on missing key', () => {
    const loader = createAssetLoader();
    expect(() => loader.cache.texture('missing')).toThrow(/not loaded/);
  });

  it('evict() disposes loaded textures', async () => {
    const fakeTex = new THREE.Texture();
    fakeTex.dispose = vi.fn();
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t.png' });
    loader.evict();
    expect(fakeTex.dispose).toHaveBeenCalled();
    expect(loader.cache.has('tile')).toBe(false);
  });
});
