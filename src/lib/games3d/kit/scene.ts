import * as THREE from 'three';
import type { SceneContext, DisposableLook } from '../types';
import { PALETTE } from './palette';

export interface ClayLookOptions {
  /** Top gradient color of the sky background. Default warm pastel blue. */
  topColor?: string;
  /** Bottom gradient color of the sky background. Default warm cream. */
  bottomColor?: string;
  /** Add a ground plane (disable for top-down games). Default true. */
  ground?: boolean;
  /** Y position of the ground plane. Default 0. */
  groundY?: number;
  /** Half-extent (in world units) of the shadow camera frustum. Default 12. */
  shadowArea?: number;
  /** Add subtle fog matching the bottom background color. Default true. */
  fog?: boolean;
}

const DEFAULT_TOP = '#cfe8ff';
const DEFAULT_BOTTOM = '#fef6e4';

/**
 * Build a vertical-gradient CanvasTexture for the scene background.
 * SSR-safe: returns null when `document` is unavailable (e.g. server render).
 */
function makeGradientTexture(top: string, bottom: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  // getContext throws in jsdom (no 2D canvas backend); guard so the kit stays
  // usable in a test environment without spamming errors.
  let cx: CanvasRenderingContext2D | null;
  try {
    cx = canvas.getContext('2d');
  } catch {
    return null;
  }
  if (!cx) return null;
  const grad = cx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Give a scene the warm "clay/toy" look: pastel gradient sky, soft key light with
 * a single shadow-caster, a hemisphere fill, an optional matte ground plane and
 * light fog. Cheap by design — exactly one shadow-casting light.
 *
 * Returns `{ dispose() }`; the game MUST call it on teardown so nothing leaks
 * (lights/ground are removed from the scene, geometries/materials/textures
 * disposed, and the previous background restored).
 */
export function applyClayLook(ctx: SceneContext, opts?: ClayLookOptions): DisposableLook {
  const { scene } = ctx;
  const top = opts?.topColor ?? DEFAULT_TOP;
  const bottom = opts?.bottomColor ?? DEFAULT_BOTTOM;
  const wantGround = opts?.ground ?? true;
  const groundY = opts?.groundY ?? 0;
  const shadowArea = opts?.shadowArea ?? 12;
  const wantFog = opts?.fog ?? true;

  const created: THREE.Object3D[] = [];
  const disposables: Array<{ dispose(): void }> = [];

  // --- Background gradient ---
  const prevBackground = scene.background;
  const gradient = makeGradientTexture(top, bottom);
  if (gradient) {
    scene.background = gradient;
    disposables.push(gradient);
  }

  // --- Fog (matches the bottom of the sky so the horizon dissolves) ---
  const prevFog = scene.fog;
  if (wantFog) {
    scene.fog = new THREE.FogExp2(new THREE.Color(bottom).getHex(), 0.012);
  }

  // --- Lighting ---
  const hemi = new THREE.HemisphereLight(0xfff3e0, 0xd7ccc8, 0.9);
  scene.add(hemi);
  created.push(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const cam = key.shadow.camera as THREE.OrthographicCamera;
  cam.near = 0.5;
  cam.far = 50;
  cam.left = -shadowArea;
  cam.right = shadowArea;
  cam.top = shadowArea;
  cam.bottom = -shadowArea;
  cam.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  scene.add(key);
  created.push(key);
  if (key.shadow.map) disposables.push(key.shadow.map);

  // --- Ground ---
  if (wantGround) {
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = groundY;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    created.push(groundMesh);
    disposables.push(groundGeo, groundMat);
  }

  return {
    dispose() {
      created.forEach((obj) => scene.remove(obj));
      // Dispose the directional light's shadow map (allocated lazily on first render).
      if (key.shadow.map) key.shadow.map.dispose();
      key.dispose();
      hemi.dispose();
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          /* already disposed */
        }
      });
      scene.background = prevBackground;
      scene.fog = prevFog;
    },
  };
}
