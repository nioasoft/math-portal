import type { AudioManager, SharedSfxKey } from '../types';
import { getMutePreference, setMutePreference } from '@/lib/game/storage';

const SHARED_URLS: Record<SharedSfxKey, string> = {
  success: '/games/_shared/audio/success.ogg',
  fail: '/games/_shared/audio/fail.ogg',
  click: '/games/_shared/audio/click.ogg',
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
  let muted = getMutePreference();

  function ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const w = window as WindowWithAudio;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    return context;
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

  function play(key: string, url?: string): void {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const targetUrl = resolveUrl(key, url);
    if (!targetUrl) return;

    const buf = buffers.get(key);
    if (!buf) {
      void loadBuffer(key, targetUrl);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
  }

  return {
    play(keyOrShared: string, url?: string): void {
      play(keyOrShared, url);
    },
    isMuted(): boolean {
      return muted;
    },
    setMuted(value: boolean): void {
      muted = value;
      setMutePreference(value);
    },
    async preload(key: string, url: string): Promise<void> {
      await loadBuffer(key, url);
    },
    _debugContext(): AudioContext | null {
      return ensureContext();
    },
  };
}

export async function preloadSharedSfx(manager: AudioManager): Promise<void> {
  await Promise.all(
    (Object.entries(SHARED_URLS) as Array<[SharedSfxKey, string]>).map(([key, url]) =>
      manager.preload(key, url)
    )
  );
}
