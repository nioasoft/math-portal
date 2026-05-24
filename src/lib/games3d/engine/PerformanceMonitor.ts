import type { PerformanceSample } from '../types';

export interface PerformanceMonitorOptions {
  windowMs?: number;
  lowThresholdFps?: number;
  lowConsecutiveSamples?: number;
  onLowFps?: () => void;
}

export interface PerformanceMonitorInstance {
  tick(): void;
  sample(): PerformanceSample;
  reset(): void;
}

export function createPerformanceMonitor(
  opts: PerformanceMonitorOptions = {}
): PerformanceMonitorInstance {
  const threshold = opts.lowThresholdFps ?? 30;
  const consecutiveNeeded = opts.lowConsecutiveSamples ?? 3;
  const onLow = opts.onLowFps;
  // windowMs is accepted for API compatibility; sample() reports based on
  // actual elapsed time so the engine controls cadence.
  void opts.windowMs;

  let frameCount = 0;
  let windowStart = performance.now();
  let consecutiveLow = 0;
  let lowFired = false;

  function tick(): void {
    frameCount++;
  }

  function sample(): PerformanceSample {
    const now = performance.now();
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
    windowStart = performance.now();
    consecutiveLow = 0;
    lowFired = false;
  }

  return { tick, sample, reset };
}
