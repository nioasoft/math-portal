import * as THREE from 'three';
import { Tween, Group, Easing } from '@tweenjs/tween.js';

/**
 * Shared tween group driven by {@link SceneEngine}'s render loop. tween.js v25
 * removed the implicit global group, so every tween the kit creates is added to
 * this group explicitly and the engine calls `tweenGroup.update(now)` per frame.
 */
export const tweenGroup = new Group();

/**
 * Animate `obj.scale` from 0 → overshoot → its current target with a bouncy
 * Back ease. Returns the {@link Tween} so the caller can `.stop()` it (e.g. when
 * disposing the object) — never let a tween outlive its target.
 */
export function popIn(
  obj: THREE.Object3D,
  opts?: { delay?: number; scale?: number }
): Tween<{ s: number }> {
  const target = opts?.scale ?? obj.scale.x ?? 1;
  obj.scale.setScalar(0.001);
  const state = { s: 0.001 };
  const tween = new Tween(state)
    .to({ s: target }, 460)
    .delay(opts?.delay ?? 0)
    .easing(Easing.Back.Out)
    .onUpdate(() => obj.scale.setScalar(state.s))
    .onComplete(() => obj.scale.setScalar(target));
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Quick "juice" punch: scale up by `amount` then settle back. Good for a correct
 * answer or a tap acknowledgement.
 */
export function punch(obj: THREE.Object3D, amount = 0.18): Tween<{ s: number }> {
  const base = obj.scale.x || 1;
  const state = { s: base };
  const tween = new Tween(state)
    .to({ s: base * (1 + amount) }, 110)
    .easing(Easing.Back.Out)
    .onUpdate(() => obj.scale.setScalar(state.s))
    .chain(
      (() => {
        const settle = new Tween(state)
          .to({ s: base }, 180)
          .easing(Easing.Quadratic.Out)
          .onUpdate(() => obj.scale.setScalar(state.s));
        tweenGroup.add(settle);
        return settle;
      })()
    );
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Generic numeric-property lerp (water level, camera distance, opacity, …).
 * `onUpdate` receives the current value each frame.
 */
export function tweenTo(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  opts?: { easing?: (k: number) => number; delay?: number; onComplete?: () => void }
): Tween<{ v: number }> {
  const state = { v: from };
  const tween = new Tween(state)
    .to({ v: to }, durationMs)
    .delay(opts?.delay ?? 0)
    .easing(opts?.easing ?? Easing.Quadratic.InOut)
    .onUpdate(() => onUpdate(state.v))
    .onComplete(() => {
      onUpdate(to);
      opts?.onComplete?.();
    });
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Decaying position jitter for "wrong" feedback. Snaps back to the original
 * position on completion. Returns the driving {@link Tween}.
 */
export function shake(obj: THREE.Object3D, intensity = 0.1, ms = 250): Tween<{ t: number }> {
  const origin = obj.position.clone();
  const state = { t: 0 };
  const tween = new Tween(state)
    .to({ t: 1 }, ms)
    .easing(Easing.Linear.None)
    .onUpdate(() => {
      const decay = 1 - state.t;
      obj.position.set(
        origin.x + (Math.random() - 0.5) * 2 * intensity * decay,
        origin.y + (Math.random() - 0.5) * 2 * intensity * decay,
        origin.z
      );
    })
    .onComplete(() => obj.position.copy(origin))
    .onStop(() => obj.position.copy(origin));
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Stop + remove every tween from the shared group whose animated state targets a
 * given object. Because the kit tweens animate proxy state objects (not the
 * Object3D directly), this is best-effort: prefer keeping the returned Tween from
 * a helper and calling `.stop()` on dispose. Provided for convenience when a game
 * tears down and just wants all its in-flight tweens gone.
 *
 * NOTE: there is no reliable back-reference from a tween's proxy state to the
 * Object3D, so this stops ALL tweens in the group. Use deliberately (e.g. on full
 * scene teardown), and prefer per-object `.stop()` for surgical cleanup.
 */
export function clearAllTweens(): void {
  tweenGroup.getAll().forEach((tw) => tw.stop());
  tweenGroup.removeAll();
}

/**
 * Rotate an object around a given axis by `radians` over `ms` milliseconds.
 * Useful for clock hands, spinning tokens, etc.
 */
export function spinTo(
  obj: THREE.Object3D,
  axis: 'x' | 'y' | 'z',
  radians: number,
  ms: number,
  opts?: { easing?: (k: number) => number; delay?: number; onComplete?: () => void }
): Tween<{ angle: number }> {
  const from = obj.rotation[axis];
  const to = from + radians;
  const state = { angle: from };
  const tween = new Tween(state)
    .to({ angle: to }, ms)
    .delay(opts?.delay ?? 0)
    .easing(opts?.easing ?? Easing.Quadratic.InOut)
    .onUpdate(() => {
      obj.rotation[axis] = state.angle;
    })
    .onComplete(() => {
      obj.rotation[axis] = to;
      opts?.onComplete?.();
    });
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Slide an object's position to a target over `ms` milliseconds.
 */
export function slideTo(
  obj: THREE.Object3D,
  target: THREE.Vector3,
  ms: number,
  opts?: { easing?: (k: number) => number; delay?: number; onComplete?: () => void }
): Tween<{ x: number; y: number; z: number }> {
  const from = obj.position;
  const state = { x: from.x, y: from.y, z: from.z };
  const tween = new Tween(state)
    .to({ x: target.x, y: target.y, z: target.z }, ms)
    .delay(opts?.delay ?? 0)
    .easing(opts?.easing ?? Easing.Quadratic.InOut)
    .onUpdate(() => obj.position.set(state.x, state.y, state.z))
    .onComplete(() => {
      obj.position.copy(target);
      opts?.onComplete?.();
    });
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Infinite gentle bobbing on the Y-axis. Returns the tween — caller MUST
 * `.stop()` it on dispose to avoid leaking.
 */
export function float(
  obj: THREE.Object3D,
  amplitude = 0.15,
  periodMs = 2000
): Tween<{ offset: number }> {
  const baseY = obj.position.y;
  const state = { offset: 0 };
  const tween = new Tween(state)
    .to({ offset: amplitude }, periodMs / 2)
    .easing(Easing.Sinusoidal.InOut)
    .yoyo(true)
    .repeat(Infinity)
    .onUpdate(() => {
      obj.position.y = baseY + state.offset;
    });
  tweenGroup.add(tween);
  tween.start();
  return tween;
}

/**
 * Staggered `popIn` over an array of objects. Returns all tweens for cleanup.
 */
export function popInGroup(
  objects: THREE.Object3D[],
  opts?: { stagger?: number; scale?: number }
): Tween<{ s: number }>[] {
  const stagger = opts?.stagger ?? 80;
  return objects.map((obj, i) => popIn(obj, { delay: i * stagger, scale: opts?.scale }));
}
