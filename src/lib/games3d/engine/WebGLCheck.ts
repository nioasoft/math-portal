export function getWebGLContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const gl =
    (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl') as WebGLRenderingContext | null);
  return gl;
}

// Memoized: every probe allocates a canvas and a GL context, and browsers cap how
// many contexts can stay live. Support never changes during a session.
let probed: boolean | null = null;

export function hasWebGL(): boolean {
  probed ??= getWebGLContext() !== null;
  return probed;
}
