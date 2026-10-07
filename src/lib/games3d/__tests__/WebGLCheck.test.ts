import { describe, it, expect, vi } from 'vitest';

// `hasWebGL` memoizes its probe, so every test needs a fresh module instance.
async function loadCheck() {
  vi.resetModules();
  return import('../engine/WebGLCheck');
}

describe('WebGLCheck', () => {
  it('returns false in jsdom (no WebGL)', async () => {
    const { hasWebGL } = await loadCheck();
    expect(hasWebGL()).toBe(false);
  });

  it('returns null context in jsdom', async () => {
    const { getWebGLContext } = await loadCheck();
    expect(getWebGLContext()).toBeNull();
  });

  it('returns true when canvas getContext returns a webgl context', async () => {
    const { hasWebGL } = await loadCheck();
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

  it('probes once so repeated calls cannot exhaust the browser GL context cap', async () => {
    const { hasWebGL } = await loadCheck();
    hasWebGL();
    const create = vi.spyOn(document, 'createElement');
    hasWebGL();
    hasWebGL();
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });
});
