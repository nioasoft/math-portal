import { describe, it, expect, vi } from 'vitest';
import { hasWebGL, getWebGLContext } from '../engine/WebGLCheck';

describe('WebGLCheck', () => {
  it('returns false in jsdom (no WebGL)', () => {
    expect(hasWebGL()).toBe(false);
  });

  it('returns null context in jsdom', () => {
    expect(getWebGLContext()).toBeNull();
  });

  it('returns true when canvas getContext returns a webgl context', () => {
    const fakeCanvas = {
      getContext: vi.fn((type: string) =>
        type === 'webgl2' || type === 'webgl' ? { fake: true } : null
      ),
    } as unknown as HTMLCanvasElement;
    const originalCreate = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return fakeCanvas;
      return originalCreate.call(document, tag);
    });
    expect(hasWebGL()).toBe(true);
    vi.restoreAllMocks();
  });
});
