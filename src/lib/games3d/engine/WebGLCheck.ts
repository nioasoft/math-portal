export function getWebGLContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const gl =
    (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl') as WebGLRenderingContext | null);
  return gl;
}

export function hasWebGL(): boolean {
  return getWebGLContext() !== null;
}
