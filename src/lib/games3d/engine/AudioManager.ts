import type { AudioManager, SharedSfxKey } from '../types';
import { getMutePreference, setMutePreference, getAudioVolumePreference, setAudioVolumePreference } from '@/lib/game/storage';

const SHARED_URLS: Record<SharedSfxKey, string> = {
  success: '/games/_shared/audio/success.ogg',
  fail: '/games/_shared/audio/fail.ogg',
  click: '/games/_shared/audio/click.ogg',
  pop: '/games/_shared/audio/pop.ogg',
  whoosh: '/games/_shared/audio/whoosh.ogg',
  tick: '/games/_shared/audio/tick.ogg',
  levelUp: '/games/_shared/audio/levelUp.ogg',
  streak: '/games/_shared/audio/streak.ogg',
};

interface InternalManager extends AudioManager {
  _debugContext(): AudioContext | null;
}

type AudioContextCtor = typeof AudioContext;
interface WindowWithAudio extends Window {
  AudioContext?: AudioContextCtor;
  webkitAudioContext?: AudioContextCtor;
}

export function createAudioManager(): InternalManager {
  let context: AudioContext | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const inflight = new Map<string, Promise<void>>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let muted = getMutePreference();
  let volume = getAudioVolumePreference();
  let disposed = false;

  // BGM state
  let bgmSource: AudioBufferSourceNode | null = null;
  let bgmGain: GainNode | null = null;
  let bgmKey: string | null = null;

  // Master gain
  let masterGain: GainNode | null = null;

  function later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
  }

  function ensureContext(): AudioContext | null {
    if (disposed || typeof window === 'undefined') return null;
    const w = window as WindowWithAudio;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!context) {
      context = new Ctor();
      masterGain = context.createGain();
      masterGain.gain.value = muted ? 0 : volume;
      masterGain.connect(context.destination);
    }
    return context;
  }

  function getMasterGain(): GainNode | null {
    ensureContext();
    return masterGain;
  }

  async function loadBuffer(key: string, url: string): Promise<void> {
    if (buffers.has(key)) return;
    const existing = inflight.get(key);
    if (existing) return existing;
    const ctx = ensureContext();
    if (!ctx) return;
    const p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffers.set(key, buf);
      } catch {
        // Silent failure — audio is non-critical
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  }

  function resolveUrl(key: string, url?: string): string | null {
    if (url) return url;
    if (key in SHARED_URLS) return SHARED_URLS[key as SharedSfxKey];
    return null;
  }

  function startSource(ctx: AudioContext, buf: AudioBuffer, pitchRate?: number): void {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (pitchRate !== undefined) {
      src.playbackRate.value = pitchRate;
    }
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    const master = getMasterGain();
    if (master) {
      gain.connect(master);
    } else {
      gain.connect(ctx.destination);
    }
    src.start(0);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
  }

  function play(key: string, url?: string, pitchRate?: number): void {
    if (muted || disposed) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const targetUrl = resolveUrl(key, url);
    if (!targetUrl) return;

    const buf = buffers.get(key);
    if (buf) {
      startSource(ctx, buf, pitchRate);
      return;
    }
    // First use of this sound: kick off fetch+decode and play it as soon as it's
    // ready, so the very first tap on a fresh game isn't silently dropped.
    void loadBuffer(key, targetUrl).then(() => {
      const ready = buffers.get(key);
      if (!ready || muted || disposed) return;
      const live = ensureContext();
      if (live) startSource(live, ready, pitchRate);
    });
  }

  return {
    play(keyOrShared: string, url?: string): void {
      play(keyOrShared, url);
    },

    playPitched(key: SharedSfxKey, pitchRange = 0.08): void {
      const rate = 1 + (Math.random() * 2 - 1) * pitchRange;
      play(key, undefined, rate);
    },

    playBGM(key: string, url: string, opts?: { volume?: number }): void {
      const ctx = ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();

      // Stop existing BGM with crossfade
      if (bgmSource && bgmGain) {
        const oldGain = bgmGain;
        const oldSource = bgmSource;
        oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        later(() => {
          try { oldSource.stop(); } catch { /* already stopped */ }
          oldSource.disconnect();
          oldGain.disconnect();
        }, 600);
      }

      const buf = buffers.get(key);
      if (!buf) {
        void loadBuffer(key, url).then(() => {
          // Retry after loading
          if (bgmKey === key) playBGMInternal(key, url, opts?.volume);
        });
        bgmKey = key;
        return;
      }

      playBGMInternal(key, url, opts?.volume);
    },

    stopBGM(opts?: { fadeMs?: number }): void {
      if (!bgmSource || !bgmGain) return;
      const ctx = ensureContext();
      if (!ctx) return;
      const fadeMs = opts?.fadeMs ?? 500;
      const oldGain = bgmGain;
      const oldSource = bgmSource;
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
      later(() => {
        try { oldSource.stop(); } catch { /* already stopped */ }
        oldSource.disconnect();
        oldGain.disconnect();
      }, fadeMs + 100);
      bgmSource = null;
      bgmGain = null;
      bgmKey = null;
    },

    getVolume(): number {
      return volume;
    },

    setVolume(v: number): void {
      volume = Math.max(0, Math.min(1, v));
      setAudioVolumePreference(volume);
      applyMasterGain();
    },

    isMuted(): boolean {
      return muted;
    },

    setMuted(value: boolean): void {
      muted = value;
      setMutePreference(value);
      // New sfx are gated by `muted`, but looping BGM only stops when the master
      // bus is silenced.
      applyMasterGain();
    },

    async preload(key: string, url: string): Promise<void> {
      await loadBuffer(key, url);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      if (bgmSource) {
        try { bgmSource.stop(); } catch { /* already stopped */ }
        bgmSource.disconnect();
      }
      bgmGain?.disconnect();
      bgmSource = null;
      bgmGain = null;
      bgmKey = null;
      buffers.clear();
      inflight.clear();
      masterGain?.disconnect();
      masterGain = null;
      const ctx = context;
      context = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    },

    _debugContext(): AudioContext | null {
      return ensureContext();
    },
  };

  function applyMasterGain(): void {
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : volume;
    }
  }

  function playBGMInternal(key: string, url: string, bgmVolume?: number): void {
    const ctx = ensureContext();
    if (!ctx) return;
    const buf = buffers.get(key);
    if (!buf) return;

    bgmKey = key;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    const master = getMasterGain();
    if (master) {
      gain.connect(master);
    } else {
      gain.connect(ctx.destination);
    }
    // Fade in
    gain.gain.linearRampToValueAtTime(bgmVolume ?? 0.3, ctx.currentTime + 0.5);
    src.start(0);
    bgmSource = src;
    bgmGain = gain;
  }
}

/** Keys every game triggers; the rest of the shared set loads on first use. */
const PRELOADED_SHARED_KEYS: SharedSfxKey[] = ['success', 'fail', 'click'];

export async function preloadSharedSfx(manager: AudioManager): Promise<void> {
  await Promise.all(
    PRELOADED_SHARED_KEYS.map((key) => manager.preload(key, SHARED_URLS[key]))
  );
}
