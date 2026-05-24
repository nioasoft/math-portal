import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createSceneEngine } from '../engine/SceneEngine';
import type { Game3D } from '../types';

class FakeRenderer {
  domElement = document.createElement('canvas');
  setSize = vi.fn();
  setPixelRatio = vi.fn();
  render = vi.fn();
  dispose = vi.fn();
  getPixelRatio = vi.fn(() => 1);
}

function makeGame(): Game3D {
  return {
    meta: {
      id: 'test',
      i18nKey: 'test',
      topic: 'misc',
      difficulty: 1,
      gradeRange: [1, 6],
      estimatedSeconds: 30,
      supportedModes: ['practice'],
    },
    init() {
      return {
        onFrame: vi.fn(),
        dispose: vi.fn(),
      };
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  let rafId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  (globalThis as any).__rafCallbacks = callbacks;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafId++;
    callbacks.set(rafId, cb);
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function step(times = 1): void {
  for (let i = 0; i < times; i++) {
    const cbs = (globalThis as any).__rafCallbacks as Map<number, FrameRequestCallback>;
    const entries = Array.from(cbs.entries());
    cbs.clear();
    entries.forEach(([, cb]) => cb(performance.now()));
  }
}

describe('SceneEngine', () => {
  it('start() calls game.init() and begins rendering', async () => {
    const initSpy = vi.fn(makeGame().init);
    const game: Game3D = { ...makeGame(), init: initSpy };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en',
      isRTL: false,
    });
    await engine.start(game);
    expect(initSpy).toHaveBeenCalledOnce();
    step(2);
    const renderer = engine._debug().renderer as unknown as FakeRenderer;
    expect(renderer.render).toHaveBeenCalled();
  });

  it('onFrame is called each tick with positive dt', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    step(3);
    expect(onFrame).toHaveBeenCalled();
    const [dt] = onFrame.mock.calls[0];
    expect(dt).toBeGreaterThanOrEqual(0);
  });

  it('pause() stops onFrame calls', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    step(1);
    const before = onFrame.mock.calls.length;
    engine.pause();
    step(5);
    expect(onFrame.mock.calls.length).toBe(before);
  });

  it('resume() restarts onFrame calls', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    engine.pause();
    onFrame.mockClear();
    engine.resume();
    step(2);
    expect(onFrame).toHaveBeenCalled();
  });

  it('dispose() calls game.dispose and stops loop', async () => {
    const disposeSpy = vi.fn();
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: disposeSpy }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    engine.dispose();
    expect(disposeSpy).toHaveBeenCalledOnce();
    onFrame.mockClear();
    step(3);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it('completion callback fires when game calls ctx.complete', async () => {
    const onComplete = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: (ctx) => {
        setTimeout(() => ctx.complete({ totalPoints: 5, accuracy: 1, durationSec: 1 }), 0);
        return { dispose: vi.fn() };
      },
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
      onComplete,
    });
    await engine.start(game);
    vi.runAllTimers();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ totalPoints: 5 }));
  });
});
