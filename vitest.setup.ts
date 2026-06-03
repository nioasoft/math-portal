// @testing-library/react (non-/pure entry) auto-registers afterEach(cleanup) when vitest globals are enabled.
import '@testing-library/jest-dom/vitest';

HTMLCanvasElement.prototype.getContext = function getContext(
  this: HTMLCanvasElement,
  contextId: string,
  options?: CanvasRenderingContext2DSettings
) {
  void options;

  if (contextId === '2d') {
    return {
      canvas: this,
      fillStyle: '',
      font: '',
      lineWidth: 1,
      strokeStyle: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      beginPath() {},
      clearRect() {},
      closePath() {},
      createLinearGradient() {
        return { addColorStop() {} };
      },
      fill() {},
      fillRect() {},
      fillText() {},
      lineTo() {},
      measureText(text: string) {
        return { width: text.length * 10 };
      },
      moveTo() {},
      quadraticCurveTo() {},
      rect() {},
      restore() {},
      rotate() {},
      save() {},
      stroke() {},
      strokeText() {},
      translate() {},
    } as unknown as CanvasRenderingContext2D;
  }

  if (contextId === 'webgl' || contextId === 'webgl2') return null;
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
