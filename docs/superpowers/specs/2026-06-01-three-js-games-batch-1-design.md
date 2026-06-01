# 3D Learning Games — First Batch (Batch 1) — Design Spec

**Date:** 2026-06-01
**Author:** brainstorming session (asaf + Claude)
**Status:** Draft (pending user review of this written spec)
**Sub-project:** #3 of 5 in the broader "3D Learning Games" initiative

> Depends on **sub-project #1 (infrastructure)** — see `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`. That sub-project is complete: `SceneEngine`, `Game3D` contract, `SceneContext`, `Game3DShell`, registry stub, canary game, perf benchmark, and the `HOW-TO-ADD-A-3D-GAME` guide all exist and are verified (67 vitest tests pass; canary holds ~120fps headless).

---

## 1. Context & motivation

`tirgul.net` (math-portal) is a multilingual (he, en, ar, de, es, ru), Hebrew-first, RTL educational platform for grades 1–6. The `/play` section currently hosts 3 text/input games (`math`, `fractions`, `percentage`) on the existing `GameShell` + `game-engine.ts` foundation.

Sub-project #1 delivered the **3D infrastructure** but **no real games** (only a dev-only canary). This sub-project delivers the **first batch of 4 real 3D games** and — critically — the **registry-driven plumbing** that lets every future batch add a game with near-zero boilerplate.

The two guiding constraints from the brainstorm:
- **Goal = curriculum coverage.** Each game teaches a distinct grade 3–4 math skill.
- **Build for the future.** "There will be many more games." Discovery, routing, and the quiz harness must scale to dozens of games without per-game wiring. Batch 1's four games are a *seed*, not a special case.

## 2. Goals

**Primary:** Ship 4 polished, fully-localized 3D games for **grades 3–4**, each with **practice + quiz** modes, behind a **registry-driven catalog** so future games require only: implement the `Game3D` contract, add i18n, register. No new route files, no edits to the listing page.

**Success criteria:**
- 4 games live and reachable from `/play`: `multiplication-array`, `fraction-build`, `area-perimeter`, `measure-fill`.
- Adding the *next* game (sub-project #4+) requires **0 new route files and 0 edits to the `/play` listing** — only register + i18n + the game module.
- Each game: practice mode (endless, hints, no fail-out) **and** quiz mode (fixed-length, scored, timed, completion summary, best score persisted to `localStorage`).
- Fully localized into all 6 languages with no WebGL text rendering (HTML overlay only).
- Each game holds ≥55fps avg / ≥30fps p95-low / <20MB heap delta on the perf benchmark, and leaks no GPU memory across 5 mount/unmount cycles.
- Logic (problem generators, answer-checking, quiz controller) at ≥80% vitest coverage; each game has a Playwright happy-path E2E.

## 3. Non-goals (out of scope)

- **No full catalog upgrade** (filtering, search, topic landing pages, 20+ game UX) — that is sub-project #2. Batch 1 ships a *minimal* registry-rendered listing section appended to the existing `/play`.
- **No curriculum-grade mapping pages** (sub-project #4).
- **No cross-game achievements / accounts / cloud sync** (sub-project #5). Persistence stays `localStorage`.
- **No external assets.** Procedural geometry only — no GLTF models, no sourced textures.
- **No new topics outside grades 3–4** for this batch.
- **No changes to the existing text games** (`math`, `fractions`, `percentage`) or their routes.
- **No screen-reader support for the 3D scene** (infra a11y floor applies: touch + responsive overlay text + colorblind-safe + redundant cues).

## 4. Decisions made during brainstorm (constraints)

| Decision | Choice | Why |
|---|---|---|
| Batch composition | Breadth-4: one game per topic family | Goal is curriculum coverage; avoids redundancy; exercises 4 different input mechanics |
| Grade band | Grades 3–4 | Best balance of curriculum richness vs accessible mechanics |
| Modes | Practice **and** quiz, every game | Full experience from day one; mirrors existing text-game `GameMode` |
| Discovery | Minimal registry-rendered cards appended to `/play` now | Games must be reachable; full catalog deferred to #2 |
| Mode selection UX | Pre-game mode picker screen inside `Game3DShell` | Discoverable for kids; one route per game |
| Assets | Procedural geometry only | No sourcing/licensing burden, lean bundle |
| Routing | Single dynamic `/play/[gameId]` route, registry-driven | Future games need 0 new route files |
| Listing source | Render 3D games from `registry.listGames()` | Register a game → it appears automatically |

## 5. The four games

All: `gradeRange: [3, 4]`, `supportedModes: ['practice', 'quiz']`, procedural geometry, numbers/prompts via HTML overlay, shared SFX (`success`/`fail`/`click`). Each lives in `src/lib/games3d/games/<id>/`.

### 5.1 Multiplication Arrays — `multiplication-array`
- **Topic:** `arithmetic` · **difficulty:** 2 · **input:** `tap`
- **Concept:** Prompt shows a product (e.g. "3 × 4"). The child builds a rows×columns array of unit cubes on a baseplate by tapping to add rows/columns; the total animates and is counted. Reinforces multiplication as an array / repeated-addition model.
- **Practice:** endless problems; hint = highlight & count one row; wrong answer re-prompts, no fail-out.
- **Quiz:** 10 problems, timer, accuracy + streak, `ctx.complete({ totalPoints, accuracy, durationSec, streak })`.
- **Problem source:** reuse `MathEngine` (`src/lib/math-engine.ts`) with operation `'*'`, factor ranges tuned for grades 3–4.

### 5.2 Fraction Builder — `fraction-build`
- **Topic:** `fractions` · **difficulty:** 3 · **input:** `tap` + `drag`
- **Concept:** Prompt shows a target fraction (e.g. "3/4"). A 3D pie (cylinder) is divided into *n* slices; the child taps slices to fill them (or drags a dial) until the filled portion matches the target. Visualizes part-of-whole.
- **Practice/Quiz:** same pattern as above.
- **Problem source:** new `problems.ts` — generates `{ numerator, denominator }` with denominators ∈ {2,3,4,5,6,8,10}, numerator < denominator, grade-appropriate.

### 5.3 Area & Perimeter — `area-perimeter`
- **Topic:** `geometry` · **difficulty:** 3 · **input:** `drag` (corner resize)
- **Concept:** A rectangle of extruded unit tiles on a grid. Prompt: "Build a rectangle with **area 12**" (or "**perimeter 14**"). The child drags a corner handle to resize; the overlay live-updates current area & perimeter; confirm when it matches the target.
- **Practice/Quiz:** same pattern; alternates area vs perimeter targets.
- **Problem source:** new `problems.ts` — picks a target area or perimeter solvable with integer width/height within a grid cap (e.g. ≤10×10).

### 5.4 Fill the Container — `measure-fill`
- **Topic:** `units` (capacity/volume) · **difficulty:** 2 · **input:** `drag`
- **Concept:** A transparent graduated 3D cylinder. Prompt: "Fill to **250 ml**" (or "**¾ L**"). The child drags vertically to raise the liquid level to the target graduation and confirms. Reinforces capacity units and reading scales.
- **Practice/Quiz:** same pattern; tolerance band for "correct" in practice, exact graduation in quiz.
- **Problem source:** new `problems.ts` — target volumes on clean graduations (e.g. multiples of 50 ml up to the container max).

## 6. Architecture — registry-driven (the scalability core)

**Principle:** A game is fully described by its `Game3D` module + its `games3d.<key>` i18n. Everything else — routing, discovery, SEO, mode selection, quiz orchestration — is generic and reads from the registry or shared helpers. Adding game N+1 touches only the game's own folder and the i18n files.

```
┌─────────────────────────────────────────────────────────────┐
│  EXISTING /play (UNTOUCHED hardcoded text-game cards)        │
│  math · fractions · percentage  →  static routes preserved   │
└─────────────────────────────────────────────────────────────┘
                    +  (append a registry-rendered section)
┌─────────────────────────────────────────────────────────────┐
│  /play page  →  renders 3D cards from registry.listGames()   │
│        │            grouped by topic, sorted by difficulty    │
│        ▼                                                      │
│  /play/[gameId]  (ONE dynamic route)                          │
│    generateStaticParams() ← registry game ids                 │
│    generateMetadata()      ← games3d.<key> i18n (SEO)         │
│    lazy-imports the game module by id  → Game3DShell          │
│        │                                                      │
│        ▼                                                      │
│  Game3DShell  →  Mode picker (practice/quiz)                  │
│        │            → SceneEngine runs the Game3D             │
│        └────────────→ Quiz controller (generic) wraps the     │
│                       game's ProblemGenerator in quiz mode    │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Static vs dynamic route coexistence
Next.js resolves a static segment before a dynamic one, so the existing `/play/math`, `/play/fractions`, `/play/percentage`, and dev-only `/play/canary-dev` continue to win over `/play/[gameId]`. The dynamic route only serves ids it finds in the registry; an unknown id → `notFound()`.

### 6.2 Lazy-load map
The dynamic route cannot statically import every game (that would bundle them all). It uses an id → `() => import(...)` map declared in `games3d/games/index.ts` alongside registration, so each game is its own code-split chunk. `generateStaticParams` returns the map's keys.

### 6.3 ProblemGenerator contract + generic quiz controller
A new shared contract so every game (this batch and future) plugs into quiz mode identically:

```typescript
// src/lib/games3d/quiz/types.ts
export interface ProblemGenerator<TProblem> {
  next(): TProblem;                       // produce the next problem
  check(problem: TProblem, answer: unknown): boolean;  // grade an answer
  describe(problem: TProblem): string;    // i18n key args / prompt payload
}

export interface QuizConfig {
  length: number;            // e.g. 10
  pointsPerCorrect: number;
}
```

The **quiz controller** (`src/lib/games3d/quiz/controller.ts`) owns: problem sequence, current index, score, streak, correct count, elapsed time, and emits a `CompleteSummary` for `ctx.complete`. It is UI- and Three.js-agnostic — pure logic, fully unit-testable. Each game wires its `ProblemGenerator` into it; practice mode uses the same generator with `length: Infinity` and no scoring pressure.

### 6.4 Mode picker
`Game3DShell` gains a small pre-game screen (`ModePicker`) shown when the game's `supportedModes.length > 1`: two large buttons ("תרגול" / "חידון"), localized, RTL-aware, with the 4 UX states honored (the game scene is the success state; picker is effectively the "empty/start" state). Selecting a mode mounts the `SceneEngine` with that mode in `SceneContext`.

> **Infra note:** `SceneContext` (from sub-project #1) does not currently carry a `mode`. This batch adds a `mode: GameMode3D` field to `SceneContext` (and threads it from `Game3DShell`). This is the one in-scope change to a sub-project-#1 file; the `GameMode3D` type already exists in `types.ts`.

## 7. Module layout

```
src/lib/games3d/
├── quiz/
│   ├── types.ts                  # CREATE — ProblemGenerator, QuizConfig
│   ├── controller.ts             # CREATE — generic quiz orchestration
│   └── __tests__/controller.test.ts
├── games/
│   ├── index.ts                  # CREATE — register all + lazy-import map
│   ├── multiplication-array/
│   │   ├── MultiplicationArrayGame.ts
│   │   ├── problems.ts
│   │   └── __tests__/problems.test.ts
│   ├── fraction-build/      { Game.ts, problems.ts, __tests__ }
│   ├── area-perimeter/      { Game.ts, problems.ts, __tests__ }
│   └── measure-fill/        { Game.ts, problems.ts, __tests__ }
└── types.ts                      # MODIFY — add `mode` to SceneContext

src/components/games3d/
├── Game3DShell.tsx               # MODIFY — render ModePicker, thread mode
├── ModePicker.tsx                # CREATE
└── __tests__/ModePicker.test.tsx # CREATE

src/app/[locale]/play/
├── page.tsx                      # MODIFY — append registry-rendered 3D section
└── [gameId]/page.tsx             # CREATE — dynamic route (params, metadata, lazy load)

messages/{he,en,ar,de,es,ru}/games3d.json  # MODIFY — 4 games + mode/topic labels

e2e/                              # CREATE — Playwright config + 4 happy-path specs
playwright.config.ts             # CREATE
```

**Reused unchanged:** `SceneEngine`, `Canvas3D`, `OverlayHUD`, `WebGLFallback`, `LoadingScene`, `GameLoadError`, `MuteButton`, `registry.ts`, `AudioManager`, `AssetLoader`, presets, `storage.ts` (`getGame3DBestScore`/`setGame3DBestScore`/mute), `MathEngine`.

## 8. Build order (each game: TDD — logic first)

1. **Shared foundation:** `ProblemGenerator` + quiz controller (TDD) · add `mode` to `SceneContext` · `ModePicker` in `Game3DShell` · `games/index.ts` (registry + lazy map) · dynamic `/play/[gameId]` route · `/play` registry section · i18n scaffolding (topic + mode labels).
2. **`multiplication-array`** (tap, reuses `MathEngine`) — proves the whole pipeline end-to-end through the shared foundation.
3. **`measure-fill`** (drag, procedural).
4. **`fraction-build`** (tap + drag).
5. **`area-perimeter`** (drag-resize — most complex interaction).
6. **Close-out:** `/play` listing polish · `npm run perf:games3d` per game · Playwright happy-path E2E per game + WebGL-fallback path · manual dispose/heap + RTL + tab-blur checks.

Per game, the order within is: write `problems.ts` + its tests (RED→GREEN), wire the `ProblemGenerator`, then build the `Game3D` visual/interaction layer, then the route entry in the lazy map + i18n, then perf + E2E.

## 9. Testing & success criteria

- **Unit (vitest):** each `problems.ts` (valid ranges per grade, no degenerate/unsolvable problems, `check()` correctness); quiz controller (sequence length, scoring, streak, accuracy, completion summary). ≥80% on `src/lib/games3d/quiz/**` and each `games/**/problems.ts`.
- **Component (vitest + testing-library):** `ModePicker` (renders both modes, fires selection, single-mode games skip it); `/play` 3D section renders one card per registered game.
- **Perf:** `PERF_URL=…/play/<id> npm run perf:games3d` for each game → avg ≥55, p95-low ≥30, heap delta <20MB.
- **E2E (Playwright — new to repo):** per game: load → mode picker → pick quiz → answer correctly through to completion summary; plus a WebGL-disabled fallback assertion. Tag with the game id.
- **Manual:** 5× navigate-in/out → no JS-heap growth (Chrome DevTools); mute silences; tab blur pauses & return resumes; touch via mobile emulation; correct RTL framing of overlay in `he`/`ar`.
- **Gate (DoD):** all four games green across `npm test`, `tsc --noEmit`, `npm run lint`, `npm run build`, perf, and E2E; reachable from `/play`; localized in 6 languages; best score persisted.

## 10. Future-scope notes (for sub-projects #2/#4/#5)

- The **registry + lazy map + dynamic route** built here are the substrate #2's full catalog renders on — #2 replaces the *listing UI*, not the routing.
- `ProblemGenerator` + quiz controller are reused by every future game regardless of topic/grade.
- The `mode` field added to `SceneContext` generalizes to future modes (e.g. timed-challenge, adaptive) without contract churn.
- Keep the `GameTopic3D` enum extensible (already a union in `types.ts`); new topics append, never renumber.
- Procedural-only is a Batch-1 constraint, not an architectural one: a future game may lazy-load its own assets via the existing `AssetLoader`/`meta.assets` path.

## 11. Open questions

None outstanding — all brainstorm decisions resolved (see §4). Remaining design latitude was delegated to the implementer ("do what you think; it's only a beginning") and is captured above.
