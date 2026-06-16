import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAudioManager } from '../engine/AudioManager';

class FakeAudioBuffer {}
class FakeBufferSource {
  buffer: FakeAudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  onended: (() => void) | null = null;
}
class FakeGain {
  gain = { value: 1, linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}
class FakeAudioContext {
  state: AudioContextState = 'suspended';
  destination = {};
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  decodeAudioData = vi.fn(async () => new FakeAudioBuffer());
  createBufferSource = vi.fn(() => new FakeBufferSource());
  createGain = vi.fn(() => new FakeGain());
  close = vi.fn(async () => {});
}

beforeEach(() => {
  localStorage.clear();
  (globalThis as any).AudioContext = FakeAudioContext;
  (globalThis as any).fetch = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
});

describe('AudioManager', () => {
  it('starts unmuted by default', () => {
    const m = createAudioManager();
    expect(m.isMuted()).toBe(false);
  });

  it('persists mute state to localStorage', () => {
    const m = createAudioManager();
    m.setMuted(true);
    expect(m.isMuted()).toBe(true);
    expect(localStorage.getItem('tirgul.games3d.muted')).toBe('1');

    const m2 = createAudioManager();
    expect(m2.isMuted()).toBe(true);
  });

  it('preloads a sound and plays it without throwing', async () => {
    const m = createAudioManager();
    await m.preload('custom', '/sounds/x.ogg');
    expect(() => m.play('custom', '/sounds/x.ogg')).not.toThrow();
  });

  it('play() on shared key does not throw before preload', () => {
    const m = createAudioManager();
    expect(() => m.play('success')).not.toThrow();
  });

  it('does not actually invoke audio when muted', async () => {
    const m = createAudioManager();
    await m.preload('click', '/x.ogg');
    m.setMuted(true);
    const ctx = (m as any)._debugContext() as FakeAudioContext;
    const before = ctx.createBufferSource.mock.calls.length;
    m.play('click', '/x.ogg');
    expect(ctx.createBufferSource.mock.calls.length).toBe(before);
  });

  it('attempts to resume context on play (iOS unlock)', async () => {
    const m = createAudioManager();
    await m.preload('click', '/x.ogg');
    const ctx = (m as any)._debugContext() as FakeAudioContext;
    m.play('click', '/x.ogg');
    expect(ctx.resume).toHaveBeenCalled();
  });
});
