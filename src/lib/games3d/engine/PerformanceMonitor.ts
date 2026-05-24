import type { PerformanceSample } from '../types';

export interface PerformanceMonitorOptions {
  windowMs?: number;
  lowThresholdFps?: number;
  lowConsecutiveSamples?: number;
  onLowFps?: () => void;
  getNow?: () => number;
}

export interface PerformanceMonitorInstance {
  tick(): void;
  sample(): PerformanceSample;
  reset(): void;
}

export function createPerformanceMonitor(
  opts: PerformanceMonitorOptions = {}
): PerformanceMonitorInstance {
  const windowMs = opts.windowMs ?? 1000;
  const threshold = opts.lowThresholdFps ?? 30;
  const consecutiveNeeded = opts.lowConsecutiveSamples ?? 3;
  const onLow = opts.onLowFps;
  const getNow = opts.getNow ?? (() => performance.now());

  let frameCount = 0;
  let windowStart = getNow();
  let consecutiveLow = 0;
  let lowFired = false;

  function tick(): void {
    frameCount++;
  }

  function sample(): PerformanceSample {
    const now = getNow();
    const elapsed = now - windowStart;
    const fps = elapsed > 0 ? (frameCount / elapsed) * 1000 : 0;
    frameCount = 0;
    windowStart = now;

    if (fps < threshold) {
      consecutiveLow++;
      if (consecutiveLow >= consecutiveNeeded && !lowFired) {
        lowFired = true;
        onLow?.();
      }
    } else {
      consecutiveLow = 0;
    }
    return { fps, timestamp: now };
  }

  function reset(): void {
    frameCount = 0;
    windowStart = getNow();
    consecutiveLow = 0;
    lowFired = false;
  }

  return { tick, sample, reset };
}
