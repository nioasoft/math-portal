import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGame3DBestScore,
  setGame3DBestScore,
  getMutePreference,
  setMutePreference,
} from '../storage';

describe('storage 3D extensions', () => {
  beforeEach(() => localStorage.clear());

  it('returns 0 for unknown game best score', () => {
    expect(getGame3DBestScore('any-id')).toBe(0);
  });

  it('round-trips best score', () => {
    setGame3DBestScore('canary', 42);
    expect(getGame3DBestScore('canary')).toBe(42);
  });

  it('isolates best scores by game id', () => {
    setGame3DBestScore('a', 10);
    setGame3DBestScore('b', 20);
    expect(getGame3DBestScore('a')).toBe(10);
    expect(getGame3DBestScore('b')).toBe(20);
  });

  it('returns false for mute preference by default', () => {
    expect(getMutePreference()).toBe(false);
  });

  it('round-trips mute preference', () => {
    setMutePreference(true);
    expect(getMutePreference()).toBe(true);
    setMutePreference(false);
    expect(getMutePreference()).toBe(false);
  });

  it('handles SSR-safe access when localStorage is undefined', () => {
    const original = globalThis.localStorage;
    // @ts-expect-error simulating SSR
    delete globalThis.localStorage;
    expect(() => getGame3DBestScore('x')).not.toThrow();
    expect(getGame3DBestScore('x')).toBe(0);
    expect(() => setGame3DBestScore('x', 1)).not.toThrow();
    expect(getMutePreference()).toBe(false);
    globalThis.localStorage = original;
  });
});
