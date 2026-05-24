import { describe, it, expect, vi } from 'vitest';
import { createPerformanceMonitor } from '../engine/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('reports average fps after sampling window', () => {
    let now = 0;
    const m = createPerformanceMonitor({
      windowMs: 1000,
      lowThresholdFps: 30,
      getNow: () => now,
    });

    for (let i = 0; i < 60; i++) {
      now += 1000 / 60;
      m.tick();
    }
    const sample = m.sample();
    expect(sample.fps).toBeGreaterThan(50);
    expect(sample.fps).toBeLessThan(70);
  });

  it('triggers onLowFps after 3 consecutive low samples', () => {
    let now = 0;
    const onLow = vi.fn();
    const m = createPerformanceMonitor({
      windowMs: 1000,
      lowThresholdFps: 30,
      lowConsecutiveSamples: 3,
      onLowFps: onLow,
      getNow: () => now,
    });

    for (let w = 0; w < 3; w++) {
      for (let i = 0; i < 20; i++) {
        now += 1000 / 20;
        m.tick();
      }
      m.sample();
    }
    expect(onLow).toHaveBeenCalledOnce();
  });

  it('does not trigger onLowFps when fps is healthy', () => {
    let now = 0;
    const onLow = vi.fn();
    const m = createPerformanceMonitor({
      windowMs: 1000,
      lowThresholdFps: 30,
      onLowFps: onLow,
      getNow: () => now,
    });

    for (let w = 0; w < 5; w++) {
      for (let i = 0; i < 60; i++) {
        now += 1000 / 60;
        m.tick();
      }
      m.sample();
    }
    expect(onLow).not.toHaveBeenCalled();
  });
});
