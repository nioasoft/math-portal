import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  tweenGroup,
  setReducedMotion,
  clearAllTweens,
  popIn,
  punch,
  shake,
  float,
  tweenTo,
} from '../juice';

/** Run the shared group far enough into the future that every tween has ended. */
function settle(): void {
  tweenGroup.update(performance.now() + 60_000);
}

afterEach(() => {
  clearAllTweens();
  setReducedMotion(false);
});

describe('juice reduced-motion gate', () => {
  it('animates and registers tweens by default', () => {
    const obj = new THREE.Object3D();
    popIn(obj, { scale: 2 });
    expect(tweenGroup.getAll()).toHaveLength(1);
    settle();
    expect(obj.scale.x).toBe(2);
  });

  it('applies the end state of decorative tweens without animating', () => {
    setReducedMotion(true);

    const pop = new THREE.Object3D();
    popIn(pop, { scale: 2 });
    expect(pop.scale.x).toBe(2);

    const punched = new THREE.Object3D();
    punched.scale.setScalar(3);
    punch(punched);
    expect(punched.scale.x).toBe(3);

    const shaken = new THREE.Object3D();
    shaken.position.set(1, 2, 3);
    shake(shaken, 5);
    expect(shaken.position.toArray()).toEqual([1, 2, 3]);

    const floated = new THREE.Object3D();
    floated.position.y = 4;
    float(floated, 10);
    expect(floated.position.y).toBe(4);

    // Nothing was handed to the render loop, so nothing can leak past dispose().
    expect(tweenGroup.getAll()).toHaveLength(0);
  });

  it('returns a stoppable tween even when motion is skipped', () => {
    setReducedMotion(true);
    const obj = new THREE.Object3D();
    expect(() => popIn(obj).stop()).not.toThrow();
    expect(() => float(obj).stop()).not.toThrow();
  });

  it('still resolves functional tweens so onComplete chains keep working', () => {
    setReducedMotion(true);
    const values: number[] = [];
    let done = false;
    tweenTo(0, 10, 4000, (v) => values.push(v), { onComplete: () => { done = true; } });

    expect(tweenGroup.getAll()).toHaveLength(1);
    settle();
    expect(done).toBe(true);
    expect(values.at(-1)).toBe(10);
  });

  it('caps functional tween duration under reduced motion', () => {
    setReducedMotion(true);
    const seen: number[] = [];
    tweenTo(0, 1, 4000, (v) => seen.push(v));

    // A 4s tween would still be mid-flight 200ms in; the capped one has landed.
    tweenGroup.update(performance.now() + 200);
    expect(seen.at(-1)).toBe(1);
  });
});
