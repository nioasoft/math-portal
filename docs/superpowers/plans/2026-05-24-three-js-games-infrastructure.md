# Three.js Games Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation that lets future 3D learning games be added to `tirgul.net` in ~150–300 lines of game-specific code each, running smoothly on modern iPads/phones, localized into 6 languages, and shipped behind a single `Game3D` contract.

**Architecture:** Vanilla Three.js (no R3F/Drei) wrapped in a class-based `SceneEngine` that handles render loop, lifecycle, dispose enforcement, performance monitoring, input adaptation, audio, and asset loading. A React layer (`Game3DShell` → `Canvas3D` + HTML overlay) integrates the engine into the existing `GameShell` and `/play` infrastructure. Games implement a thin `Game3D` interface and receive a `SceneContext` containing the scene, camera, input adapter, audio manager, asset cache, localization, scoring callbacks, and presets.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 strict · Tailwind 4 · next-intl · three ^0.180 (vanilla) · vitest + @testing-library/react · localStorage persistence

**Spec:** `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`

---

## File map

```
package.json                              # MODIFY — add deps
vitest.config.ts                          # CREATE — test config
vitest.setup.ts                           # CREATE — test bootstrap
tsconfig.json                             # MODIFY — vitest types

src/lib/games3d/
├── types.ts                              # CREATE — Game3D, GameMeta, SceneContext, etc.
├── registry.ts                           # CREATE — empty registry stub
├── engine/
│   ├── WebGLCheck.ts                     # CREATE
│   ├── PerformanceMonitor.ts             # CREATE
│   ├── AudioManager.ts                   # CREATE
│   ├── AssetLoader.ts                    # CREATE
│   ├── CameraPresets.ts                  # CREATE
│   ├── LightingPresets.ts                # CREATE
│   ├── InputAdapter.ts                   # CREATE
│   ├── SceneContext.ts                   # CREATE (factory + controllers)
│   └── SceneEngine.ts                    # CREATE
└── __tests__/                            # CREATE (alongside each module)

src/components/games3d/
├── WebGLFallback.tsx                     # CREATE
├── LoadingScene.tsx                      # CREATE
├── GameLoadError.tsx                     # CREATE
├── MuteButton.tsx                        # CREATE
├── OverlayHUD.tsx                        # CREATE
├── Canvas3D.tsx                          # CREATE
├── Game3DShell.tsx                       # CREATE
└── __tests__/                            # CREATE

src/lib/game/storage.ts                   # MODIFY — add 4 new functions

src/app/[locale]/play/_canary/
├── page.tsx                              # CREATE — dev-only route
└── CanaryGame.tsx                        # CREATE — Game3D impl

public/games/_shared/audio/
├── success.ogg                           # CREATE (sourced)
├── fail.ogg                              # CREATE (sourced)
└── click.ogg                             # CREATE (sourced)

messages/{he,en,ar,de,es,ru}/games3d.json # CREATE — 6 locale files

scripts/games3d-perf.ts                   # CREATE — perf benchmark

docs/games/
├── HOW-TO-ADD-A-3D-GAME.md               # CREATE — English
└── HOW-TO-ADD-A-3D-GAME.he.md            # CREATE — Hebrew
```

**Existing files reused without modification:** `src/components/game/GameShell.tsx`, `src/components/game/ScoreDisplay.tsx`, `src/components/game/Timer.tsx`, `src/components/game/Feedback.tsx`, `src/components/game/GameSummary.tsx`, `src/components/ui/Breadcrumb.tsx`, `src/i18n/navigation.ts`.

---

## Task 1: Install dependencies and configure vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add dependencies to `package.json`**

In `dependencies`, add:
```json
    "three": "^0.180.0",
```

In `devDependencies`, add:
```json
    "@types/three": "^0.180.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "jsdom": "^25.0.0",
    "vitest": "^2.1.0",
```

In `scripts`, add:
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: installs without errors; `node_modules/three` exists.

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/games3d/**', 'src/components/games3d/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 5: Add vitest types to `tsconfig.json`**

In the `compilerOptions.types` array (add the array if missing). The final `compilerOptions` should include:
```json
    "types": ["vitest/globals", "@testing-library/jest-dom"]
```

- [ ] **Step 6: Run test command to verify config is valid**

Run: `npm test -- --run`
Expected: vitest reports `No test files found` (this is correct — we haven't written tests yet) and exits 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts tsconfig.json
git commit -m "chore: install three and vitest for 3D games infrastructure"
```

---

## Task 2: Define core types (`types.ts`)

**Files:**
- Create: `src/lib/games3d/types.ts`

This is type-only — no runtime tests needed; the compiler is the test. Verification step: `npx tsc --noEmit` passes.

- [ ] **Step 1: Create `src/lib/games3d/types.ts`**

```typescript
import * as THREE from 'three';

// =========== Topic & metadata ============

export type GameTopic3D =
  | 'geometry'
  | 'arithmetic'
  | 'fractions'
  | 'percentage'
  | 'decimals'
  | 'ratio'
  | 'series'
  | 'units'
  | 'wordProblems'
  | 'misc';

export type GameMode3D = 'practice' | 'quiz';

export interface AssetManifest {
  textures?: Record<string, string>;
  models?: Record<string, string>;
  audio?: Record<string, string>;
}

export interface GameMeta {
  id: string;
  i18nKey: string;
  topic: GameTopic3D;
  difficulty: 1 | 2 | 3 | 4 | 5;
  gradeRange: [number, number];
  estimatedSeconds: number;
  assets?: AssetManifest;
  supportedModes: GameMode3D[];
}

// =========== Game contract ============

export interface Game3D {
  meta: GameMeta;
  init(ctx: SceneContext): GameInstance;
}

export interface GameInstance {
  onFrame?(dt: number, elapsed: number): void;
  onResize?(width: number, height: number): void;
  onPause?(): void;
  onResume?(): void;
  onQualityDowngrade?(level: 'low'): void;
  dispose(): void;
}

// =========== SceneContext ============

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  input: InputAdapter;
  audio: AudioManager;
  assets: AssetCache;
  locale: string;
  isRTL: boolean;
  prefersReducedMotion: boolean;
  score: ScoreController;
  feedback: FeedbackController;
  complete(summary: CompleteSummary): void;
  presets: {
    camera: CameraPresetsAPI;
    lighting: LightingPresetsAPI;
  };
  debug: DebugAPI | null;
}

export interface CompleteSummary {
  totalPoints: number;
  accuracy: number;
  durationSec: number;
  streak?: number;
}

// =========== Controllers ============

export interface ScoreController {
  add(points: number): void;
  set(value: number): void;
  reset(): void;
  get(): number;
}

export type FeedbackKind = 'correct' | 'wrong' | 'hint';

export interface FeedbackEvent {
  kind: FeedbackKind;
  message?: string;
  at: number;
}

export interface FeedbackController {
  correct(message?: string): void;
  wrong(message?: string): void;
  hint(message: string): void;
}

// =========== Input ============

export type Unsubscribe = () => void;

export interface PointerInfo {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  picked: THREE.Object3D | null;
}

export type InputEventMap = {
  tap: PointerInfo;
  dragStart: PointerInfo;
  drag: PointerInfo;
  dragEnd: PointerInfo;
  pinch: number;
  rotate: number;
  key: string;
};

export interface InputAdapter {
  on<K extends keyof InputEventMap>(
    event: K,
    handler: (payload: InputEventMap[K]) => void
  ): Unsubscribe;
  pickAt(x: number, y: number): THREE.Intersection[];
}

// =========== Audio ============

export type SharedSfxKey = 'success' | 'fail' | 'click';

export interface AudioManager {
  play(key: SharedSfxKey): void;
  play(key: string, url: string): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  preload(key: string, url: string): Promise<void>;
}

// =========== Assets ============

export interface AssetCache {
  texture(key: string): THREE.Texture;
  model(key: string): THREE.Object3D;
  has(key: string): boolean;
}

// =========== Presets ============

export interface CameraPresetsAPI {
  orbit(target: THREE.Vector3, distance: number): void;
  topDown(target: THREE.Vector3, distance: number): void;
  locked(position: THREE.Vector3, lookAt: THREE.Vector3): void;
}

export interface LightingPresetsAPI {
  daylight(scene: THREE.Scene): void;
  soft(scene: THREE.Scene): void;
  dramatic(scene: THREE.Scene): void;
}

// =========== Debug ============

export interface DebugAPI {
  logTrackedResources(): void;
}

// =========== Performance ============

export type QualityLevel = 'high' | 'medium' | 'low';

export interface PerformanceSample {
  fps: number;
  timestamp: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0 (no errors). If `three` types not found, re-check `npm install`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/games3d/types.ts
git commit -m "feat(games3d): add core type definitions for Game3D contract"
```

---

## Task 3: WebGL detection (`WebGLCheck.ts`)

**Files:**
- Create: `src/lib/games3d/engine/WebGLCheck.ts`
- Test: `src/lib/games3d/__tests__/WebGLCheck.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/WebGLCheck.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { hasWebGL, getWebGLContext } from '../engine/WebGLCheck';

describe('WebGLCheck', () => {
  it('returns false in jsdom (no WebGL)', () => {
    expect(hasWebGL()).toBe(false);
  });

  it('returns null context in jsdom', () => {
    expect(getWebGLContext()).toBeNull();
  });

  it('returns true when canvas getContext returns a webgl context', () => {
    const fakeCanvas = {
      getContext: vi.fn((type: string) =>
        type === 'webgl2' || type === 'webgl' ? { fake: true } : null
      ),
    } as unknown as HTMLCanvasElement;
    const originalCreate = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return fakeCanvas;
      return originalCreate.call(document, tag);
    });
    expect(hasWebGL()).toBe(true);
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- WebGLCheck`
Expected: FAIL — `Cannot find module '../engine/WebGLCheck'`.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/WebGLCheck.ts`:
```typescript
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
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- WebGLCheck`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/WebGLCheck.ts src/lib/games3d/__tests__/WebGLCheck.test.ts
git commit -m "feat(games3d): add WebGL availability detection"
```

---

## Task 4: Extend `storage.ts` with 3D persistence functions

**Files:**
- Modify: `src/lib/game/storage.ts`
- Test: `src/lib/game/__tests__/storage-3d.test.ts`

- [ ] **Step 1: Read existing storage.ts to learn the pattern**

Run: `cat src/lib/game/storage.ts`
Expected: shows current `tirgul.*` key prefix pattern. Reuse the same prefix.

- [ ] **Step 2: Write the failing test**

`src/lib/game/__tests__/storage-3d.test.ts`:
```typescript
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
```

- [ ] **Step 3: Run test, expect fail**

Run: `npm test -- storage-3d`
Expected: FAIL — exports not found.

- [ ] **Step 4: Append to `src/lib/game/storage.ts`**

Add at the bottom of the file (do not modify existing exports):

```typescript
// ============ 3D Games extensions ============

const KEY_3D_BEST_PREFIX = 'tirgul.games3d.best.';
const KEY_MUTE = 'tirgul.games3d.muted';

function safeRead(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore quota/permission errors — UX should not break
  }
}

export function getGame3DBestScore(gameId: string): number {
  const raw = safeRead(KEY_3D_BEST_PREFIX + gameId);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setGame3DBestScore(gameId: string, score: number): void {
  if (!Number.isFinite(score) || score < 0) return;
  safeWrite(KEY_3D_BEST_PREFIX + gameId, String(Math.floor(score)));
}

export function getMutePreference(): boolean {
  return safeRead(KEY_MUTE) === '1';
}

export function setMutePreference(muted: boolean): void {
  safeWrite(KEY_MUTE, muted ? '1' : '0');
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- storage-3d`
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/storage.ts src/lib/game/__tests__/storage-3d.test.ts
git commit -m "feat(games3d): extend storage with 3D best scores and mute preference"
```

---

## Task 5: AudioManager

**Files:**
- Create: `src/lib/games3d/engine/AudioManager.ts`
- Test: `src/lib/games3d/__tests__/AudioManager.test.ts`

The AudioManager wraps Web Audio API. We test the public behavior (preload, play, mute toggle, persistence). The underlying `AudioContext` is mocked.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/AudioManager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAudioManager } from '../engine/AudioManager';

class FakeAudioBuffer {}
class FakeBufferSource {
  buffer: FakeAudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
}
class FakeGain {
  gain = { value: 1 };
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
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- AudioManager`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/AudioManager.ts`:
```typescript
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

export function createAudioManager(): InternalManager {
  let context: AudioContext | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const inflight = new Map<string, Promise<void>>();
  let muted = getMutePreference();

  function ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor: typeof AudioContext | undefined =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
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

  function resolveUrl(key: string, url?: string): string {
    if (url) return url;
    if (key in SHARED_URLS) return SHARED_URLS[key as SharedSfxKey];
    throw new Error(`AudioManager.play: unknown shared key "${key}" and no url provided`);
  }

  function play(key: string, url?: string): void {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const targetUrl = (() => {
      try { return resolveUrl(key, url); } catch { return null; }
    })();
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
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- AudioManager`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/AudioManager.ts src/lib/games3d/__tests__/AudioManager.test.ts
git commit -m "feat(games3d): add AudioManager with mute persistence and iOS unlock"
```

---

## Task 6: AssetLoader (AssetCache)

**Files:**
- Create: `src/lib/games3d/engine/AssetLoader.ts`
- Test: `src/lib/games3d/__tests__/AssetLoader.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/AssetLoader.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createAssetLoader } from '../engine/AssetLoader';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AssetLoader', () => {
  it('loads a texture and caches it', async () => {
    const fakeTex = new THREE.Texture();
    const loadSpy = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t/tile.png' });
    expect(loader.cache.texture('tile')).toBe(fakeTex);
    expect(loadSpy).toHaveBeenCalledOnce();
  });

  it('returns same instance on second load (cache hit)', async () => {
    const fakeTex = new THREE.Texture();
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t/tile.png' });
    await loader.loadTextures({ tile: '/t/tile.png' });
    expect(loader.cache.texture('tile')).toBe(fakeTex);
  });

  it('reports progress via onProgress callback', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const progress: number[] = [];
    const loader = createAssetLoader();
    await loader.loadTextures(
      { a: '/a.png', b: '/b.png', c: '/c.png' },
      { onProgress: (p) => progress.push(p) }
    );
    expect(progress.at(-1)).toBe(1);
    expect(progress.length).toBeGreaterThanOrEqual(3);
  });

  it('throws on missing key', () => {
    const loader = createAssetLoader();
    expect(() => loader.cache.texture('missing')).toThrow(/not loaded/);
  });

  it('evict() disposes loaded textures', async () => {
    const fakeTex = new THREE.Texture();
    fakeTex.dispose = vi.fn();
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(fakeTex);

    const loader = createAssetLoader();
    await loader.loadTextures({ tile: '/t.png' });
    loader.evict();
    expect(fakeTex.dispose).toHaveBeenCalled();
    expect(loader.cache.has('tile')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- AssetLoader`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/AssetLoader.ts`:
```typescript
import * as THREE from 'three';
import type { AssetCache } from '../types';

export interface LoadOptions {
  onProgress?: (fraction: number) => void;
}

export interface AssetLoaderInstance {
  cache: AssetCache;
  loadTextures(manifest: Record<string, string>, opts?: LoadOptions): Promise<void>;
  loadModels(manifest: Record<string, string>, opts?: LoadOptions): Promise<void>;
  evict(): void;
}

export function createAssetLoader(): AssetLoaderInstance {
  const textures = new Map<string, THREE.Texture>();
  const models = new Map<string, THREE.Object3D>();
  const textureLoader = new THREE.TextureLoader();

  async function loadTextures(
    manifest: Record<string, string>,
    opts?: LoadOptions
  ): Promise<void> {
    const entries = Object.entries(manifest);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, url]) => {
        if (!textures.has(key)) {
          const tex = await textureLoader.loadAsync(url);
          textures.set(key, tex);
        }
        done++;
        opts?.onProgress?.(done / entries.length);
      })
    );
  }

  async function loadModels(
    manifest: Record<string, string>,
    opts?: LoadOptions
  ): Promise<void> {
    // GLTF loader pulled in lazily so it does not bloat the bundle if no game uses models.
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const entries = Object.entries(manifest);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, url]) => {
        if (!models.has(key)) {
          const gltf = await loader.loadAsync(url);
          models.set(key, gltf.scene);
        }
        done++;
        opts?.onProgress?.(done / entries.length);
      })
    );
  }

  function disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }

  function evict(): void {
    textures.forEach((t) => t.dispose());
    textures.clear();
    models.forEach((m) => disposeObject(m));
    models.clear();
  }

  const cache: AssetCache = {
    texture(key: string): THREE.Texture {
      const t = textures.get(key);
      if (!t) throw new Error(`Texture "${key}" not loaded`);
      return t;
    },
    model(key: string): THREE.Object3D {
      const m = models.get(key);
      if (!m) throw new Error(`Model "${key}" not loaded`);
      return m.clone();
    },
    has(key: string): boolean {
      return textures.has(key) || models.has(key);
    },
  };

  return { cache, loadTextures, loadModels, evict };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- AssetLoader`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/AssetLoader.ts src/lib/games3d/__tests__/AssetLoader.test.ts
git commit -m "feat(games3d): add AssetLoader with texture/model cache and eviction"
```

---

## Task 7: PerformanceMonitor

**Files:**
- Create: `src/lib/games3d/engine/PerformanceMonitor.ts`
- Test: `src/lib/games3d/__tests__/PerformanceMonitor.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/PerformanceMonitor.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPerformanceMonitor } from '../engine/PerformanceMonitor';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PerformanceMonitor', () => {
  it('reports average fps after sampling window', () => {
    const m = createPerformanceMonitor({ windowMs: 1000, lowThresholdFps: 30 });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    // 60 frames in 1000ms == 60fps
    for (let i = 0; i < 60; i++) {
      now += 1000 / 60;
      m.tick();
    }
    const sample = m.sample();
    expect(sample.fps).toBeGreaterThan(50);
    expect(sample.fps).toBeLessThan(70);
  });

  it('triggers onLowFps after 3 consecutive low samples', () => {
    const onLow = vi.fn();
    const m = createPerformanceMonitor({
      windowMs: 1000,
      lowThresholdFps: 30,
      lowConsecutiveSamples: 3,
      onLowFps: onLow,
    });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    // Simulate 3 windows of 20fps
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
    const onLow = vi.fn();
    const m = createPerformanceMonitor({
      windowMs: 1000,
      lowThresholdFps: 30,
      onLowFps: onLow,
    });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
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
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- PerformanceMonitor`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/PerformanceMonitor.ts`:
```typescript
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
  const windowMs = opts.windowMs ?? 1000;
  const threshold = opts.lowThresholdFps ?? 30;
  const consecutiveNeeded = opts.lowConsecutiveSamples ?? 3;
  const onLow = opts.onLowFps;

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
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- PerformanceMonitor`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/PerformanceMonitor.ts src/lib/games3d/__tests__/PerformanceMonitor.test.ts
git commit -m "feat(games3d): add PerformanceMonitor with low-fps detection"
```

---

## Task 8: CameraPresets and LightingPresets

**Files:**
- Create: `src/lib/games3d/engine/CameraPresets.ts`
- Create: `src/lib/games3d/engine/LightingPresets.ts`
- Test: `src/lib/games3d/__tests__/Presets.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/Presets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCameraPresets } from '../engine/CameraPresets';
import { createLightingPresets } from '../engine/LightingPresets';

describe('CameraPresets', () => {
  it('orbit() positions camera at distance from target on a tilted angle', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const target = new THREE.Vector3(1, 2, 3);
    presets.orbit(target, 10);
    expect(camera.position.distanceTo(target)).toBeCloseTo(10, 3);
  });

  it('topDown() looks straight down', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const target = new THREE.Vector3(0, 0, 0);
    presets.topDown(target, 5);
    expect(camera.position.y).toBeCloseTo(5, 3);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    expect(forward.y).toBeCloseTo(-1, 1);
  });

  it('locked() sets exact position and lookAt', () => {
    const camera = new THREE.PerspectiveCamera();
    const presets = createCameraPresets(camera);
    const pos = new THREE.Vector3(1, 1, 1);
    const look = new THREE.Vector3(0, 0, 0);
    presets.locked(pos, look);
    expect(camera.position.equals(pos)).toBe(true);
  });
});

describe('LightingPresets', () => {
  it('daylight() adds at least one ambient and one directional light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.daylight(scene);
    const ambients = scene.children.filter((c) => c instanceof THREE.AmbientLight);
    const directionals = scene.children.filter((c) => c instanceof THREE.DirectionalLight);
    expect(ambients.length).toBeGreaterThanOrEqual(1);
    expect(directionals.length).toBeGreaterThanOrEqual(1);
  });

  it('soft() adds hemisphere light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.soft(scene);
    const hemi = scene.children.find((c) => c instanceof THREE.HemisphereLight);
    expect(hemi).toBeDefined();
  });

  it('dramatic() adds spot light', () => {
    const scene = new THREE.Scene();
    const presets = createLightingPresets();
    presets.dramatic(scene);
    const spot = scene.children.find((c) => c instanceof THREE.SpotLight);
    expect(spot).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- Presets`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement CameraPresets**

`src/lib/games3d/engine/CameraPresets.ts`:
```typescript
import * as THREE from 'three';
import type { CameraPresetsAPI } from '../types';

export function createCameraPresets(camera: THREE.PerspectiveCamera): CameraPresetsAPI {
  return {
    orbit(target: THREE.Vector3, distance: number): void {
      // Position at an isometric-ish angle: 45° around Y, 30° up
      const yaw = Math.PI / 4;
      const pitch = Math.PI / 6;
      camera.position.set(
        target.x + distance * Math.cos(pitch) * Math.sin(yaw),
        target.y + distance * Math.sin(pitch),
        target.z + distance * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(target);
    },
    topDown(target: THREE.Vector3, distance: number): void {
      camera.position.set(target.x, target.y + distance, target.z + 0.0001);
      camera.lookAt(target);
    },
    locked(position: THREE.Vector3, lookAt: THREE.Vector3): void {
      camera.position.copy(position);
      camera.lookAt(lookAt);
    },
  };
}
```

- [ ] **Step 4: Implement LightingPresets**

`src/lib/games3d/engine/LightingPresets.ts`:
```typescript
import * as THREE from 'three';
import type { LightingPresetsAPI } from '../types';

export function createLightingPresets(): LightingPresetsAPI {
  return {
    daylight(scene: THREE.Scene): void {
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(5, 10, 7);
      scene.add(ambient, directional);
    },
    soft(scene: THREE.Scene): void {
      const hemi = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.7);
      scene.add(hemi);
    },
    dramatic(scene: THREE.Scene): void {
      const ambient = new THREE.AmbientLight(0x404040, 0.3);
      const spot = new THREE.SpotLight(0xffffff, 1.2, 50, Math.PI / 6, 0.3);
      spot.position.set(0, 10, 5);
      scene.add(ambient, spot);
    },
  };
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- Presets`
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/games3d/engine/CameraPresets.ts src/lib/games3d/engine/LightingPresets.ts src/lib/games3d/__tests__/Presets.test.ts
git commit -m "feat(games3d): add CameraPresets and LightingPresets"
```

---

## Task 9: InputAdapter — pointer events (tap/drag) and pickAt

**Files:**
- Create: `src/lib/games3d/engine/InputAdapter.ts`
- Test: `src/lib/games3d/__tests__/InputAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/InputAdapter.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createInputAdapter } from '../engine/InputAdapter';

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  Object.defineProperty(c, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
  });
  return c;
}

function pointerEvent(type: string, props: PointerEventInit & { pointerId?: number }): PointerEvent {
  return new PointerEvent(type, { bubbles: true, ...props });
}

beforeEach(() => {
  if (typeof (globalThis as any).PointerEvent === 'undefined') {
    (globalThis as any).PointerEvent = class extends Event {
      pointerId: number; clientX: number; clientY: number;
      constructor(type: string, init: any = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
      }
    };
  }
});

describe('InputAdapter — taps and drags', () => {
  it('fires tap on quick pointerdown+up with no movement', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const adapter = createInputAdapter(canvas, camera, scene);
    const onTap = vi.fn();
    adapter.on('tap', onTap);

    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 102, clientY: 101, pointerId: 1 }));
    expect(onTap).toHaveBeenCalledOnce();
    document.body.removeChild(canvas);
  });

  it('fires dragStart + drag + dragEnd on extended movement', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const adapter = createInputAdapter(canvas, camera, scene);
    const start = vi.fn();
    const drag = vi.fn();
    const end = vi.fn();
    adapter.on('dragStart', start);
    adapter.on('drag', drag);
    adapter.on('dragEnd', end);

    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointermove', { clientX: 150, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointermove', { clientX: 200, clientY: 100, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 200, clientY: 100, pointerId: 1 }));

    expect(start).toHaveBeenCalledOnce();
    expect(drag).toHaveBeenCalled();
    expect(end).toHaveBeenCalledOnce();
    document.body.removeChild(canvas);
  });

  it('unsubscribe stops further events', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onTap = vi.fn();
    const off = adapter.on('tap', onTap);
    off();
    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 1 }));
    expect(onTap).not.toHaveBeenCalled();
    document.body.removeChild(canvas);
  });

  it('pickAt returns intersections for object in front of camera', () => {
    const canvas = makeCanvas();
    const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const scene = new THREE.Scene();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.add(cube);

    const adapter = createInputAdapter(canvas, camera, scene);
    const intersects = adapter.pickAt(0, 0); // NDC center
    expect(intersects.length).toBeGreaterThan(0);
    expect(intersects[0].object).toBe(cube);
  });

  it('dispose removes event listeners', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onTap = vi.fn();
    adapter.on('tap', onTap);
    adapter.dispose();
    canvas.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 1 }));
    canvas.dispatchEvent(pointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 1 }));
    expect(onTap).not.toHaveBeenCalled();
    document.body.removeChild(canvas);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- InputAdapter`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement (tap/drag/pickAt only — pinch/rotate in next task)**

`src/lib/games3d/engine/InputAdapter.ts`:
```typescript
import * as THREE from 'three';
import type {
  InputAdapter,
  InputEventMap,
  PointerInfo,
  Unsubscribe,
} from '../types';

const TAP_MAX_MOVE_PX = 8;
const TAP_MAX_HOLD_MS = 200;

interface ActivePointer {
  id: number;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  isDragging: boolean;
}

export interface InputAdapterInstance extends InputAdapter {
  dispose(): void;
}

export function createInputAdapter(
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene
): InputAdapterInstance {
  type ListenerSet = {
    tap: Set<(p: PointerInfo) => void>;
    dragStart: Set<(p: PointerInfo) => void>;
    drag: Set<(p: PointerInfo) => void>;
    dragEnd: Set<(p: PointerInfo) => void>;
    pinch: Set<(d: number) => void>;
    rotate: Set<(d: number) => void>;
    key: Set<(k: string) => void>;
  };
  const listeners: ListenerSet = {
    tap: new Set(),
    dragStart: new Set(),
    drag: new Set(),
    dragEnd: new Set(),
    pinch: new Set(),
    rotate: new Set(),
    key: new Set(),
  };

  const active = new Map<number, ActivePointer>();
  const raycaster = new THREE.Raycaster();
  const ndcVec = new THREE.Vector2();

  function clientToNDC(clientX: number, clientY: number): { ndc: { x: number; y: number }; px: { x: number; y: number } } {
    const rect = canvas.getBoundingClientRect();
    const px = { x: clientX - rect.left, y: clientY - rect.top };
    const ndc = {
      x: (px.x / rect.width) * 2 - 1,
      y: -(px.y / rect.height) * 2 + 1,
    };
    return { ndc, px };
  }

  function buildPointerInfo(clientX: number, clientY: number): PointerInfo {
    const { ndc, px } = clientToNDC(clientX, clientY);
    ndcVec.set(ndc.x, ndc.y);
    raycaster.setFromCamera(ndcVec, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    return {
      x: ndc.x,
      y: ndc.y,
      pixelX: px.x,
      pixelY: px.y,
      picked: intersects[0]?.object ?? null,
    };
  }

  function onPointerDown(ev: PointerEvent): void {
    ev.preventDefault?.();
    active.set(ev.pointerId, {
      id: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startTime: performance.now(),
      lastX: ev.clientX,
      lastY: ev.clientY,
      isDragging: false,
    });
  }

  function onPointerMove(ev: PointerEvent): void {
    const ptr = active.get(ev.pointerId);
    if (!ptr) return;
    ptr.lastX = ev.clientX;
    ptr.lastY = ev.clientY;
    const dx = ev.clientX - ptr.startX;
    const dy = ev.clientY - ptr.startY;
    const distSq = dx * dx + dy * dy;

    if (!ptr.isDragging && distSq > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
      ptr.isDragging = true;
      const info = buildPointerInfo(ptr.startX, ptr.startY);
      listeners.dragStart.forEach((h) => h(info));
    }
    if (ptr.isDragging) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.drag.forEach((h) => h(info));
    }
  }

  function onPointerUp(ev: PointerEvent): void {
    const ptr = active.get(ev.pointerId);
    if (!ptr) return;
    active.delete(ev.pointerId);
    const dx = ev.clientX - ptr.startX;
    const dy = ev.clientY - ptr.startY;
    const distSq = dx * dx + dy * dy;
    const heldMs = performance.now() - ptr.startTime;

    if (
      !ptr.isDragging &&
      distSq <= TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX &&
      heldMs <= TAP_MAX_HOLD_MS
    ) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.tap.forEach((h) => h(info));
    } else if (ptr.isDragging) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.dragEnd.forEach((h) => h(info));
    }
  }

  function onPointerCancel(ev: PointerEvent): void {
    const ptr = active.get(ev.pointerId);
    if (ptr?.isDragging) {
      const info = buildPointerInfo(ptr.lastX, ptr.lastY);
      listeners.dragEnd.forEach((h) => h(info));
    }
    active.delete(ev.pointerId);
  }

  function onKey(ev: KeyboardEvent): void {
    listeners.key.forEach((h) => h(ev.key));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKey);

  return {
    on<K extends keyof InputEventMap>(
      event: K,
      handler: (payload: InputEventMap[K]) => void
    ): Unsubscribe {
      const set = listeners[event] as unknown as Set<typeof handler>;
      set.add(handler);
      return () => set.delete(handler);
    },
    pickAt(x: number, y: number): THREE.Intersection[] {
      ndcVec.set(x, y);
      raycaster.setFromCamera(ndcVec, camera);
      return raycaster.intersectObjects(scene.children, true);
    },
    dispose(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKey);
      Object.values(listeners).forEach((s) => s.clear());
      active.clear();
    },
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- InputAdapter`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/InputAdapter.ts src/lib/games3d/__tests__/InputAdapter.test.ts
git commit -m "feat(games3d): add InputAdapter with pointer tap/drag and raycast"
```

---

## Task 10: InputAdapter — pinch and rotate (multi-touch)

**Files:**
- Modify: `src/lib/games3d/engine/InputAdapter.ts`
- Modify: `src/lib/games3d/__tests__/InputAdapter.test.ts`

- [ ] **Step 1: Append failing tests for pinch/rotate**

Append to `src/lib/games3d/__tests__/InputAdapter.test.ts`:
```typescript
describe('InputAdapter — multi-touch', () => {
  function makeCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    Object.defineProperty(c, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
    });
    return c;
  }
  function pe(type: string, props: any): PointerEvent {
    return new PointerEvent(type, { bubbles: true, ...props });
  }

  it('fires pinch with positive delta when fingers move apart', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onPinch = vi.fn();
    adapter.on('pinch', onPinch);

    canvas.dispatchEvent(pe('pointerdown', { pointerId: 1, clientX: 100, clientY: 200 }));
    canvas.dispatchEvent(pe('pointerdown', { pointerId: 2, clientX: 200, clientY: 200 }));
    canvas.dispatchEvent(pe('pointermove', { pointerId: 2, clientX: 300, clientY: 200 }));
    expect(onPinch).toHaveBeenCalled();
    const delta = onPinch.mock.calls[0][0] as number;
    expect(delta).toBeGreaterThan(0);
    document.body.removeChild(canvas);
  });

  it('fires rotate when fingers rotate around centroid', () => {
    const canvas = makeCanvas();
    document.body.appendChild(canvas);
    const adapter = createInputAdapter(canvas, new THREE.PerspectiveCamera(), new THREE.Scene());
    const onRotate = vi.fn();
    adapter.on('rotate', onRotate);

    // Start: pointer1 at (100,200), pointer2 at (200,200) — horizontal alignment
    canvas.dispatchEvent(pe('pointerdown', { pointerId: 1, clientX: 100, clientY: 200 }));
    canvas.dispatchEvent(pe('pointerdown', { pointerId: 2, clientX: 200, clientY: 200 }));
    // Rotate ~30° clockwise: move pointer2 to (~187, 250)
    canvas.dispatchEvent(pe('pointermove', { pointerId: 2, clientX: 187, clientY: 250 }));
    expect(onRotate).toHaveBeenCalled();
    document.body.removeChild(canvas);
  });
});
```

- [ ] **Step 2: Run tests, expect failures**

Run: `npm test -- InputAdapter`
Expected: 2 new tests FAIL (pinch/rotate handlers never invoked).

- [ ] **Step 3: Modify `InputAdapter.ts` to track multi-touch state**

In `InputAdapter.ts`, replace the `onPointerMove` function and add tracking for second-pointer distance/angle. Modify only the relevant region — keep the existing tap/drag logic for single-pointer cases.

Replace `onPointerMove` and add the helper region. Find `function onPointerMove(ev: PointerEvent): void {` and replace through its closing `}` with:

```typescript
  let lastPinchDistance: number | null = null;
  let lastPinchAngle: number | null = null;

  function activePair(): [ActivePointer, ActivePointer] | null {
    if (active.size !== 2) return null;
    const arr = Array.from(active.values());
    return [arr[0], arr[1]];
  }

  function pairDistance(p1: ActivePointer, p2: ActivePointer): number {
    return Math.hypot(p1.lastX - p2.lastX, p1.lastY - p2.lastY);
  }

  function pairAngle(p1: ActivePointer, p2: ActivePointer): number {
    return Math.atan2(p2.lastY - p1.lastY, p2.lastX - p1.lastX);
  }

  function onPointerMove(ev: PointerEvent): void {
    const ptr = active.get(ev.pointerId);
    if (!ptr) return;
    ptr.lastX = ev.clientX;
    ptr.lastY = ev.clientY;

    const pair = activePair();
    if (pair) {
      const [a, b] = pair;
      const dist = pairDistance(a, b);
      const ang = pairAngle(a, b);
      if (lastPinchDistance !== null) {
        const dDelta = dist - lastPinchDistance;
        if (Math.abs(dDelta) > 0.5) listeners.pinch.forEach((h) => h(dDelta));
      }
      if (lastPinchAngle !== null) {
        let aDelta = ang - lastPinchAngle;
        // normalize to (-PI, PI]
        if (aDelta > Math.PI) aDelta -= 2 * Math.PI;
        if (aDelta < -Math.PI) aDelta += 2 * Math.PI;
        if (Math.abs(aDelta) > 0.005) listeners.rotate.forEach((h) => h(aDelta));
      }
      lastPinchDistance = dist;
      lastPinchAngle = ang;
      return;
    }

    // Single-pointer drag logic
    lastPinchDistance = null;
    lastPinchAngle = null;
    const dx = ev.clientX - ptr.startX;
    const dy = ev.clientY - ptr.startY;
    const distSq = dx * dx + dy * dy;
    if (!ptr.isDragging && distSq > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
      ptr.isDragging = true;
      const info = buildPointerInfo(ptr.startX, ptr.startY);
      listeners.dragStart.forEach((h) => h(info));
    }
    if (ptr.isDragging) {
      const info = buildPointerInfo(ev.clientX, ev.clientY);
      listeners.drag.forEach((h) => h(info));
    }
  }
```

Also update `onPointerUp` and `onPointerCancel` to reset pinch state when count drops below 2. Add at the start of each:
```typescript
    if (active.size <= 2) { lastPinchDistance = null; lastPinchAngle = null; }
```

(Place this line as the first executable line inside both handlers.)

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test -- InputAdapter`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/InputAdapter.ts src/lib/games3d/__tests__/InputAdapter.test.ts
git commit -m "feat(games3d): add pinch and rotate gestures to InputAdapter"
```

---

## Task 11: SceneContext factory (with ScoreController and FeedbackController)

**Files:**
- Create: `src/lib/games3d/engine/SceneContext.ts`
- Test: `src/lib/games3d/__tests__/SceneContext.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/SceneContext.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createScoreController, createFeedbackController } from '../engine/SceneContext';

describe('ScoreController', () => {
  it('starts at 0', () => {
    const s = createScoreController();
    expect(s.get()).toBe(0);
  });

  it('add() accumulates', () => {
    const s = createScoreController();
    s.add(5);
    s.add(3);
    expect(s.get()).toBe(8);
  });

  it('set() replaces value', () => {
    const s = createScoreController();
    s.set(42);
    expect(s.get()).toBe(42);
  });

  it('reset() returns to 0', () => {
    const s = createScoreController();
    s.add(10);
    s.reset();
    expect(s.get()).toBe(0);
  });

  it('notifies subscribers on change', () => {
    const s = createScoreController();
    const obs = vi.fn();
    s.subscribe(obs);
    s.add(5);
    expect(obs).toHaveBeenCalledWith(5);
  });
});

describe('FeedbackController', () => {
  it('emits correct event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.correct('Well done!');
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'correct', message: 'Well done!' }));
  });

  it('emits wrong event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.wrong();
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'wrong' }));
  });

  it('emits hint event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.hint('Try the blue one');
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hint', message: 'Try the blue one' }));
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- SceneContext`
Expected: FAIL — exports not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/SceneContext.ts`:
```typescript
import * as THREE from 'three';
import type {
  SceneContext,
  ScoreController,
  FeedbackController,
  FeedbackEvent,
  CompleteSummary,
  AudioManager,
  InputAdapter,
  AssetCache,
  CameraPresetsAPI,
  LightingPresetsAPI,
  DebugAPI,
} from '../types';

// =========== ScoreController ============

export interface ObservableScore extends ScoreController {
  subscribe(observer: (newValue: number) => void): () => void;
}

export function createScoreController(): ObservableScore {
  let value = 0;
  const observers = new Set<(v: number) => void>();
  const notify = () => observers.forEach((o) => o(value));
  return {
    add(points) { value += points; notify(); },
    set(v) { value = v; notify(); },
    reset() { value = 0; notify(); },
    get() { return value; },
    subscribe(o) { observers.add(o); return () => observers.delete(o); },
  };
}

// =========== FeedbackController ============

export interface ObservableFeedback extends FeedbackController {
  subscribe(observer: (event: FeedbackEvent) => void): () => void;
}

export function createFeedbackController(): ObservableFeedback {
  const observers = new Set<(e: FeedbackEvent) => void>();
  const emit = (e: FeedbackEvent) => observers.forEach((o) => o(e));
  return {
    correct(message) { emit({ kind: 'correct', message, at: Date.now() }); },
    wrong(message) { emit({ kind: 'wrong', message, at: Date.now() }); },
    hint(message) { emit({ kind: 'hint', message, at: Date.now() }); },
    subscribe(o) { observers.add(o); return () => observers.delete(o); },
  };
}

// =========== SceneContext factory ============

export interface CreateContextArgs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  input: InputAdapter;
  audio: AudioManager;
  assets: AssetCache;
  locale: string;
  isRTL: boolean;
  prefersReducedMotion: boolean;
  score: ObservableScore;
  feedback: ObservableFeedback;
  onComplete: (summary: CompleteSummary) => void;
  cameraPresets: CameraPresetsAPI;
  lightingPresets: LightingPresetsAPI;
  debug?: DebugAPI | null;
}

export function createSceneContext(args: CreateContextArgs): SceneContext {
  return {
    scene: args.scene,
    camera: args.camera,
    renderer: args.renderer,
    input: args.input,
    audio: args.audio,
    assets: args.assets,
    locale: args.locale,
    isRTL: args.isRTL,
    prefersReducedMotion: args.prefersReducedMotion,
    score: args.score,
    feedback: args.feedback,
    complete: args.onComplete,
    presets: { camera: args.cameraPresets, lighting: args.lightingPresets },
    debug: args.debug ?? null,
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- SceneContext`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/SceneContext.ts src/lib/games3d/__tests__/SceneContext.test.ts
git commit -m "feat(games3d): add ScoreController, FeedbackController, and SceneContext factory"
```

---

## Task 12: SceneEngine — core lifecycle and render loop

**Files:**
- Create: `src/lib/games3d/engine/SceneEngine.ts`
- Test: `src/lib/games3d/__tests__/SceneEngine.test.ts`

The engine ties together: scene, camera, renderer, presets, input, audio, asset preload, context creation, render loop, pause/resume on visibility change, and dispose. We avoid mounting a real WebGL renderer in jsdom by allowing renderer injection.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/SceneEngine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createSceneEngine } from '../engine/SceneEngine';
import type { Game3D } from '../types';

class FakeRenderer {
  domElement = document.createElement('canvas');
  setSize = vi.fn();
  setPixelRatio = vi.fn();
  render = vi.fn();
  dispose = vi.fn();
}

function makeGame(): Game3D {
  return {
    meta: {
      id: 'test',
      i18nKey: 'test',
      topic: 'misc',
      difficulty: 1,
      gradeRange: [1, 6],
      estimatedSeconds: 30,
      supportedModes: ['practice'],
    },
    init(ctx) {
      return {
        onFrame: vi.fn(),
        dispose: vi.fn(),
      };
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Mock requestAnimationFrame to step manually
  let rafId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  (globalThis as any).__rafCallbacks = callbacks;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafId++;
    callbacks.set(rafId, cb);
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function step(times = 1): void {
  for (let i = 0; i < times; i++) {
    const cbs = (globalThis as any).__rafCallbacks as Map<number, FrameRequestCallback>;
    const entries = Array.from(cbs.entries());
    cbs.clear();
    entries.forEach(([, cb]) => cb(performance.now()));
  }
}

describe('SceneEngine', () => {
  it('start() calls game.init() and begins rendering', async () => {
    const initSpy = vi.fn(makeGame().init);
    const game: Game3D = { ...makeGame(), init: initSpy };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en',
      isRTL: false,
    });
    await engine.start(game);
    expect(initSpy).toHaveBeenCalledOnce();
    step(2);
    const renderer = engine._debug().renderer as unknown as FakeRenderer;
    expect(renderer.render).toHaveBeenCalled();
  });

  it('onFrame is called each tick with positive dt', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    step(3);
    expect(onFrame).toHaveBeenCalled();
    const [dt] = onFrame.mock.calls[0];
    expect(dt).toBeGreaterThanOrEqual(0);
  });

  it('pause() stops onFrame calls', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    step(1);
    const before = onFrame.mock.calls.length;
    engine.pause();
    step(5);
    expect(onFrame.mock.calls.length).toBe(before);
  });

  it('resume() restarts onFrame calls', async () => {
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: vi.fn() }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    engine.pause();
    onFrame.mockClear();
    engine.resume();
    step(2);
    expect(onFrame).toHaveBeenCalled();
  });

  it('dispose() calls game.dispose and stops loop', async () => {
    const disposeSpy = vi.fn();
    const onFrame = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: () => ({ onFrame, dispose: disposeSpy }),
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
    });
    await engine.start(game);
    engine.dispose();
    expect(disposeSpy).toHaveBeenCalledOnce();
    onFrame.mockClear();
    step(3);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it('completion callback fires when game calls ctx.complete', async () => {
    const onComplete = vi.fn();
    const game: Game3D = {
      ...makeGame(),
      init: (ctx) => {
        setTimeout(() => ctx.complete({ totalPoints: 5, accuracy: 1, durationSec: 1 }), 0);
        return { dispose: vi.fn() };
      },
    };
    const engine = createSceneEngine({
      canvas: document.createElement('canvas'),
      renderer: new FakeRenderer() as unknown as THREE.WebGLRenderer,
      locale: 'en', isRTL: false,
      onComplete,
    });
    await engine.start(game);
    vi.runAllTimers();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ totalPoints: 5 }));
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- SceneEngine`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/engine/SceneEngine.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D, GameInstance, CompleteSummary, ScoreController } from '../types';
import { createInputAdapter, InputAdapterInstance } from './InputAdapter';
import { createAudioManager, preloadSharedSfx } from './AudioManager';
import { createAssetLoader, AssetLoaderInstance } from './AssetLoader';
import { createCameraPresets } from './CameraPresets';
import { createLightingPresets } from './LightingPresets';
import {
  createSceneContext,
  createScoreController,
  createFeedbackController,
  ObservableScore,
  ObservableFeedback,
} from './SceneContext';
import { createPerformanceMonitor } from './PerformanceMonitor';

export interface SceneEngineOptions {
  canvas: HTMLCanvasElement;
  /** Allow renderer injection for testing; in production omit and let engine create one. */
  renderer?: THREE.WebGLRenderer;
  locale: string;
  isRTL: boolean;
  prefersReducedMotion?: boolean;
  onComplete?: (summary: CompleteSummary) => void;
  onScoreChange?: (newValue: number) => void;
  onFeedback?: ObservableFeedback['subscribe'] extends (o: infer O) => unknown ? O : never;
  onLoadProgress?: (fraction: number) => void;
}

export interface SceneEngineInstance {
  start(game: Game3D): Promise<void>;
  pause(): void;
  resume(): void;
  dispose(): void;
  getScoreController(): ScoreController;
  subscribeScore(observer: (newValue: number) => void): () => void;
  subscribeFeedback: ObservableFeedback['subscribe'];
  _debug(): {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  };
}

export function createSceneEngine(opts: SceneEngineOptions): SceneEngineInstance {
  const scene = new THREE.Scene();
  const width = opts.canvas.clientWidth || opts.canvas.width || 800;
  const height = opts.canvas.clientHeight || opts.canvas.height || 600;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

  const renderer =
    opts.renderer ??
    new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const input = createInputAdapter(opts.canvas, camera, scene);
  const audio = createAudioManager();
  const assetLoader: AssetLoaderInstance = createAssetLoader();
  const cameraPresets = createCameraPresets(camera);
  const lightingPresets = createLightingPresets();
  const score: ObservableScore = createScoreController();
  const feedback: ObservableFeedback = createFeedbackController();

  let game: Game3D | null = null;
  let instance: GameInstance | null = null;
  let rafId: number | null = null;
  let lastTime = 0;
  let startTime = 0;
  let isRunning = false;
  let isPaused = false;
  let disposed = false;
  let pixelRatio = renderer.getPixelRatio?.() ?? 1;

  const perfMonitor = createPerformanceMonitor({
    onLowFps: () => {
      instance?.onQualityDowngrade?.('low');
      // After signaling game, the engine itself drops pixelRatio
      if (pixelRatio > 0.75) {
        pixelRatio = 0.75;
        renderer.setPixelRatio?.(pixelRatio);
      }
    },
  });

  function loop(now: number): void {
    if (!isRunning || isPaused || disposed) return;
    const dt = lastTime > 0 ? (now - lastTime) / 1000 : 0;
    const elapsed = (now - startTime) / 1000;
    lastTime = now;
    instance?.onFrame?.(dt, elapsed);
    renderer.render(scene, camera);
    perfMonitor.tick();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    if (rafId !== null) return;
    lastTime = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function onVisibility(): void {
    if (document.hidden) pause();
    else resume();
  }

  function onResize(): void {
    const w = opts.canvas.clientWidth || opts.canvas.width;
    const h = opts.canvas.clientHeight || opts.canvas.height;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    instance?.onResize?.(w, h);
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', pause);
  window.addEventListener('focus', resume);
  window.addEventListener('resize', onResize);

  async function start(g: Game3D): Promise<void> {
    if (game) throw new Error('SceneEngine.start: a game is already running. Dispose first.');
    game = g;

    // Preload assets declared in meta
    if (g.meta.assets) {
      const manifest = g.meta.assets;
      const total =
        (manifest.textures ? Object.keys(manifest.textures).length : 0) +
        (manifest.models ? Object.keys(manifest.models).length : 0);
      let done = 0;
      const reportProgress = () => {
        done++;
        opts.onLoadProgress?.(total > 0 ? done / total : 1);
      };
      if (manifest.textures) {
        await assetLoader.loadTextures(manifest.textures, { onProgress: reportProgress });
      }
      if (manifest.models) {
        await assetLoader.loadModels(manifest.models, { onProgress: reportProgress });
      }
      if (manifest.audio) {
        await Promise.all(
          Object.entries(manifest.audio).map(([k, url]) => audio.preload(k, url))
        );
      }
    }
    await preloadSharedSfx(audio);

    const ctx = createSceneContext({
      scene, camera, renderer,
      input, audio,
      assets: assetLoader.cache,
      locale: opts.locale,
      isRTL: opts.isRTL,
      prefersReducedMotion: opts.prefersReducedMotion ?? false,
      score, feedback,
      onComplete: (summary) => {
        pause();
        opts.onComplete?.(summary);
      },
      cameraPresets, lightingPresets,
    });

    instance = g.init(ctx);
    isRunning = true;
    isPaused = false;
    startTime = performance.now();
    startLoop();
  }

  function pause(): void {
    if (!isRunning || isPaused) return;
    isPaused = true;
    stopLoop();
    instance?.onPause?.();
  }

  function resume(): void {
    if (!isRunning || !isPaused) return;
    isPaused = false;
    instance?.onResume?.();
    startLoop();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    isRunning = false;
    stopLoop();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', pause);
    window.removeEventListener('focus', resume);
    window.removeEventListener('resize', onResize);
    instance?.dispose();
    instance = null;
    input.dispose?.();
    assetLoader.evict();
    if (!opts.renderer) renderer.dispose?.();
    game = null;
  }

  return {
    start, pause, resume, dispose,
    getScoreController: () => score,
    subscribeScore: (o) => score.subscribe(o),
    subscribeFeedback: (o) => feedback.subscribe(o),
    _debug: () => ({ renderer, scene, camera }),
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- SceneEngine`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/engine/SceneEngine.ts src/lib/games3d/__tests__/SceneEngine.test.ts
git commit -m "feat(games3d): add SceneEngine with lifecycle, render loop, and pause/resume"
```

---

## Task 13: i18n — `games3d.json` in all 6 locales

**Files:**
- Create: `messages/en/games3d.json`
- Create: `messages/he/games3d.json`
- Create: `messages/ar/games3d.json`
- Create: `messages/de/games3d.json`
- Create: `messages/es/games3d.json`
- Create: `messages/ru/games3d.json`

These are static JSON, no tests. Verification: `npm run build` succeeds (which exercises next-intl message loading).

- [ ] **Step 1: Create `messages/en/games3d.json`**

```json
{
  "loading": "Loading game…",
  "loadProgress": "{percent}%",
  "mute": "Mute sound",
  "unmute": "Unmute sound",
  "gameLoadError": "The game failed to load.",
  "retry": "Try again",
  "webglNotSupported": "Your browser does not support 3D graphics. Try a more modern browser or device.",
  "frameRateLowNotice": "Reducing quality for smoother gameplay",
  "canary": {
    "title": "Tap the Cube",
    "description": "Developer test game"
  }
}
```

- [ ] **Step 2: Create `messages/he/games3d.json`**

```json
{
  "loading": "טוען משחק…",
  "loadProgress": "{percent}%",
  "mute": "השתק קול",
  "unmute": "הפעל קול",
  "gameLoadError": "טעינת המשחק נכשלה.",
  "retry": "נסה שוב",
  "webglNotSupported": "הדפדפן שלך אינו תומך בגרפיקה תלת-ממדית. נסה דפדפן או מכשיר חדישים יותר.",
  "frameRateLowNotice": "מוריד את האיכות לחוויה חלקה יותר",
  "canary": {
    "title": "לחץ על הקובייה",
    "description": "משחק בדיקה למפתחים"
  }
}
```

- [ ] **Step 3: Create `messages/ar/games3d.json`**

```json
{
  "loading": "جاري تحميل اللعبة…",
  "loadProgress": "{percent}%",
  "mute": "كتم الصوت",
  "unmute": "تشغيل الصوت",
  "gameLoadError": "فشل تحميل اللعبة.",
  "retry": "حاول مرة أخرى",
  "webglNotSupported": "متصفحك لا يدعم الرسومات ثلاثية الأبعاد. جرب متصفحًا أو جهازًا أحدث.",
  "frameRateLowNotice": "تقليل الجودة لتجربة لعب أكثر سلاسة",
  "canary": {
    "title": "اضغط على المكعب",
    "description": "لعبة اختبار للمطورين"
  }
}
```

- [ ] **Step 4: Create `messages/de/games3d.json`**

```json
{
  "loading": "Spiel wird geladen…",
  "loadProgress": "{percent}%",
  "mute": "Ton stummschalten",
  "unmute": "Ton einschalten",
  "gameLoadError": "Das Spiel konnte nicht geladen werden.",
  "retry": "Erneut versuchen",
  "webglNotSupported": "Dein Browser unterstützt keine 3D-Grafik. Probier einen moderneren Browser oder ein neueres Gerät.",
  "frameRateLowNotice": "Qualität wird reduziert für flüssigeres Spielen",
  "canary": {
    "title": "Tippe auf den Würfel",
    "description": "Test-Spiel für Entwickler"
  }
}
```

- [ ] **Step 5: Create `messages/es/games3d.json`**

```json
{
  "loading": "Cargando juego…",
  "loadProgress": "{percent}%",
  "mute": "Silenciar sonido",
  "unmute": "Activar sonido",
  "gameLoadError": "Error al cargar el juego.",
  "retry": "Intentar de nuevo",
  "webglNotSupported": "Tu navegador no admite gráficos 3D. Prueba un navegador o dispositivo más moderno.",
  "frameRateLowNotice": "Reduciendo la calidad para un juego más fluido",
  "canary": {
    "title": "Toca el cubo",
    "description": "Juego de prueba para desarrolladores"
  }
}
```

- [ ] **Step 6: Create `messages/ru/games3d.json`**

```json
{
  "loading": "Загрузка игры…",
  "loadProgress": "{percent}%",
  "mute": "Выключить звук",
  "unmute": "Включить звук",
  "gameLoadError": "Не удалось загрузить игру.",
  "retry": "Попробовать снова",
  "webglNotSupported": "Ваш браузер не поддерживает 3D-графику. Попробуйте более современный браузер или устройство.",
  "frameRateLowNotice": "Снижение качества для более плавной игры",
  "canary": {
    "title": "Нажми на куб",
    "description": "Тестовая игра для разработчиков"
  }
}
```

- [ ] **Step 7: Verify Next.js builds with new namespace**

Run: `npm run build`
Expected: build succeeds. If `next-intl` raises a missing-namespace error, check that `src/i18n/` config loads the `games3d` namespace alongside existing namespaces.

If the project loads namespaces explicitly (check `src/i18n/request.ts` or similar), add `games3d` to the merged messages.

- [ ] **Step 8: Commit**

```bash
git add messages/*/games3d.json
git commit -m "i18n(games3d): add translations for 3D games infrastructure UI"
```

---

## Task 14: Source SFX audio files

**Files:**
- Create: `public/games/_shared/audio/success.ogg`
- Create: `public/games/_shared/audio/fail.ogg`
- Create: `public/games/_shared/audio/click.ogg`
- Create: `public/games/_shared/audio/README.md`

These are binary assets. The engineer should source 3 short, royalty-free SFX matching the criteria below. A README documents the source so the choice can be re-evaluated later.

- [ ] **Step 1: Source three SFX files matching these requirements**

Each file must satisfy:
- **Format:** OGG Vorbis, mono, 44.1 kHz, 96 kbps (file ≤ 20 KB).
- **Duration:** 0.2–0.7 seconds.
- **License:** CC0 / public domain (no attribution required).
- **Character:**
  - `success.ogg`: cheerful, upward melodic chime (e.g., short bell or two ascending notes).
  - `fail.ogg`: gentle, non-harsh descending tone — must NOT be jarring for children.
  - `click.ogg`: short, neutral tap/click — used for UI selection.

Recommended sources:
- https://opengameart.org/content/512-sound-effects-8-bit-style (CC0)
- https://freesound.org/ (filter by CC0)
- https://kenney.nl/assets/category:Audio (CC0)

- [ ] **Step 2: Convert to OGG mono 96 kbps using ffmpeg if needed**

Run for each file:
```bash
ffmpeg -i input.wav -ac 1 -ar 44100 -c:a libvorbis -b:a 96k public/games/_shared/audio/success.ogg
```

Repeat for `fail.ogg` and `click.ogg`.

- [ ] **Step 3: Verify file sizes**

Run: `ls -lh public/games/_shared/audio/`
Expected: 3 files, each ≤ 20 KB.

- [ ] **Step 4: Create `public/games/_shared/audio/README.md`**

```markdown
# Shared SFX

These files are preloaded by `SceneEngine` on every 3D game start.

| File          | Used for                       | Source URL | License |
|---------------|--------------------------------|------------|---------|
| `success.ogg` | Correct answer / score gain    | <fill in>  | CC0     |
| `fail.ogg`    | Wrong answer (not harsh)       | <fill in>  | CC0     |
| `click.ogg`   | Neutral UI selection feedback  | <fill in>  | CC0     |

Format: OGG Vorbis, mono, 44.1 kHz, 96 kbps. Target ≤ 20 KB each.

To replace: source a new file under the same constraints, convert with
`ffmpeg -i input.wav -ac 1 -ar 44100 -c:a libvorbis -b:a 96k output.ogg`, and
update the source URL above.
```

- [ ] **Step 5: Smoke test — play one from the dev server**

Run the dev server and load `/games/_shared/audio/success.ogg` directly in the browser:
```bash
npm run dev
```
Open `http://localhost:3000/games/_shared/audio/success.ogg` — browser should play the sound.

- [ ] **Step 6: Commit**

```bash
git add public/games/_shared/audio/
git commit -m "feat(games3d): add shared SFX (success, fail, click) — CC0"
```

---

## Task 15: WebGLFallback, LoadingScene, GameLoadError, MuteButton components

**Files:**
- Create: `src/components/games3d/WebGLFallback.tsx`
- Create: `src/components/games3d/LoadingScene.tsx`
- Create: `src/components/games3d/GameLoadError.tsx`
- Create: `src/components/games3d/MuteButton.tsx`
- Test: `src/components/games3d/__tests__/Components.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/games3d/__tests__/Components.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { WebGLFallback } from '../WebGLFallback';
import { LoadingScene } from '../LoadingScene';
import { GameLoadError } from '../GameLoadError';
import { MuteButton } from '../MuteButton';

const messages = {
  games3d: {
    loading: 'Loading game…',
    loadProgress: '{percent}%',
    mute: 'Mute sound',
    unmute: 'Unmute sound',
    gameLoadError: 'The game failed to load.',
    retry: 'Try again',
    webglNotSupported: 'Your browser does not support 3D graphics.',
    frameRateLowNotice: 'Reducing quality',
    canary: { title: 'Tap the Cube', description: 'Dev test' },
  },
};

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('WebGLFallback', () => {
  it('renders the not-supported message', () => {
    render(wrap(<WebGLFallback />));
    expect(screen.getByText(/3D graphics/i)).toBeInTheDocument();
  });
});

describe('LoadingScene', () => {
  it('renders loading label', () => {
    render(wrap(<LoadingScene progress={0} />));
    expect(screen.getByText(/Loading game/i)).toBeInTheDocument();
  });

  it('shows progress percentage', () => {
    render(wrap(<LoadingScene progress={0.42} />));
    expect(screen.getByText('42%')).toBeInTheDocument();
  });
});

describe('GameLoadError', () => {
  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(wrap(<GameLoadError onRetry={onRetry} />));
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('MuteButton', () => {
  it('shows mute label when not muted', () => {
    render(wrap(<MuteButton muted={false} onToggle={() => {}} />));
    expect(screen.getByLabelText('Mute sound')).toBeInTheDocument();
  });
  it('shows unmute label when muted', () => {
    render(wrap(<MuteButton muted={true} onToggle={() => {}} />));
    expect(screen.getByLabelText('Unmute sound')).toBeInTheDocument();
  });
  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(wrap(<MuteButton muted={false} onToggle={onToggle} />));
    fireEvent.click(screen.getByLabelText('Mute sound'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- Components`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `WebGLFallback.tsx`**

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function WebGLFallback(): React.ReactElement {
  const t = useTranslations('games3d');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-white">
      <p className="text-lg max-w-md">{t('webglNotSupported')}</p>
    </div>
  );
}
```

- [ ] **Step 4: Implement `LoadingScene.tsx`**

```typescript
'use client';

import { useTranslations } from 'next-intl';

interface Props {
  progress: number; // 0..1
}

export function LoadingScene({ progress }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
      <p className="text-lg">{t('loading')}</p>
      <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-150"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-slate-300" role="status">
        {t('loadProgress', { percent: pct })}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Implement `GameLoadError.tsx`**

```typescript
'use client';

import { useTranslations } from 'next-intl';

interface Props {
  onRetry: () => void;
}

export function GameLoadError({ onRetry }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
      <p className="text-lg">{t('gameLoadError')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
      >
        {t('retry')}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Implement `MuteButton.tsx`**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  muted: boolean;
  onToggle: () => void;
}

export function MuteButton({ muted, onToggle }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const label = muted ? t('unmute') : t('mute');
  const Icon = muted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
```

- [ ] **Step 7: Run test, expect pass**

Run: `npm test -- Components`
Expected: all 7 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/games3d/WebGLFallback.tsx src/components/games3d/LoadingScene.tsx src/components/games3d/GameLoadError.tsx src/components/games3d/MuteButton.tsx src/components/games3d/__tests__/Components.test.tsx
git commit -m "feat(games3d): add WebGLFallback, LoadingScene, GameLoadError, MuteButton"
```

---

## Task 16: OverlayHUD

**Files:**
- Create: `src/components/games3d/OverlayHUD.tsx`
- Test: `src/components/games3d/__tests__/OverlayHUD.test.tsx`

The HUD floats over the canvas. It shows current score, optional timer countdown, and the most recent feedback (correct/wrong/hint) as a transient toast.

- [ ] **Step 1: Write the failing test**

`src/components/games3d/__tests__/OverlayHUD.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { OverlayHUD } from '../OverlayHUD';

const messages = {
  games3d: { loading: 'L', loadProgress: '{percent}%', mute: 'M', unmute: 'U', gameLoadError: 'E', retry: 'R', webglNotSupported: 'W', frameRateLowNotice: 'Q', canary: { title: 'T', description: 'D' } },
  games: { score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' } },
};

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

describe('OverlayHUD', () => {
  it('renders score', () => {
    render(wrap(<OverlayHUD score={7} feedback={null} />));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders feedback message when provided', () => {
    render(wrap(
      <OverlayHUD score={0} feedback={{ kind: 'correct', message: 'Nice!', at: Date.now() }} />
    ));
    expect(screen.getByText('Nice!')).toBeInTheDocument();
  });

  it('does not render feedback when null', () => {
    const { container } = render(wrap(<OverlayHUD score={0} feedback={null} />));
    expect(container.querySelector('[data-testid="feedback-toast"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- OverlayHUD`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/components/games3d/OverlayHUD.tsx`:
```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Check, X, Lightbulb } from 'lucide-react';
import type { FeedbackEvent } from '@/lib/games3d/types';

interface Props {
  score: number;
  feedback: FeedbackEvent | null;
}

const FEEDBACK_STYLES = {
  correct: { Icon: Check, bg: 'bg-emerald-500/90', text: 'text-white' },
  wrong:   { Icon: X,     bg: 'bg-rose-500/90',    text: 'text-white' },
  hint:    { Icon: Lightbulb, bg: 'bg-amber-400/90', text: 'text-slate-900' },
} as const;

export function OverlayHUD({ score, feedback }: Props): React.ReactElement {
  const t = useTranslations('games');
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-stretch p-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 bg-slate-800/70 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">{t('score.score')}: </span>
          <span className="font-semibold tabular-nums">{score}</span>
        </div>
      </div>

      {feedback && (
        <div
          data-testid="feedback-toast"
          className={`mt-auto self-center mb-4 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg ${FEEDBACK_STYLES[feedback.kind].bg} ${FEEDBACK_STYLES[feedback.kind].text}`}
          role="status"
        >
          {(() => {
            const Icon = FEEDBACK_STYLES[feedback.kind].Icon;
            return <Icon className="w-5 h-5" aria-hidden="true" />;
          })()}
          {feedback.message && <span>{feedback.message}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- OverlayHUD`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/games3d/OverlayHUD.tsx src/components/games3d/__tests__/OverlayHUD.test.tsx
git commit -m "feat(games3d): add OverlayHUD with score and feedback toast"
```

---

## Task 17: Canvas3D component

**Files:**
- Create: `src/components/games3d/Canvas3D.tsx`
- Test: `src/components/games3d/__tests__/Canvas3D.test.tsx`

`Canvas3D` is a React component that creates a `SceneEngine`, starts the game on mount, and disposes on unmount. To allow testing without a real WebGL renderer, it accepts an injectable engine factory.

- [ ] **Step 1: Write the failing test**

`src/components/games3d/__tests__/Canvas3D.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Canvas3D } from '../Canvas3D';
import type { Game3D } from '@/lib/games3d/types';

const game: Game3D = {
  meta: {
    id: 'unit', i18nKey: 'unit', topic: 'misc', difficulty: 1,
    gradeRange: [1, 6], estimatedSeconds: 10, supportedModes: ['practice'],
  },
  init: () => ({ dispose: vi.fn() }),
};

describe('Canvas3D', () => {
  it('starts engine on mount', async () => {
    const start = vi.fn(async () => {});
    const dispose = vi.fn();
    const factory = vi.fn(() => ({
      start, dispose, pause: vi.fn(), resume: vi.fn(),
      getScoreController: () => ({ add: vi.fn(), set: vi.fn(), reset: vi.fn(), get: () => 0 }),
      subscribeScore: vi.fn(() => () => {}),
      subscribeFeedback: vi.fn(() => () => {}),
      _debug: () => ({} as any),
    }));
    render(<Canvas3D game={game} locale="en" isRTL={false} engineFactory={factory} />);
    await waitFor(() => expect(start).toHaveBeenCalledWith(game));
  });

  it('disposes engine on unmount', async () => {
    const dispose = vi.fn();
    const factory = vi.fn(() => ({
      start: vi.fn(async () => {}), dispose,
      pause: vi.fn(), resume: vi.fn(),
      getScoreController: () => ({ add: vi.fn(), set: vi.fn(), reset: vi.fn(), get: () => 0 }),
      subscribeScore: vi.fn(() => () => {}),
      subscribeFeedback: vi.fn(() => () => {}),
      _debug: () => ({} as any),
    }));
    const { unmount } = render(<Canvas3D game={game} locale="en" isRTL={false} engineFactory={factory} />);
    await waitFor(() => expect(factory).toHaveBeenCalled());
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- Canvas3D`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/components/games3d/Canvas3D.tsx`:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import {
  createSceneEngine,
  SceneEngineInstance,
  SceneEngineOptions,
} from '@/lib/games3d/engine/SceneEngine';
import type { Game3D, CompleteSummary, FeedbackEvent } from '@/lib/games3d/types';

interface Props {
  game: Game3D;
  locale: string;
  isRTL: boolean;
  onComplete?: (summary: CompleteSummary) => void;
  onScore?: (score: number) => void;
  onFeedback?: (event: FeedbackEvent) => void;
  onLoadProgress?: (fraction: number) => void;
  onError?: (err: unknown) => void;
  /** For testing: inject a fake engine factory. */
  engineFactory?: (opts: SceneEngineOptions) => SceneEngineInstance;
}

export function Canvas3D({
  game,
  locale,
  isRTL,
  onComplete,
  onScore,
  onFeedback,
  onLoadProgress,
  onError,
  engineFactory,
}: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngineInstance | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
      : false;

    const factory = engineFactory ?? createSceneEngine;
    const engine = factory({
      canvas,
      locale,
      isRTL,
      prefersReducedMotion,
      onComplete,
      onLoadProgress,
    });
    engineRef.current = engine;

    const unsubScore = onScore ? engine.subscribeScore(onScore) : () => {};
    const unsubFeedback = onFeedback ? engine.subscribeFeedback(onFeedback) : () => {};

    engine.start(game).catch((err) => onError?.(err));

    return () => {
      unsubScore();
      unsubFeedback();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none select-none"
      aria-label={`Game canvas: ${game.meta.id}`}
    />
  );
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- Canvas3D`
Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/games3d/Canvas3D.tsx src/components/games3d/__tests__/Canvas3D.test.tsx
git commit -m "feat(games3d): add Canvas3D React wrapper for SceneEngine"
```

---

## Task 18: Game3DShell component

**Files:**
- Create: `src/components/games3d/Game3DShell.tsx`
- Test: `src/components/games3d/__tests__/Game3DShell.test.tsx`

`Game3DShell` wraps the existing `GameShell`, renders `Canvas3D` + `OverlayHUD` + `MuteButton`, manages WebGL fallback, loading, error, and completion summary states. It is the public entry point a game route uses.

- [ ] **Step 1: Write the failing test**

`src/components/games3d/__tests__/Game3DShell.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Game3DShell } from '../Game3DShell';
import type { Game3D } from '@/lib/games3d/types';

const messages = {
  games3d: { loading: 'Loading game…', loadProgress: '{percent}%', mute: 'Mute', unmute: 'Unmute', gameLoadError: 'Error', retry: 'Retry', webglNotSupported: 'Not supported', frameRateLowNotice: 'Q', canary: { title: 'Tap the Cube', description: 'Dev' } },
  games: { shell: { backToGames: 'Back', home: 'Home' }, score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' } },
};

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

const game: Game3D = {
  meta: { id: 'x', i18nKey: 'canary', topic: 'misc', difficulty: 1, gradeRange: [1, 6], estimatedSeconds: 10, supportedModes: ['practice'] },
  init: () => ({ dispose: vi.fn() }),
};

describe('Game3DShell', () => {
  it('renders WebGL fallback when WebGL unavailable', () => {
    render(wrap(<Game3DShell game={game} title="Test" webGLAvailable={false} />));
    expect(screen.getByText(/Not supported/i)).toBeInTheDocument();
  });

  it('renders mute button when WebGL available', () => {
    render(wrap(<Game3DShell game={game} title="Test" webGLAvailable={true} />));
    expect(screen.getByLabelText(/Mute|Unmute/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- Game3DShell`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/components/games3d/Game3DShell.tsx`:
```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import GameShell from '@/components/game/GameShell';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { Canvas3D } from './Canvas3D';
import { OverlayHUD } from './OverlayHUD';
import { MuteButton } from './MuteButton';
import { WebGLFallback } from './WebGLFallback';
import { LoadingScene } from './LoadingScene';
import { GameLoadError } from './GameLoadError';
import type { CompleteSummary, FeedbackEvent, Game3D } from '@/lib/games3d/types';
import { getMutePreference, setMutePreference } from '@/lib/game/storage';

interface Props {
  game: Game3D;
  title: string;
  webGLAvailable: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  onComplete?: (summary: CompleteSummary) => void;
  onExit?: () => void;
}

const RTL_LOCALES = new Set(['he', 'ar']);

export function Game3DShell({
  game, title, webGLAvailable, breadcrumbItems, onComplete, onExit,
}: Props): React.ReactElement {
  const locale = useLocale();
  const isRTL = RTL_LOCALES.has(locale);

  const [muted, setMuted] = useState<boolean>(() => getMutePreference());
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Auto-dismiss feedback toasts after 1.4s
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setMutePreference(next);
      return next;
    });
  }, []);

  const handleLoadProgress = useCallback((f: number) => {
    setProgress(f);
    if (f >= 1) setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoaded(false);
    setProgress(0);
    setReloadKey((k) => k + 1);
  }, []);

  const topBar = webGLAvailable ? (
    <MuteButton muted={muted} onToggle={toggleMute} />
  ) : undefined;

  return (
    <GameShell title={title} breadcrumbItems={breadcrumbItems} onExit={onExit} topBar={topBar}>
      {!webGLAvailable ? (
        <WebGLFallback />
      ) : error ? (
        <GameLoadError onRetry={handleRetry} />
      ) : (
        <div className="relative flex-1 min-h-[60vh]">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <LoadingScene progress={progress} />
            </div>
          )}
          <Canvas3D
            key={reloadKey}
            game={game}
            locale={locale}
            isRTL={isRTL}
            onScore={setScore}
            onFeedback={setFeedback}
            onComplete={onComplete}
            onLoadProgress={handleLoadProgress}
            onError={handleError}
          />
          <OverlayHUD score={score} feedback={feedback} />
        </div>
      )}
    </GameShell>
  );
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- Game3DShell`
Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/games3d/Game3DShell.tsx src/components/games3d/__tests__/Game3DShell.test.tsx
git commit -m "feat(games3d): add Game3DShell wrapping GameShell, Canvas3D, and HUD"
```

---

## Task 19: Registry stub

**Files:**
- Create: `src/lib/games3d/registry.ts`
- Test: `src/lib/games3d/__tests__/registry.test.ts`

The registry is intentionally minimal — populated by sub-project #2 (catalog). This task just creates the interface and an empty default registry so future games can register without changing imports later.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/__tests__/registry.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { gameRegistry, registerGame, getGame, listGames } from '../registry';
import type { Game3D } from '../types';

describe('gameRegistry', () => {
  it('starts empty', () => {
    expect(listGames()).toEqual([]);
  });

  it('registers and retrieves a game', () => {
    const g: Game3D = {
      meta: { id: 'foo', i18nKey: 'foo', topic: 'misc', difficulty: 1, gradeRange: [1,6], estimatedSeconds: 10, supportedModes: ['practice'] },
      init: () => ({ dispose: () => {} }),
    };
    registerGame(g);
    expect(getGame('foo')).toBe(g);
    expect(listGames()).toContain(g);
    gameRegistry.clear();
  });

  it('throws when registering duplicate id', () => {
    const g: Game3D = {
      meta: { id: 'dup', i18nKey: 'x', topic: 'misc', difficulty: 1, gradeRange: [1,6], estimatedSeconds: 10, supportedModes: ['practice'] },
      init: () => ({ dispose: () => {} }),
    };
    registerGame(g);
    expect(() => registerGame(g)).toThrow(/already registered/);
    gameRegistry.clear();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- registry`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/registry.ts`:
```typescript
import type { Game3D } from './types';

export const gameRegistry = new Map<string, Game3D>();

export function registerGame(game: Game3D): void {
  if (gameRegistry.has(game.meta.id)) {
    throw new Error(`Game with id "${game.meta.id}" is already registered`);
  }
  gameRegistry.set(game.meta.id, game);
}

export function getGame(id: string): Game3D | undefined {
  return gameRegistry.get(id);
}

export function listGames(): Game3D[] {
  return Array.from(gameRegistry.values());
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- registry`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/registry.ts src/lib/games3d/__tests__/registry.test.ts
git commit -m "feat(games3d): add minimal game registry"
```

---

## Task 20: Canary game and dev-only route

**Files:**
- Create: `src/app/[locale]/play/_canary/CanaryGame.tsx`
- Create: `src/app/[locale]/play/_canary/page.tsx`

The canary is dev-only. The route guards via `process.env.NODE_ENV !== 'development'` and returns `notFound()` in production.

- [ ] **Step 1: Implement `CanaryGame.tsx`**

`src/app/[locale]/play/_canary/CanaryGame.tsx`:
```typescript
'use client';

import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';

export const canaryGame: Game3D = {
  meta: {
    id: 'canary-tap-cube',
    i18nKey: 'games3d.canary',
    topic: 'misc',
    difficulty: 1,
    gradeRange: [1, 6],
    estimatedSeconds: 30,
    supportedModes: ['practice'],
  },

  init(ctx) {
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0, 0), 5);
    ctx.presets.lighting.daylight(ctx.scene);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f46e5 });
    const cube = new THREE.Mesh(geo, mat);
    ctx.scene.add(cube);

    let points = 0;
    const startTime = performance.now();

    const off = ctx.input.on('tap', (p) => {
      if (p.picked === cube) {
        points++;
        ctx.score.add(1);
        ctx.audio.play('success');
        ctx.feedback.correct('+1');
        mat.color.setHex(Math.floor(Math.random() * 0xffffff));
        if (points >= 5) {
          const durationSec = (performance.now() - startTime) / 1000;
          ctx.complete({ totalPoints: points, accuracy: 1, durationSec });
        }
      } else {
        ctx.audio.play('click');
        ctx.feedback.hint('Tap the cube');
      }
    });

    return {
      onFrame(dt) {
        cube.rotation.y += dt * 0.5;
        cube.rotation.x += dt * 0.2;
      },
      dispose() {
        off();
        ctx.scene.remove(cube);
        geo.dispose();
        mat.dispose();
      },
    };
  },
};
```

- [ ] **Step 2: Implement dev-only route**

`src/app/[locale]/play/_canary/page.tsx`:
```typescript
import { notFound } from 'next/navigation';
import { hasWebGL } from '@/lib/games3d/engine/WebGLCheck';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { canaryGame } from './CanaryGame';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CanaryPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games3d.canary' });
  // hasWebGL must be evaluated client-side, but we render the shell server-side
  // and the WebGLFallback is shown if the value is false at hydration.
  return (
    <Game3DShell
      game={canaryGame}
      title={t('title')}
      webGLAvailable={true}
      breadcrumbItems={[
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/play' },
        { label: t('title') },
      ]}
    />
  );
}
```

Note: `hasWebGL()` cannot run in a Server Component (no `document`). For the canary, we render the shell with `webGLAvailable=true` and let `Canvas3D` itself surface errors via `onError` if the WebGL context fails. A real production game route can wrap the shell in a Client Component that checks `hasWebGL()` on mount and passes the value as a prop.

- [ ] **Step 3: Verify it runs in dev**

Run: `npm run dev`
Open: `http://localhost:3000/play/_canary`
Expected: A rotating purple cube appears. Tapping it 5 times increments the score and triggers `complete()` (game pauses).

Manual verification checklist:
- [ ] Cube renders and rotates smoothly (60fps in DevTools Performance tab).
- [ ] Tap on cube increments score in HUD.
- [ ] Tap off cube shows "Tap the cube" hint toast.
- [ ] Mute button toggles audio (no SFX after muting).
- [ ] Switching browser tab pauses the cube (no rotation).
- [ ] Returning to the tab resumes rotation.
- [ ] Resizing the window resizes the canvas without distortion.
- [ ] Verify route returns 404 in production: `npm run build && NODE_ENV=production npm run start`, then open `http://localhost:3000/play/_canary` — should 404.

- [ ] **Step 4: Run the unit test suite to confirm no regressions**

Run: `npm test -- --run`
Expected: all tests PASS.

- [ ] **Step 5: Memory leak check**

In Chrome DevTools, open `/play/_canary`, take a heap snapshot, navigate away (e.g., to `/`), navigate back, repeat 5 times. Take a final heap snapshot. JS heap should not grow significantly between the first and last snapshots (a few hundred KB drift is noise; tens of MB indicates a leak).

Document the result in a brief note in `docs/games/HOW-TO-ADD-A-3D-GAME.md` (created in Task 22).

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/play/_canary/
git commit -m "feat(games3d): add canary game and dev-only route"
```

---

## Task 21: Perf benchmark script

**Files:**
- Create: `scripts/games3d-perf.ts`
- Modify: `package.json` (add script)

The perf benchmark runs the canary in headless Chrome for 60s and reports avg/p95 fps and heap delta. It uses Puppeteer.

- [ ] **Step 1: Add Puppeteer as devDependency**

In `package.json` devDependencies:
```json
    "puppeteer": "^23.0.0",
    "tsx": "^4.19.0",
```

In `scripts`:
```json
    "perf:games3d": "tsx scripts/games3d-perf.ts"
```

Run: `npm install`

- [ ] **Step 2: Implement `scripts/games3d-perf.ts`**

```typescript
import puppeteer from 'puppeteer';

const URL = process.env.PERF_URL ?? 'http://localhost:3000/play/_canary';
const DURATION_MS = Number(process.env.PERF_DURATION_MS ?? 60_000);

async function run(): Promise<void> {
  console.log(`Perf benchmark: ${URL} for ${DURATION_MS}ms`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  await page.goto(URL, { waitUntil: 'networkidle2' });

  // Inject frame counter
  await page.evaluate(() => {
    (window as any).__frameTimes = [] as number[];
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      (window as any).__frameTimes.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Take initial heap measurement
  const initialHeap = (await page.metrics()).JSHeapUsedSize ?? 0;

  await new Promise((r) => setTimeout(r, DURATION_MS));

  const frameTimes: number[] = await page.evaluate(() => (window as any).__frameTimes);
  const finalHeap = (await page.metrics()).JSHeapUsedSize ?? 0;

  await browser.close();

  if (frameTimes.length < 10) {
    console.error(`Too few frames recorded (${frameTimes.length}) — page may not have rendered.`);
    process.exit(1);
  }

  // Drop the first frame (warmup)
  const fpsValues = frameTimes.slice(1).map((dt) => 1000 / dt).filter((f) => Number.isFinite(f));
  fpsValues.sort((a, b) => a - b);
  const avg = fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length;
  const p95Index = Math.floor(fpsValues.length * 0.05); // bottom 5% (slow frames)
  const p95Low = fpsValues[p95Index];
  const heapDeltaMB = (finalHeap - initialHeap) / (1024 * 1024);

  console.log(`Frames captured: ${fpsValues.length}`);
  console.log(`Avg fps:          ${avg.toFixed(1)}`);
  console.log(`p95-low fps:      ${p95Low.toFixed(1)} (5th percentile worst frames)`);
  console.log(`Heap delta:       ${heapDeltaMB.toFixed(2)} MB`);

  // Soft thresholds — log warnings, don't fail by default
  if (avg < 55) console.warn(`⚠ Avg fps below 55 target`);
  if (p95Low < 30) console.warn(`⚠ p95-low fps below 30 floor`);
  if (heapDeltaMB > 20) console.warn(`⚠ Heap grew by >20MB — investigate leaks`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Smoke-test the benchmark**

In one terminal: `npm run dev`
In another: `npm run perf:games3d -- PERF_DURATION_MS=10000`

Expected output:
```
Perf benchmark: http://localhost:3000/play/_canary for 10000ms
Frames captured: ~600
Avg fps:          ~60.0
p95-low fps:      ~58.0
Heap delta:       <5 MB
```

If avg fps is significantly below 60 in headless Chrome, this is a red flag — investigate before sub-project #3.

- [ ] **Step 4: Commit**

```bash
git add scripts/games3d-perf.ts package.json package-lock.json
git commit -m "chore(games3d): add Puppeteer perf benchmark script"
```

---

## Task 22: Documentation — HOW-TO-ADD-A-3D-GAME

**Files:**
- Create: `docs/games/HOW-TO-ADD-A-3D-GAME.md` (English)
- Create: `docs/games/HOW-TO-ADD-A-3D-GAME.he.md` (Hebrew)

- [ ] **Step 1: Create the English guide**

`docs/games/HOW-TO-ADD-A-3D-GAME.md`:
```markdown
# How to Add a 3D Game

This guide explains how to add a new 3D learning game to `tirgul.net` using the games3d infrastructure.

## Prerequisites
- Familiarity with Three.js basics (Scene, Mesh, Material, Camera).
- The infrastructure (sub-project #1) is installed: see `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`.

## Steps

### 1. Pick an `id` and `i18nKey`
- `id` is the URL slug (kebab-case): e.g., `triangle-drag`.
- `i18nKey` is the translation namespace key: e.g., `games3d.triangleDrag`.

### 2. Add translations
Add an entry per locale in `messages/{locale}/games3d.json`:
```json
{
  "triangleDrag": {
    "title": "Drag the Triangle",
    "description": "Drag the triangle to match the outline",
    "instructions": "Use one finger to drag the triangle into the dotted shape"
  }
}
```

### 3. Implement the game
Create `src/lib/games3d/games/triangle-drag/TriangleDragGame.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';

export const triangleDragGame: Game3D = {
  meta: {
    id: 'triangle-drag',
    i18nKey: 'games3d.triangleDrag',
    topic: 'geometry',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 60,
    supportedModes: ['practice'],
  },
  init(ctx) {
    // Set up camera, lighting
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 8);
    ctx.presets.lighting.soft(ctx.scene);

    // Create your meshes, geometries, materials...
    // Wire up input via ctx.input.on('drag', ...)
    // Call ctx.score.add(N), ctx.feedback.correct(), ctx.audio.play('success')
    // When done: ctx.complete({ totalPoints, accuracy, durationSec })

    return {
      onFrame(dt, elapsed) { /* animate */ },
      dispose() {
        // CRITICAL: dispose every geometry, material, texture you created,
        // remove every mesh you added to the scene, and unsubscribe every input listener.
      },
    };
  },
};
```

### 4. Create the route
Create `src/app/[locale]/play/triangle-drag/page.tsx`:
```typescript
import { getTranslations } from 'next-intl/server';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { triangleDragGame } from '@/lib/games3d/games/triangle-drag/TriangleDragGame';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games3d.triangleDrag' });
  return (
    <Game3DShell game={triangleDragGame} title={t('title')} webGLAvailable={true} />
  );
}
```

### 5. Register the game (optional, for catalog)
In a future catalog file:
```typescript
import { registerGame } from '@/lib/games3d/registry';
import { triangleDragGame } from '@/lib/games3d/games/triangle-drag/TriangleDragGame';
registerGame(triangleDragGame);
```

## Dispose checklist (DO NOT skip)

Every resource your game creates after `init()` must be released in `dispose()`. Three.js does not garbage-collect WebGL resources automatically.

For each `THREE.Mesh` you added:
- `scene.remove(mesh)`
- `mesh.geometry.dispose()`
- `mesh.material.dispose()` (or each material in an array)

For each texture you loaded yourself (not via `ctx.assets`):
- `texture.dispose()`

For each event listener registered via `ctx.input.on(...)`:
- Call the returned `Unsubscribe` function.

For any custom `setInterval`/`setTimeout`/`requestAnimationFrame` you started:
- Clear/cancel it.

If you skip dispose, you will leak GPU memory. After a few game switches the page will crash on mid-range devices.

## Performance budget

Aim for:
- ≤ 50,000 triangles in the scene at any time.
- ≤ 8 lights total.
- Shadow maps disabled unless essential.
- Texture sizes ≤ 1024×1024.
- One material per visually-distinct object (don't duplicate `MeshStandardMaterial` for clones — instance the material).

If the engine fires `onQualityDowngrade('low')`, your game should reduce detail (hide decorative meshes, drop particle counts).

## Accessibility checklist

- All UI text via `useTranslations('games3d.<yourKey>')` — never hardcode.
- For correct/wrong feedback, always use color + icon + sound + i18n message.
- Don't rely on color alone — pair every color cue with a shape, pattern, or label.
- Honor `ctx.prefersReducedMotion` — skip or slow down decorative animations.

## Testing your game

Manual verification at minimum:
- [ ] 60fps in Chrome DevTools Performance tab on your dev machine.
- [ ] Tap/drag responds correctly on touch (use Chrome's mobile emulation).
- [ ] Mute button silences your audio.
- [ ] Navigate to your game, navigate away, repeat 5 times — no JS heap growth.
- [ ] Switch to a different browser tab — game pauses; return — game resumes.

## Sourcing assets

Place per-game assets under `public/games/<game-id>/`. Declare them in `meta.assets`:
```typescript
assets: {
  textures: { brick: '/games/triangle-drag/brick.png' },
  models:   { house: '/games/triangle-drag/house.glb' },
  audio:    { magic: '/games/triangle-drag/magic.ogg' },
}
```

The engine preloads all declared assets before calling `init()`. Use only CC0 / public-domain assets.

## Common pitfalls

- **Calling `ctx.scene.add(mesh)` in `onFrame`**: this leaks. Add objects in `init`, not in the render loop.
- **Forgetting `dispose()` on a material**: the cheapest leak to introduce; the hardest to detect.
- **Mutating `ctx.camera` outside of `presets`**: presets reposition the camera; direct mutation may break framing on resize.
- **Hardcoded English/Hebrew strings**: every visible string must come from translations.
```

- [ ] **Step 2: Create the Hebrew guide**

`docs/games/HOW-TO-ADD-A-3D-GAME.he.md`:
```markdown
# איך להוסיף משחק תלת-ממדי

מדריך זה מסביר איך להוסיף משחק לימוד תלת-ממדי חדש לאתר `tirgul.net` באמצעות תשתית games3d.

## דרישות מקדימות
- היכרות עם בסיסי Three.js (Scene, Mesh, Material, Camera).
- התשתית (תת-פרויקט #1) מותקנת — ראה `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`.

## שלבים

### 1. בחר `id` ו-`i18nKey`
- `id` — slug של ה-URL (kebab-case): למשל `triangle-drag`.
- `i18nKey` — מפתח namespace לתרגום: למשל `games3d.triangleDrag`.

### 2. הוסף תרגומים
הוסף ערך לכל locale ב-`messages/{locale}/games3d.json`:
```json
{
  "triangleDrag": {
    "title": "גרור את המשולש",
    "description": "גרור את המשולש כדי להתאים למתאר",
    "instructions": "השתמש באצבע אחת לגרור את המשולש לתוך הצורה המקווקווית"
  }
}
```

### 3. מימוש המשחק
צור את `src/lib/games3d/games/triangle-drag/TriangleDragGame.ts` (ראה תבנית במדריך באנגלית).

### 4. צור route
ראה תבנית במדריך באנגלית.

### 5. רשום את המשחק (אופציונלי, לקטלוג עתידי)
ראה דוגמה במדריך באנגלית.

## רשימת dispose (אסור לדלג!)

כל משאב שהמשחק שלך יוצר אחרי `init()` חייב להשתחרר ב-`dispose()`. Three.js **לא** מנקה משאבי WebGL אוטומטית.

לכל `THREE.Mesh` שהוספת:
- `scene.remove(mesh)`
- `mesh.geometry.dispose()`
- `mesh.material.dispose()` (או כל חומר במערך)

לכל texture שטענת בעצמך (לא דרך `ctx.assets`):
- `texture.dispose()`

לכל listener שרשמת דרך `ctx.input.on(...)`:
- קרא לפונקציית ה-`Unsubscribe` המוחזרת.

לכל `setInterval` / `setTimeout` / `requestAnimationFrame` שלך:
- בטל אותם.

אם תדלג על dispose — תיווצר דליפת זיכרון GPU. אחרי כמה החלפות משחק העמוד יקרוס במכשירים בינוניים.

## תקציב ביצועים

יעד:
- עד 50,000 משולשים בסצנה בו-זמנית.
- עד 8 מקורות אור.
- צללים מבוטלים אלא אם חיוניים.
- גודל texture עד 1024×1024.
- material אחד לכל אובייקט שונה ויזואלית — אל תכפיל materials לעותקים, השתמש באותו instance.

אם המנוע משדר `onQualityDowngrade('low')` — המשחק שלך צריך להפחית פירוט (להסתיר רשתות דקורטיביות, להוריד כמות חלקיקים).

## רשימת נגישות

- כל טקסט UI דרך `useTranslations('games3d.<yourKey>')` — לעולם לא לקודד טקסט בקוד.
- למשוב נכון/שגוי השתמש תמיד בצבע + אייקון + צליל + הודעה מתורגמת.
- אל תסתמך על צבע בלבד — צמד כל רמז צבעוני עם צורה, דפוס או תווית.
- כבד את `ctx.prefersReducedMotion` — דלג או האט אנימציות דקורטיביות.

## בדיקת המשחק

לפחות בדיקה ידנית:
- [ ] 60fps ב-Chrome DevTools Performance על מחשב הפיתוח.
- [ ] tap/drag מגיב נכון במגע (השתמש ב-mobile emulation של Chrome).
- [ ] כפתור mute משתיק את האודיו שלך.
- [ ] נווט למשחק, נווט החוצה, חזור — 5 פעמים. ה-JS heap לא גדל.
- [ ] עבור ל-tab אחר — המשחק עוצר. חזור — ממשיך.

## מקור נכסים

מקם נכסים פר-משחק תחת `public/games/<game-id>/`. הצהר עליהם ב-`meta.assets` (ראה דוגמה באנגלית).

המנוע טוען מראש את כל הנכסים שהוצהרו לפני קריאה ל-`init()`. השתמש רק בנכסי CC0 / נחלת הכלל.

## טעויות נפוצות

- **קריאה ל-`ctx.scene.add(mesh)` בתוך `onFrame`**: דליפה. הוסף אובייקטים ב-`init`, לא בלולאת הרינדור.
- **שכחת `dispose()` על חומר**: הדליפה הקלה ביותר להוסיף, הקשה ביותר לאיתור.
- **שינוי `ctx.camera` ישירות מחוץ ל-`presets`**: ה-presets ממקמים את המצלמה; שינוי ישיר יכול לשבור את ה-framing ב-resize.
- **טקסט באנגלית/עברית קשיח**: כל מחרוזת גלויה חייבת לבוא מתרגומים.
```

- [ ] **Step 3: Commit**

```bash
git add docs/games/
git commit -m "docs(games3d): add HOW-TO-ADD-A-3D-GAME guides (EN + HE)"
```

---

## Task 23: Final integration verification

**Files:** None (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test -- --run`
Expected: all tests PASS. Document the final count in the next step's commit message.

- [ ] **Step 2: Coverage check**

Run: `npm run test:coverage`
Expected: `lib/games3d/` and `components/games3d/` ≥ 80% lines/functions/statements, ≥ 70% branches.

If any file is below threshold, add tests for the uncovered code before continuing.

- [ ] **Step 3: TypeScript strict check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 errors. Warnings about existing code unrelated to games3d are acceptable; warnings on new code should be addressed.

- [ ] **Step 5: Production build**

Run: `npm run build`
Expected: build succeeds. Inspect the bundle output — `/play/_canary` route should be present in dev but NOT in the production manifest (the route guard returns `notFound()` at runtime, but the page still compiles).

- [ ] **Step 6: Bundle size check**

Run: `npm run build` and inspect the build output for the canary route's First Load JS size.
Expected: significantly smaller than the home route plus ~150–200KB for three+engine. Worksheet routes (`/worksheet/math`, `/fractions`, etc.) should be **unchanged** from before this work — verify by checking the build output table.

- [ ] **Step 7: Manual perf smoke test on a real device**

Connect a real iPad (2020+) or iPhone (11+) via USB and open the canary in mobile Safari pointing at your dev machine.
Expected: smooth 60fps, no jank, audio plays, tap works.

- [ ] **Step 8: Final commit and tag**

```bash
git add -A
git status   # ensure nothing unintended
git commit --allow-empty -m "chore(games3d): infrastructure sub-project #1 complete"
git tag games3d-infra-v1
```

(Push and tag only if the user requests it — do not push autonomously.)

---

## Spec coverage check (self-review)

Cross-referencing the spec sections to plan tasks:

- §2 Goals (Game3D interface, registry, canary, memory, perf, bundle): Tasks 2, 19, 20, 23.
- §3 Non-goals: enforced by scope; no tasks (this is what we are *not* doing).
- §4 Decisions table: encoded throughout (three.js, localStorage, HTML overlay, touch a11y, audio, scene engine).
- §5 Future scope context: encoded in `GameTopic3D` enum (Task 2) and HOW-TO topic field (Task 22).
- §6 Architecture overview: realized in Tasks 17, 18.
- §7 Module layout: Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9–10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22.
- §8 Core API (Game3D, SceneContext, InputAdapter, canary): Tasks 2, 9, 10, 11, 12, 20.
- §9.1 Render loop & performance (frame budget, pause, dispose enforcement): Task 12 (dispose enforcement is implemented via `assetLoader.evict()` + `instance.dispose()`; the dev-mode resource-tracking proxy from spec §9.1 is left as a future hardening — see "Plan note" below).
- §9.2 Audio: Tasks 5, 14.
- §9.3 Assets: Task 6.
- §9.4 Persistence: Task 4.
- §9.5 i18n + RTL: Task 13 + uses throughout components (Tasks 15, 16, 18).
- §9.6 Accessibility: Tasks 15 (responsive text), 16 (redundant cues in HUD), 18 (mute persistence), 22 (HOW-TO checklist).
- §9.7 Testing: every implementation task includes vitest tests; perf benchmark in Task 21; manual verification in Task 20 and 23.
- §9.8 Dependencies: Tasks 1 and 21.
- §10 Risks: bundle lazy-split is the responsibility of game-route consumers (documented in Task 22); audio iOS unlock in Task 5; reduced-motion via `ctx.prefersReducedMotion` in Tasks 11 and 17.
- §11 Implementation phasing: this plan reorders for TDD-friendliness but covers every phased item.
- §12 Deferred decisions: registry is created empty (Task 19); achievements, auth, service worker, E2E — explicitly out of scope.

**Plan note** — the dev-mode dispose-enforcement *proxy* described in spec §9.1 (intercepting `THREE.BufferGeometry`/`Material`/`Texture` constructors to track per-game allocations) is intentionally deferred. The current plan relies on `assetLoader.evict()` plus the `dispose()` discipline documented in the HOW-TO. If during sub-project #3 we find dispose leaks reaching production, a follow-up task should add the constructor-wrapping tracker. This is a calculated tradeoff to keep the MVP focused.

## Placeholder scan

Searched for: TBD, TODO, "fill in", "implement later", "similar to Task N", "add appropriate", "handle edge cases". Findings:
- `public/games/_shared/audio/README.md` template has `<fill in>` placeholders for source URLs — this is correct (the engineer fills them in when sourcing).
- No other placeholders.

## Type consistency

Spot-checked method signatures across tasks:
- `ctx.score.add(n)` — Task 2 defines `add(points: number): void`; Tasks 11, 20 use `score.add(...)`. ✅
- `ctx.feedback.correct(message?)` — Task 2, used in Tasks 11, 20. ✅
- `ctx.audio.play(key)` and `play(key, url)` — Task 2 declares overloads; Tasks 5, 20 use both. ✅
- `engine.subscribeScore(observer)` returns `() => void` — Tasks 11, 12, 17. ✅
- `createSceneEngine(opts)` accepts `engineFactory`-injectable shape used in Tasks 17 tests and matches export from Task 12. ✅
- `getMutePreference()` / `setMutePreference()` — Task 4 defines, Tasks 5, 18 use. ✅

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-24-three-js-games-infrastructure.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch with checkpoints for review.
