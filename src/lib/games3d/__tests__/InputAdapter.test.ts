import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createInputAdapter } from '../engine/InputAdapter';

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  Object.defineProperty(c, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
  });
  return c;
}

function pointerEvent(type: string, props: PointerEventInit & { pointerId?: number }): PointerEvent {
  return new PointerEvent(type, { bubbles: true, ...props });
}

beforeEach(() => {
  if (typeof (globalThis as any).PointerEvent === 'undefined') {
    (globalThis as any).PointerEvent = class extends Event {
      pointerId: number; clientX: number; clientY: number;
      constructor(type: string, init: any = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
      }
    };
  }
});

describe('InputAdapter — taps and drags', () => {
  it('fires tap on quick pointerdown+up with no movement', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const adapter = createInputAdapter(canvas, camera, scene);
    const onTap = vi.fn();
    adapter.on('tap', onTap);

    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 102, clientY: 101, pointerId: 1 }));
    expect(onTap).toHaveBeenCalledOnce();
    document.body.removeChild(canvas);
  });

  it('fires dragStart + drag + dragEnd on extended movement', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const adapter = createInputAdapter(canvas, camera, scene);
    const start = vi.fn();
    const drag = vi.fn();
    const end = vi.fn();
    adapter.on('dragStart', start);
    adapter.on('drag', drag);
    adapter.on('dragEnd', end);

    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointermove', { clientX: 150, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointermove', { clientX: 200, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 200, clientY: 100, pointerId: 1 }));

    expect(start).toHaveBeenCalledOnce();
    expect(drag).toHaveBeenCalled();
    expect(end).toHaveBeenCalledOnce();
    document.body.removeChild(canvas);
  });

  it('unsubscribe stops further events', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onTap = vi.fn();
    const off = adapter.on('tap', onTap);
    off();
    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 1 }));
    expect(onTap).not.toHaveBeenCalled();
    document.body.removeChild(canvas);
  });

  it('pickAt returns intersections for object in front of camera', () => {
    const canvas = makeCanvas();
    const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const scene = new THREE.Scene();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.add(cube);

    const adapter = createInputAdapter(canvas, camera, scene);
    const intersects = adapter.pickAt(0, 0);
    expect(intersects.length).toBeGreaterThan(0);
    expect(intersects[0].object).toBe(cube);
  });

  it('dispose removes event listeners', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onTap = vi.fn();
    adapter.on('tap', onTap);
    adapter.dispose();
    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 1 }));
    expect(onTap).not.toHaveBeenCalled();
    document.body.removeChild(canvas);
  });
});
