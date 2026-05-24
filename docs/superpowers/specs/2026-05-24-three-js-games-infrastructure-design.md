# Three.js Games Infrastructure — Design Spec

**Date:** 2026-05-24
**Author:** brainstorming session (asaf + Claude)
**Status:** Approved (pending user review of this written spec)
**Sub-project:** #1 of 5 in the broader "3D Learning Games" initiative

---

## 1. Context & Motivation

`tirgul.net` (math-portal) is a multilingual (he, en, ar, de, es, ru) Hebrew-first educational platform for math worksheets and games for grades 1–6. It already has a `/play` section with 3 text/input-based games (`math`, `fractions`, `percentage`) built on a reusable `GameShell` + `game-engine.ts` foundation.

The product wants to expand `/play` into a **broad portfolio of interactive 3D learning games**, mobile-first (iPads, phones), in all supported languages. A child should be able to open the site on an iPad and learn geometry, arithmetic, fractions, word problems, ratios, units of measurement, series — through *playing*, not through worksheets.

This spec covers **only the infrastructure** required to make building such games sustainable. No real games are delivered here. The infrastructure is sub-project #1 of a decomposed roadmap:

1. **Three.js Games Infrastructure** ← *this spec*
2. Game catalog & discovery (upgraded `/play`)
3. First batch of real games (3–5)
4. Curriculum mapping (games ↔ grades)
5. Cross-game progression/achievements (deferred; depends on later sign-in decisions)

## 2. Goals

**Primary goal:** A new 3D game can be built in ~150–300 lines of game-specific code, runs at a smooth 60fps on modern iPads/phones (2020+), looks polished, is fully localized into all 6 languages with no per-game i18n work, lazy-loaded (does not bloat the rest of the site), and shipped via a single contract.

**Success criteria:**
- Adding a new game requires implementing one interface (`Game3D`) and registering it. No engine forking.
- A "canary" game (developer-only, not user-facing) runs end-to-end through the entire stack — render, input, audio, scoring, completion, dispose — proving the contract.
- Memory: navigating between 10 game mounts/unmounts in a single session shows no JS heap growth beyond noise (verified manually in Chrome DevTools).
- Performance: canary holds 60fps on iPad 2020+ / iPhone 11+. Older devices (iPad 2019, pre-2020 Android) degrade gracefully via the quality-downgrade path; ≥30fps is the soft floor but not a hard target — devices that can't keep up get a low-quality experience or the WebGL fallback message.
- Bundle: Three.js + engine code adds ~150–200KB gzipped to *only* the `/play/<game-id>` routes (lazy split). Worksheet pages and existing text-based `/play` games remain unchanged in size.

## 3. Non-goals (out of scope)

- **No real games** delivered (sub-project #3).
- **No catalog upgrade** of `/play` to support 20+ games (sub-project #2).
- **No curriculum mapping** (sub-project #4).
- **No cross-game achievements / cross-device progression** (sub-project #5).
- **No authentication, cloud sync, leaderboards.** Persistence is `localStorage` only.
- **No screen reader support for 3D scenes.** A11y floor is touch + responsive text + color-blind safe + redundant cues. (Keyboard nav and WCAG AA full compliance are out of scope.)
- **No service-worker asset caching.** Browser cache only.
- **No physics engine, no post-processing, no particle systems.** A game that needs these can lazy-load its own libs.

## 4. Decisions made during brainstorm (constraints)

| Decision | Choice | Why |
|---|---|---|
| Rendering library | `three` (vanilla, not R3F/Drei) | Bundle budget, full perf control, no React reconciler in render loop |
| Performance baseline | Targets iPad 2020+ / iPhone 11+ at 60fps with quality polish; older devices degrade gracefully | Most users have modern devices; prioritize polish over universal compatibility |
| Text rendering | HTML overlay (React + next-intl), never in WebGL | RTL/i18n for free, screen-reader-friendly UI text, no font asset loading |
| Persistence | `localStorage` only | No auth, no DB, COPPA-safe, MVP-fast |
| Accessibility floor | Touch + responsive text + colorblind cues + redundant signals | Realistic for kids' 3D, achievable, not retrofittable |
| Audio | Short SFX only (~50KB), mute toggle persisted, no voiceover | Engagement without localization cost |
| Architecture style | "Scene Engine" with `Game3D` contract | Best DX at scale (20+ games), enforces dispose, consistent UX |

## 5. Future scope context (for sub-project #3 to honor)

The `Game3D` contract must be flexible enough to support these families of games (NOT delivered here, but the API must not preclude them):

- **Geometry**: shape recognition, angle estimation, symmetry detection, perimeter/area visualization, **3D volume** (cubes/cones/spheres) — *the killer use-case for 3D*.
- **Arithmetic** (4 operations): visual addition (stack blocks), subtraction (remove blocks), multiplication (arrays), division (sharing visualizations) — across all numeric ranges (10, 20, 100, 1000+).
- **Fractions, percentages, decimals**: pie/bar/grid visualizations the child manipulates in 3D space.
- **Word problems**: a 3D scene tells the story; the child interacts with the scene to compute.
- **Series & patterns** (`/series`): "complete the pattern" — towers of spheres, sequences in 3D.
- **Ratio & proportion** (`/ratio`): scales, balance puzzles, comparative visualization.
- **Units of measurement** (`/units`): drag a ruler, fill containers (volume), estimate time — natural for 3D manipulation.

This list is not exhaustive. The contract's `topic` enum must remain extensible.

## 6. Architecture overview

```
┌──────────────────────────────────────────────────────────┐
│  EXISTING /play infrastructure (UNTOUCHED)               │
│  GameShell, ScoreDisplay, Timer, Feedback, GameSummary,  │
│  AnswerInput, ProblemDisplay, game-engine.ts, storage    │
│  → Continues to serve text-based games as-is             │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │ (extends, reuses)
                          │
┌──────────────────────────────────────────────────────────┐
│  NEW: 3D Games Infrastructure                            │
│                                                          │
│  Game3DShell (React)  ──── wraps existing GameShell      │
│       │                                                  │
│       ├─→ <canvas/> ←── SceneEngine ←── Game3D contract  │
│       │                  (Three.js boilerplate)          │
│       │                                                  │
│       └─→ HTML overlay (Timer/Score/Feedback/Hints)      │
│              └─ reuses existing components               │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │ (implements)
              ┌───────────┴───────────┐
              │ Individual 3D games   │
              │ (sub-project #3)      │
              └───────────────────────┘
```

**Principle:** The engine knows *how to run a scene*. The game knows *what to put in it*. They communicate via a thin contract.

## 7. Module layout

```
src/
├── lib/games3d/                          (NEW)
│   ├── engine/
│   │   ├── SceneEngine.ts                # Core: render loop, dispose enforcement, frame budget
│   │   ├── SceneContext.ts               # Factory + types for what a game receives
│   │   ├── InputAdapter.ts               # touch/pointer/keyboard → unified events + raycast
│   │   ├── AudioManager.ts               # Web Audio wrapper, mute persistence, iOS unlock
│   │   ├── AssetLoader.ts                # In-memory cache, GLTF/texture lazy load
│   │   ├── CameraPresets.ts              # orbit, top-down, locked
│   │   ├── LightingPresets.ts            # daylight, soft, dramatic
│   │   ├── WebGLCheck.ts                 # detection + fallback signal
│   │   └── PerformanceMonitor.ts         # fps tracking, qualityDowngrade event
│   ├── types.ts                          # Game3D, GameMeta, SceneContext interfaces
│   ├── registry.ts                       # Map<gameId, Game3D> for future discovery
│   └── __tests__/                        # vitest unit tests
│
├── components/games3d/                   (NEW)
│   ├── Game3DShell.tsx                   # Wraps GameShell + canvas + overlay
│   ├── Canvas3D.tsx                      # <canvas/> + SceneEngine React lifecycle
│   ├── OverlayHUD.tsx                    # Score+Timer+streak overlay
│   ├── MuteButton.tsx                    # Toggle audio
│   ├── LoadingScene.tsx                  # Asset-loading spinner with progress
│   ├── WebGLFallback.tsx                 # User-friendly fallback if no WebGL
│   ├── GameLoadError.tsx                 # Asset/load failure with retry
│   └── __tests__/
│
├── app/[locale]/play/_canary/            (NEW; dev only, not in production routing)
│   ├── page.tsx                          # Wrapped in NODE_ENV=development guard
│   └── CanaryGame.tsx                    # Game3D implementation: tap-the-cube
│
└── lib/game/storage.ts                   (EXTENDED — same file, new functions)

public/games/_shared/audio/               (NEW)
├── success.ogg                           # ~15KB
├── fail.ogg                              # ~15KB
└── click.ogg                             # ~15KB

messages/{he,en,ar,de,es,ru}/games3d.json (NEW; loading/mute/errors)

docs/games/
├── HOW-TO-ADD-A-3D-GAME.md               # English
└── HOW-TO-ADD-A-3D-GAME.he.md            # Hebrew
```

## 8. Core API

### 8.1 The `Game3D` contract

```typescript
// src/lib/games3d/types.ts

export type GameTopic3D =
  | 'geometry' | 'arithmetic' | 'fractions' | 'percentage'
  | 'decimals' | 'ratio' | 'series' | 'units' | 'wordProblems' | 'misc';

export interface AssetManifest {
  textures?: Record<string, string>;   // key → public URL
  models?: Record<string, string>;     // key → GLTF URL
  audio?: Record<string, string>;      // key → audio file URL (per-game SFX)
}

export interface GameMeta {
  id: string;                          // unique: 'shape-tap-canary'
  i18nKey: string;                     // 'games3d.canary'
  topic: GameTopic3D;
  difficulty: 1 | 2 | 3 | 4 | 5;
  gradeRange: [number, number];        // [1, 6]
  estimatedSeconds: number;
  assets?: AssetManifest;              // declarative; engine preloads before init()
  supportedModes: ('practice' | 'quiz')[];
}

export interface Game3D {
  meta: GameMeta;
  init(ctx: SceneContext): GameInstance;
}

export interface GameInstance {
  onFrame?(dt: number, elapsed: number): void;
  onResize?(width: number, height: number): void;
  onPause?(): void;
  onResume?(): void;
  onQualityDowngrade?(level: 'low'): void;  // engine signals; game may reduce detail
  dispose(): void;                          // MANDATORY — must clean every resource created
}
```

### 8.2 `SceneContext` — what the game receives

```typescript
export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;       // read-only; engine controls .render()

  input: InputAdapter;
  audio: AudioManager;
  assets: AssetCache;                  // pre-populated based on meta.assets

  locale: Locale;
  isRTL: boolean;
  prefersReducedMotion: boolean;

  score: ScoreController;              // .add(n), .set(n), .reset()
  feedback: FeedbackController;        // .correct(msg?), .wrong(msg?), .hint(msg)
  complete(summary: CompleteSummary): void;

  presets: {
    camera: CameraPresets;             // .orbit(target, distance), .topDown(), .locked()
    lighting: LightingPresets;         // .daylight(scene), .soft(scene), .dramatic(scene)
  };

  debug: DebugAPI | null;              // null in production
}

export interface CompleteSummary {
  totalPoints: number;
  accuracy: number;                    // 0..1
  durationSec: number;
  streak?: number;
}
```

### 8.3 `InputAdapter` — unified input

```typescript
export interface InputAdapter {
  on(event: 'tap',       h: (p: PointerInfo) => void): Unsubscribe;
  on(event: 'dragStart', h: (p: PointerInfo) => void): Unsubscribe;
  on(event: 'drag',      h: (p: PointerInfo) => void): Unsubscribe;
  on(event: 'dragEnd',   h: (p: PointerInfo) => void): Unsubscribe;
  on(event: 'pinch',     h: (delta: number) => void): Unsubscribe;
  on(event: 'rotate',    h: (deltaRadians: number) => void): Unsubscribe;
  on(event: 'key',       h: (key: string) => void): Unsubscribe;
  pickAt(x: number, y: number): THREE.Intersection[];
}

export interface PointerInfo {
  x: number; y: number;                // NDC [-1, 1]
  pixelX: number; pixelY: number;
  picked: THREE.Object3D | null;
}
```

Implementation notes:
- Pointer Events (not separate touch/mouse), routed off canvas only — does not block page scroll.
- Tap vs drag: <8px movement and <200ms hold ⇒ tap; otherwise drag.
- Multi-touch (pinch, rotate) detected via two-pointer tracking.

### 8.4 Reference game (canary) — proof of API

```typescript
// src/app/[locale]/play/_canary/CanaryGame.tsx (logic excerpt)
export const canaryGame: Game3D = {
  meta: {
    id: 'canary-tap-cube',
    i18nKey: 'games3d.canary',
    topic: 'misc', difficulty: 1, gradeRange: [1, 6],
    estimatedSeconds: 30, supportedModes: ['practice'],
  },
  init(ctx) {
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0, 0), 5);
    ctx.presets.lighting.daylight(ctx.scene);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4f46e5 })
    );
    ctx.scene.add(cube);

    let points = 0;
    const off = ctx.input.on('tap', (p) => {
      if (p.picked === cube) {
        points++;
        ctx.score.add(1);
        ctx.audio.play('success');
        ctx.feedback.correct();
        cube.material.color.setHex(Math.random() * 0xffffff);
        if (points >= 5) ctx.complete({ totalPoints: points, accuracy: 1, durationSec: 0 });
      }
    });

    return {
      onFrame: (dt) => { cube.rotation.y += dt * 0.5; },
      dispose: () => {
        off();
        cube.geometry.dispose();
        (cube.material as THREE.Material).dispose();
        ctx.scene.remove(cube);
      },
    };
  },
};
```

## 9. Cross-cutting systems

### 9.1 Render loop & performance
- Single `requestAnimationFrame` loop in `SceneEngine`.
- `onFrame` called only if game provided it.
- **Auto-pause** on `document.hidden`, window `blur`, or after `ctx.complete()`.
- `PerformanceMonitor` samples fps every 1s. After 3 consecutive seconds below 30fps:
  1. Emits `qualityDowngrade('low')` event to the game (game may reduce its own detail).
  2. If still below threshold after 3 more seconds, engine reduces `renderer.setPixelRatio` (1.0 → 0.75).
- **Dispose enforcement (dev only)**: wrap `THREE.BufferGeometry`/`Material`/`Texture` constructors during `init()`. On `dispose()`, warn in console if any wrapped instance was not `.dispose()`'d.

### 9.2 Audio
- `AudioManager` is a module-level singleton (one per app session, not per game).
- **3 shared SFX** preloaded on engine init: `public/games/_shared/audio/{success,fail,click}.ogg`. Each ~15KB. Total ~50KB.
- API: `audio.play(key)` for shared, `audio.play(key, url)` for per-game (auto-loaded into cache).
- **iOS unlock**: one-shot listener on first user gesture creates a silent `AudioContext.resume()`. Engine handles this — game does not.
- **Mute persistence**: `localStorage['tirgul.games3d.muted']`. `<MuteButton/>` in `Game3DShell` header bar.

### 9.3 Assets
- `AssetCache` keyed by URL. Map in memory; no service worker.
- Engine preloads everything in `meta.assets` before calling `init()`. During preload, `<LoadingScene/>` shows progress (per-asset count).
- On `dispose()`, per-game assets (not shared) are evicted from cache.
- On load failure, `<GameLoadError/>` shows with a retry button (text from `games3d.json`).

### 9.4 Persistence (extension of existing `storage.ts`)

```typescript
// src/lib/game/storage.ts — additions

const KEY_3D_BEST = (id: string) => `tirgul.games3d.best.${id}`;
const KEY_MUTE    = 'tirgul.games3d.muted';

export function getGame3DBestScore(gameId: string): number;
export function setGame3DBestScore(gameId: string, score: number): void;
export function getMutePreference(): boolean;
export function setMutePreference(muted: boolean): void;
```

Same `tirgul.` prefix, same module — consistency with existing storage.

### 9.5 i18n + RTL
- **All UI text** via `useTranslations('games3d')` in React overlay components. No hardcoded strings in engine.
- New file: `messages/{locale}/games3d.json` with keys: `loading`, `loadProgress`, `mute`, `unmute`, `gameLoadError`, `retry`, `webglNotSupported`, `frameRateLowNotice`, `canary.title`, `canary.description`.
- `ctx.locale` and `ctx.isRTL` exposed to games — a game may use them (e.g., to lay out numeric lineups right-to-left for he/ar). The canvas itself is RTL-agnostic.

### 9.6 Accessibility
- **Responsive text**: all overlay HTML uses `clamp()` for `font-size`, minimum 16px on mobile.
- **Color-blind safety** (design rule, enforced via code review): no information conveyed by color alone. Always color + shape/pattern/icon.
- **Redundant cues**:
  - Correct answer = green tint + ✓ icon + success SFX + i18n message.
  - Wrong answer = red tint + ✗ icon + fail SFX + i18n message.
- **`prefers-reduced-motion: reduce`** detected and exposed via `ctx.prefersReducedMotion`. Engine reduces internal animations (camera transitions). Games should honor this for their own animations.

### 9.7 Testing
- **Unit (vitest)**: `SceneEngine` lifecycle (init/pause/dispose), `InputAdapter` event routing, `AudioManager` unlock + mute, `AssetCache` eviction. Target ≥80% coverage on `lib/games3d/`.
- **Integration**: `Game3DShell` mount → canary game runs → completion → unmount. Run 10× in a loop, assert no JS heap growth beyond noise threshold (manual via Chrome DevTools; documented in HOW-TO).
- **Perf benchmark**: script `scripts/games3d-perf.ts` runs canary in Puppeteer for 60s, logs avg/p95 fps and heap delta. Run in CI on Chrome headless. Manual run on a modern iPad (2020+) before merge — goal is to confirm smooth 60fps on the primary target audience.
- **No E2E (Playwright) yet** — added in sub-project #3 when real games exist.

### 9.8 New dependencies

```json
{
  "dependencies": {
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@types/three": "^0.180.0",
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "jsdom": "^25.0.0"
  }
}
```

No `@react-three/fiber`, no `@react-three/drei`. Future games that need physics or post-processing may add their own lazy-loaded deps.

## 10. Risks & open questions

| Risk | Mitigation |
|---|---|
| Three.js bundle exceeds budget once real games are added | Per-game lazy split via `next/dynamic`; tree-shake aggressively; consider three-stdlib subset later |
| Dispose enforcement misses some Three.js classes | Dev-only proxy is best-effort; manual heap snapshot check before merge is the hard gate |
| iOS audio unlock fails on some Safari versions | Fallback to silent operation; surface mute state but never block gameplay |
| `prefers-reduced-motion` semantic — how much to reduce | Document guidance in HOW-TO; game author decides per scene |
| `Game3D` contract proves too rigid for an exotic game type later | Contract is internal; we can extend with optional fields without breaking existing games |
| Frame budget downgrade is jarring to user | Throttle quality reduction to once per 10s; never increase mid-session |

## 11. Implementation phasing (for sub-project planner)

Suggested ordering (the planner sub-skill will refine):

1. **Foundation**: `package.json` deps, `WebGLCheck`, `SceneEngine` skeleton, `Canvas3D` mount/unmount.
2. **Render loop & dispose**: full lifecycle, pause/resume, dev-mode dispose enforcement.
3. **Input**: `InputAdapter` with tap/drag, raycast via `pickAt`.
4. **Audio + assets**: `AudioManager` with shared SFX, `AssetCache` with preload.
5. **Context wiring**: `SceneContext` factory, `ScoreController`, `FeedbackController`, `complete()`.
6. **Shell + overlay**: `Game3DShell`, `OverlayHUD`, `MuteButton`, `LoadingScene`, `WebGLFallback`, `GameLoadError`.
7. **Storage extension**: 4 new functions in `storage.ts` + tests.
8. **i18n**: `games3d.json` in all 6 locales.
9. **Performance + input refinements**: `PerformanceMonitor`, pinch/rotate, `prefersReducedMotion`.
10. **Canary game** + dev-only route.
11. **Tests**: vitest config, unit tests, perf benchmark script.
12. **Docs**: HOW-TO in EN + HE.

## 12. Deferred decisions

- **GameRegistry contents**: empty in this sub-project; populated by sub-project #2 (catalog).
- **Achievements system**: sub-project #5.
- **Cloud sync / auth**: indefinite; revisit if traffic justifies.
- **Service worker for asset caching**: not now; revisit when total asset size > a few MB.
- **E2E test coverage**: sub-project #3.
