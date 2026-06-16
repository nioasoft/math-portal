import * as THREE from 'three';
import type {
  InputAdapter,
  InputEventMap,
  PointerInfo,
  Unsubscribe,
} from '../types';

const TAP_MAX_MOVE_PX = 8;
const TAP_MAX_HOLD_MS = 200;

interface ActivePointer {
  id: number;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  isDragging: boolean;
}

export interface InputAdapterInstance extends InputAdapter {
  dispose(): void;
}

export function createInputAdapter(
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene
): InputAdapterInstance {
  type ListenerSet = {
    tap: Set<(p: PointerInfo) => void>;
    hover: Set<(p: PointerInfo) => void>;
    dragStart: Set<(p: PointerInfo) => void>;
    drag: Set<(p: PointerInfo) => void>;
    dragEnd: Set<(p: PointerInfo) => void>;
    pinch: Set<(d: number) => void>;
    rotate: Set<(d: number) => void>;
    key: Set<(k: string) => void>;
  };
  const listeners: ListenerSet = {
    tap: new Set(),
    hover: new Set(),
    dragStart: new Set(),
    drag: new Set(),
    dragEnd: new Set(),
    pinch: new Set(),
    rotate: new Set(),
    key: new Set(),
  };

  const active = new Map<number, ActivePointer>();
  const raycaster = new THREE.Raycaster();
  const ndcVec = new THREE.Vector2();

  function clientToNDC(
    clientX: number,
    clientY: number
  ): { ndc: { x: number; y: number }; px: { x: number; y: number } } {
    const rect = canvas.getBoundingClientRect();
    const px = { x: clientX - rect.left, y: clientY - rect.top };
    const ndc = {
      x: (px.x / rect.width) * 2 - 1,
      y: -(px.y / rect.height) * 2 + 1,
    };
    return { ndc, px };
  }

  function buildPointerInfo(clientX: number, clientY: number): PointerInfo {
    const { ndc, px } = clientToNDC(clientX, clientY);
    ndcVec.set(ndc.x, ndc.y);
    raycaster.setFromCamera(ndcVec, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    return {
      x: ndc.x,
      y: ndc.y,
      pixelX: px.x,
      pixelY: px.y,
      picked: intersects[0]?.object ?? null,
    };
  }

  function onPointerDown(ev: PointerEvent): void {
    ev.preventDefault?.();
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* progressive enhancement */ }
    active.set(ev.pointerId, {
      id: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startTime: performance.now(),
      lastX: ev.clientX,
      lastY: ev.clientY,
      isDragging: false,
    });
    // When the second finger arrives, seed the baseline distance/angle so the
    // very first pointermove can emit a delta immediately.
    if (active.size === 2) {
      const arr = Array.from(active.values());
      lastPinchDistance = Math.hypot(arr[0].lastX - arr[1].lastX, arr[0].lastY - arr[1].lastY);
      lastPinchAngle = Math.atan2(arr[1].lastY - arr[0].lastY, arr[1].lastX - arr[0].lastX);
    }
  }

  let lastPinchDistance: number | null = null;
  let lastPinchAngle: number | null = null;

  function activePair(): [ActivePointer, ActivePointer] | null {
    if (active.size !== 2) return null;
    const arr = Array.from(active.values());
    return [arr[0], arr[1]];
  }

  function pairDistance(p1: ActivePointer, p2: ActivePointer): number {
    return Math.hypot(p1.lastX - p2.lastX, p1.lastY - p2.lastY);
  }

  function pairAngle(p1: ActivePointer, p2: ActivePointer): number {
    return Math.atan2(p2.lastY - p1.lastY, p2.lastX - p1.lastX);
  }

  function onPointerMove(ev: PointerEvent): void {
    const ptr = active.get(ev.pointerId);
    if (!ptr) {
      // No active pointer — emit hover for desktop feedback
      if (listeners.hover.size > 0) {
        const info = buildPointerInfo(ev.clientX, ev.clientY);
        listeners.hover.forEach((h) => h(info));
      }
      return;
    }
    ptr.lastX = ev.clientX;
    ptr.lastY = ev.clientY;

    const pair = activePair();
    if (pair) {
      const [a, b] = pair;
      const dist = pairDistance(a, b);
      const ang = pairAngle(a, b);
      if (lastPinchDistance !== null) {
        const dDelta = dist - lastPinchDistance;
        if (Math.abs(dDelta) > 0.5) listeners.pinch.forEach((h) => h(dDelta));
      }
      if (lastPinchAngle !== null) {
        let aDelta = ang - lastPinchAngle;
        if (aDelta > Math.PI) aDelta -= 2 * Math.PI;
        if (aDelta < -Math.PI) aDelta += 2 * Math.PI;
        if (Math.abs(aDelta) > 0.005) listeners.rotate.forEach((h) => h(aDelta));
      }
      lastPinchDistance = dist;
      lastPinchAngle = ang;
      return;
    }

    // Single-pointer drag logic (preserved from Task 9)
    lastPinchDistance = null;
    lastPinchAngle = null;
    const dx = ev.clientX - ptr.startX;
    const dy = ev.clientY - ptr.startY;
    const distSq = dx * dx + dy * dy;
    if (!ptr.isDragging && distSq > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
      ptr.isDragging = true;
      const info = buildPointerInfo(ptr.startX, ptr.startY);
      listeners.dragStart.forEach((h) => h(info));
    }
    if (ptr.isDragging) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.drag.forEach((h) => h(info));
    }
  }

  function onPointerUp(ev: PointerEvent): void {
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* progressive enhancement */ }
    if (active.size <= 2) { lastPinchDistance = null; lastPinchAngle = null; }
    const ptr = active.get(ev.pointerId);
    if (!ptr) return;
    active.delete(ev.pointerId);
    const dx = ev.clientX - ptr.startX;
    const dy = ev.clientY - ptr.startY;
    const distSq = dx * dx + dy * dy;
    const heldMs = performance.now() - ptr.startTime;

    if (
      !ptr.isDragging &&
      distSq <= TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX &&
      heldMs <= TAP_MAX_HOLD_MS
    ) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.tap.forEach((h) => h(info));
    } else if (ptr.isDragging) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.dragEnd.forEach((h) => h(info));
    }
  }

  function onPointerCancel(ev: PointerEvent): void {
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* no capture */ }
    if (active.size <= 2) { lastPinchDistance = null; lastPinchAngle = null; }
    const ptr = active.get(ev.pointerId);
    if (ptr?.isDragging) {
      const info = buildPointerInfo(ptr.lastX, ptr.lastY);
      listeners.dragEnd.forEach((h) => h(info));
    }
    active.delete(ev.pointerId);
  }

  function onKey(ev: KeyboardEvent): void {
    listeners.key.forEach((h) => h(ev.key));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKey);

  return {
    on<K extends keyof InputEventMap>(
      event: K,
      handler: (payload: InputEventMap[K]) => void
    ): Unsubscribe {
      const set = listeners[event] as unknown as Set<typeof handler>;
      set.add(handler);
      return () => set.delete(handler);
    },
    pickAt(x: number, y: number): THREE.Intersection[] {
      ndcVec.set(x, y);
      raycaster.setFromCamera(ndcVec, camera);
      return raycaster.intersectObjects(scene.children, true);
    },
    dispose(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKey);
      Object.values(listeners).forEach((s) => s.clear());
      active.clear();
    },
  };
}
