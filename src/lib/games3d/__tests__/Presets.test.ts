import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCameraPresets } from '../engine/CameraPresets';
import { createLightingPresets } from '../engine/LightingPresets';

describe('CameraPresets', () => {
  it('orbit() positions camera at distance from target on a tilted angle', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const target = new THREE.Vector3(1, 2, 3);
    presets.orbit(target, 10);
    expect(camera.position.distanceTo(target)).toBeCloseTo(10, 3);
  });

  it('topDown() looks straight down', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const target = new THREE.Vector3(0, 0, 0);
    presets.topDown(target, 5);
    expect(camera.position.y).toBeCloseTo(5, 3);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    expect(forward.y).toBeCloseTo(-1, 1);
  });

  it('locked() sets exact position and lookAt', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const pos = new THREE.Vector3(1, 1, 1);
    const look = new THREE.Vector3(0, 0, 0);
    presets.locked(pos, look);
    expect(camera.position.equals(pos)).toBe(true);
  });
});

describe('LightingPresets', () => {
  it('daylight() adds at least one ambient and one directional light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.daylight(scene);
    const ambients = scene.children.filter((c) => c instanceof THREE.AmbientLight);
    const directionals = scene.children.filter((c) => c instanceof THREE.DirectionalLight);
    expect(ambients.length).toBeGreaterThanOrEqual(1);
    expect(directionals.length).toBeGreaterThanOrEqual(1);
  });

  it('soft() adds hemisphere light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.soft(scene);
    const hemi = scene.children.find((c) => c instanceof THREE.HemisphereLight);
    expect(hemi).toBeDefined();
  });

  it('dramatic() adds spot light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.dramatic(scene);
    const spot = scene.children.find((c) => c instanceof THREE.SpotLight);
    expect(spot).toBeDefined();
  });
});
