import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyClayLook } from '../scene';
import type { SceneContext } from '../../types';

/**
 * Smoke test only — applyClayLook touches CanvasTexture/WebGL paths that jsdom
 * can't fully run (2D canvas context is null here, which the code guards). We just
 * assert it constructs lights/ground on a real THREE.Scene, returns a dispose fn,
 * and that dispose() removes what it added without throwing.
 */
function stubCtx(): SceneContext {
  // Only `scene` is used by applyClayLook; the rest is structurally satisfied via cast.
  return { scene: new THREE.Scene() } as unknown as SceneContext;
}

describe('applyClayLook (smoke)', () => {
  it('returns a dispose function and adds lights + ground to the scene', () => {
    const ctx = stubCtx();
    const before = ctx.scene.children.length;
    const look = applyClayLook(ctx);
    expect(typeof look.dispose).toBe('function');
    // Hemisphere + directional + ground = 3 added objects.
    expect(ctx.scene.children.length).toBeGreaterThan(before);
    expect(ctx.scene.children.some((c) => c instanceof THREE.DirectionalLight)).toBe(true);
    expect(ctx.scene.children.some((c) => c instanceof THREE.HemisphereLight)).toBe(true);
  });

  it('dispose() removes everything it added and restores fog/background', () => {
    const ctx = stubCtx();
    const before = ctx.scene.children.length;
    const prevBg = ctx.scene.background;
    const look = applyClayLook(ctx);
    expect(() => look.dispose()).not.toThrow();
    expect(ctx.scene.children.length).toBe(before);
    expect(ctx.scene.background).toBe(prevBg);
    expect(ctx.scene.fog).toBeNull();
  });

  it('respects ground:false (no ground mesh added)', () => {
    const ctx = stubCtx();
    const look = applyClayLook(ctx, { ground: false });
    expect(ctx.scene.children.some((c) => c instanceof THREE.Mesh)).toBe(false);
    look.dispose();
  });
});
