# 3D Learning Games — Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 real 3D math games for grades 3–4 (`multiplication-array`, `fraction-build`, `area-perimeter`, `measure-fill`), each with practice + quiz modes, behind a registry-driven dynamic route so future games need zero new route files.

**Architecture:** A generic, UI-agnostic quiz controller + `ProblemGenerator<T>` contract drives quiz mode for every game. A single dynamic `/play/[gameId]` route looks games up in the existing `registry`, lazy-imports the game module, and renders it via `Game3DShell` (now with a pre-game mode picker). `/play` lists 3D games from `registry.listGames()`. Games are pure procedural Three.js, localized via HTML overlay only.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 strict · next-intl · three ^0.180 (vanilla) · vitest + @testing-library/react · Playwright (new) · localStorage.

**Spec:** `docs/superpowers/specs/2026-06-01-three-js-games-batch-1-design.md`

---

## File map

```
src/lib/games3d/
├── types.ts                          # MODIFY — add `mode` to SceneContext
├── engine/SceneContext.ts            # MODIFY — thread `mode`
├── engine/SceneEngine.ts             # MODIFY — accept `mode` option
├── quiz/
│   ├── types.ts                      # CREATE — ProblemGenerator, QuizConfig, QuizState
│   ├── controller.ts                 # CREATE — generic quiz orchestration
│   └── __tests__/controller.test.ts  # CREATE
├── games/
│   ├── index.ts                      # CREATE — register all + lazy-import map
│   ├── multiplication-array/{ MultiplicationArrayGame.ts, problems.ts, __tests__/problems.test.ts }
│   ├── measure-fill/{ MeasureFillGame.ts, problems.ts, __tests__/problems.test.ts }
│   ├── fraction-build/{ FractionBuildGame.ts, problems.ts, __tests__/problems.test.ts }
│   └── area-perimeter/{ AreaPerimeterGame.ts, problems.ts, __tests__/problems.test.ts }

src/components/games3d/
├── Canvas3D.tsx                      # MODIFY — accept + thread `mode`
├── Game3DShell.tsx                   # MODIFY — render ModePicker, hold mode state
├── ModePicker.tsx                    # CREATE
└── __tests__/ModePicker.test.tsx     # CREATE

src/app/[locale]/play/
├── page.tsx                          # MODIFY — append registry-rendered 3D section
└── [gameId]/page.tsx                 # CREATE — dynamic route

messages/{he,en,ar,de,es,ru}/games3d.json  # MODIFY — 4 games + mode/topic labels

playwright.config.ts                  # CREATE
e2e/games3d.spec.ts                   # CREATE — happy-path per game + fallback
package.json                          # MODIFY — playwright dep + e2e script
```

**Reused unchanged:** `SceneEngine` loop, `Canvas3D` engine wiring, `OverlayHUD`, `WebGLFallback`, `LoadingScene`, `GameLoadError`, `MuteButton`, `registry.ts`, `AudioManager`, `AssetLoader`, presets, `storage.ts`, `MathEngine` (`src/lib/math-engine.ts`).

---

# PHASE 1 — Shared foundation

## Task 1: Add `mode` to SceneContext

**Files:**
- Modify: `src/lib/games3d/types.ts`
- Modify: `src/lib/games3d/engine/SceneContext.ts`
- Modify: `src/lib/games3d/engine/SceneEngine.ts`
- Modify: `src/components/games3d/Canvas3D.tsx`

Type-only + threading; the compiler is the test.

- [ ] **Step 1: Add `mode` to the `SceneContext` interface in `types.ts`**

In `types.ts`, inside `export interface SceneContext { ... }`, add after `isRTL: boolean;`:
```typescript
  mode: GameMode3D;
```
(`GameMode3D` already exists in this file.)

- [ ] **Step 2: Thread `mode` through `SceneContext.ts`**

In `CreateContextArgs` add after `isRTL: boolean;`:
```typescript
  mode: import('../types').GameMode3D;
```
In the object returned by `createSceneContext`, add after `isRTL: args.isRTL,`:
```typescript
    mode: args.mode,
```

- [ ] **Step 3: Accept `mode` in `SceneEngine.ts`**

In `SceneEngineOptions` add after `isRTL: boolean;`:
```typescript
  mode?: import('../types').GameMode3D;
```
In the `createSceneContext({ ... })` call inside `start()`, add after `isRTL: opts.isRTL,`:
```typescript
      mode: opts.mode ?? 'practice',
```

- [ ] **Step 4: Pass `mode` from `Canvas3D.tsx`**

Add `mode` to `Props` (after `isRTL: boolean;`):
```typescript
  mode: import('@/lib/games3d/types').GameMode3D;
```
Destructure `mode` in the component signature, and add `mode,` to the `factory({ ... })` options object (after `isRTL,`).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0. (Canvas3D callers will error until Task 3 — if so, temporarily it's fine; this task's own files compile. If `tsc` errors on Game3DShell not passing `mode`, proceed to Task 3 which fixes it, then re-run.)

- [ ] **Step 6: Commit**
```bash
git add src/lib/games3d/types.ts src/lib/games3d/engine/SceneContext.ts src/lib/games3d/engine/SceneEngine.ts src/components/games3d/Canvas3D.tsx
git commit -m "feat(games3d): thread game mode through SceneContext"
```

---

## Task 2: ModePicker component

**Files:**
- Create: `src/components/games3d/ModePicker.tsx`
- Test: `src/components/games3d/__tests__/ModePicker.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/games3d/__tests__/ModePicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ModePicker } from '../ModePicker';

const messages = { games3d: { modes: { practice: 'תרגול', quiz: 'חידון', choose: 'בחר מצב' } } };

function renderPicker(modes: Array<'practice' | 'quiz'>, onPick = vi.fn()) {
  render(
    <NextIntlClientProvider locale="he" messages={messages}>
      <ModePicker supportedModes={modes} onPick={onPick} />
    </NextIntlClientProvider>
  );
  return onPick;
}

describe('ModePicker', () => {
  it('renders a button per supported mode', () => {
    renderPicker(['practice', 'quiz']);
    expect(screen.getByRole('button', { name: 'תרגול' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'חידון' })).toBeInTheDocument();
  });

  it('calls onPick with the chosen mode', () => {
    const onPick = renderPicker(['practice', 'quiz']);
    fireEvent.click(screen.getByRole('button', { name: 'חידון' }));
    expect(onPick).toHaveBeenCalledWith('quiz');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- ModePicker`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/components/games3d/ModePicker.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { GameMode3D } from '@/lib/games3d/types';

interface Props {
  supportedModes: GameMode3D[];
  onPick: (mode: GameMode3D) => void;
}

export function ModePicker({ supportedModes, onPick }: Props): React.ReactElement {
  const t = useTranslations('games3d.modes');
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-slate-900/95">
      <h2 className="text-xl font-bold text-white">{t('choose')}</h2>
      <div className="flex gap-4">
        {supportedModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPick(mode)}
            className="rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-500 active:scale-95"
          >
            {t(mode)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- ModePicker`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/games3d/ModePicker.tsx src/components/games3d/__tests__/ModePicker.test.tsx
git commit -m "feat(games3d): add ModePicker pre-game screen"
```

---

## Task 3: Wire ModePicker into Game3DShell

**Files:**
- Modify: `src/components/games3d/Game3DShell.tsx`

- [ ] **Step 1: Add mode state and import**

At the top imports add:
```tsx
import { ModePicker } from './ModePicker';
import type { GameMode3D } from '@/lib/games3d/types';
```
Inside the component, after the `muted` state line, add:
```tsx
  const supportedModes = game.meta.supportedModes;
  const [mode, setMode] = useState<GameMode3D | null>(
    supportedModes.length === 1 ? supportedModes[0] : null
  );
```

- [ ] **Step 2: Render the picker until a mode is chosen**

Replace the inner game `<div className="relative flex-1 min-h-[60vh]">…</div>` block so the picker shows when `mode === null`, and `Canvas3D` only mounts once `mode` is set. The block becomes:
```tsx
        <div className="relative flex-1 min-h-[60vh]">
          {mode === null ? (
            <ModePicker supportedModes={supportedModes} onPick={setMode} />
          ) : (
            <>
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                  <LoadingScene progress={progress} />
                </div>
              )}
              <Canvas3D
                key={`${reloadKey}-${mode}`}
                game={game}
                mode={mode}
                locale={locale}
                isRTL={isRTL}
                onScore={setScore}
                onFeedback={setFeedback}
                onComplete={onComplete}
                onLoadProgress={handleLoadProgress}
                onError={handleError}
              />
              <OverlayHUD score={score} feedback={feedback} />
            </>
          )}
        </div>
```

- [ ] **Step 3: Verify typecheck + existing tests**

Run: `npx tsc --noEmit && npm test -- Game3DShell`
Expected: exits 0; Game3DShell tests still pass. (The existing Game3DShell test renders with a single-mode game or asserts the canvas — if it now sees the picker first, update that test to choose a mode: query the picker button and click it before asserting the canvas. If the existing test uses a game whose `supportedModes` has length 1, the picker auto-skips and the test is unaffected.)

- [ ] **Step 4: Commit**
```bash
git add src/components/games3d/Game3DShell.tsx src/components/games3d/__tests__/Game3DShell.test.tsx
git commit -m "feat(games3d): show mode picker before mounting the scene"
```

---

## Task 3B: Completion handling — persist best score + summary overlay

**Files:**
- Modify: `src/components/games3d/Game3DShell.tsx`

When a game calls `ctx.complete(summary)` (quiz finished), Game3DShell must (1) persist the best score for that game id to `localStorage`, and (2) show a completion overlay with the score + a "play again" action that returns to the mode picker. This satisfies the spec's "best score persisted" + "completion summary" criteria. We reuse the existing `getGame3DBestScore`/`setGame3DBestScore` from `src/lib/game/storage.ts`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/games3d/__tests__/Game3DShell.test.tsx` (new test; keep existing ones). It drives the internal `onComplete` by passing a single-mode quiz game and faking the engine via `Canvas3D`'s `engineFactory` is not exposed through Game3DShell — instead assert the persistence helper is called when the shell's completion handler runs. Simplest reliable unit: export the pure helper and test it directly.

Create `src/components/games3d/completion.ts`:
```typescript
import { getGame3DBestScore, setGame3DBestScore } from '@/lib/game/storage';

/** Persist a new score as the best for this game if it beats the stored best. Returns the resulting best. */
export function recordBestScore(gameId: string, score: number): number {
  const prev = getGame3DBestScore(gameId);
  if (score > prev) {
    setGame3DBestScore(gameId, score);
    return score;
  }
  return prev;
}
```

Test `src/components/games3d/__tests__/completion.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { recordBestScore } from '../completion';

describe('recordBestScore', () => {
  beforeEach(() => localStorage.clear());
  it('stores the score when none exists', () => {
    expect(recordBestScore('g1', 30)).toBe(30);
  });
  it('keeps the higher score', () => {
    recordBestScore('g1', 30);
    expect(recordBestScore('g1', 20)).toBe(30);
    expect(recordBestScore('g1', 50)).toBe(50);
  });
});
```

- [ ] **Step 2: Run test, expect fail** — `npm test -- completion` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `completion.ts` as above. Run `npm test -- completion` → 2 PASS.

- [ ] **Step 4: Wire into Game3DShell**

In `Game3DShell.tsx`, import the helper and add summary state:
```tsx
import { recordBestScore } from './completion';
import type { CompleteSummary } from '@/lib/games3d/types';
```
Add state after `mode`:
```tsx
  const [summary, setSummary] = useState<CompleteSummary | null>(null);
```
Wrap the incoming `onComplete` so the shell persists + shows the overlay (define near the other callbacks):
```tsx
  const handleComplete = useCallback((s: CompleteSummary) => {
    recordBestScore(game.meta.id, s.totalPoints);
    setSummary(s);
    onComplete?.(s);
  }, [game.meta.id, onComplete]);

  const playAgain = useCallback(() => {
    setSummary(null);
    setScore(0);
    setMode(supportedModes.length === 1 ? supportedModes[0] : null);
    setReloadKey((k) => k + 1);
  }, [supportedModes]);
```
Pass `onComplete={handleComplete}` to `Canvas3D` (replace the existing `onComplete={onComplete}`), and render a summary overlay when `summary` is set, inside the game `<div>` (after `OverlayHUD`):
```tsx
              {summary && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-900/95 text-white">
                  <div className="text-3xl font-bold">{summary.totalPoints}</div>
                  <div className="text-sm opacity-80">
                    {Math.round(summary.accuracy * 100)}% · {Math.round(summary.durationSec)}s
                  </div>
                  <button
                    type="button"
                    onClick={playAgain}
                    className="rounded-2xl bg-indigo-600 px-8 py-3 font-bold shadow-lg hover:bg-indigo-500 active:scale-95"
                  >
                    ↻
                  </button>
                </div>
              )}
```

- [ ] **Step 5: Verify typecheck + tests**

Run: `npx tsc --noEmit && npm test -- Game3DShell completion`
Expected: 0; tests pass.

- [ ] **Step 6: Commit**
```bash
git add src/components/games3d/completion.ts src/components/games3d/Game3DShell.tsx src/components/games3d/__tests__/completion.test.ts
git commit -m "feat(games3d): persist best score and show completion summary"
```

---

## Task 4: ProblemGenerator contract + generic quiz controller

**Files:**
- Create: `src/lib/games3d/quiz/types.ts`
- Create: `src/lib/games3d/quiz/controller.ts`
- Test: `src/lib/games3d/quiz/__tests__/controller.test.ts`

- [ ] **Step 1: Create `src/lib/games3d/quiz/types.ts`**

```typescript
/** A pure, testable problem source for a game. TProblem is the game's problem shape. */
export interface ProblemGenerator<TProblem> {
  /** Produce the next problem. */
  next(): TProblem;
  /** Grade an answer against a problem. */
  check(problem: TProblem, answer: unknown): boolean;
}

export interface QuizConfig {
  /** Number of problems in a quiz run. */
  length: number;
  /** Points awarded per correct answer. */
  pointsPerCorrect: number;
}

export interface QuizState<TProblem> {
  current: TProblem;
  index: number;        // 0-based
  total: number;
  score: number;
  correct: number;
  streak: number;
  finished: boolean;
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/games3d/quiz/__tests__/controller.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createQuizController } from '../controller';
import type { ProblemGenerator } from '../types';

// Deterministic generator: problems are numbers 1,2,3,...; correct answer === problem.
function seqGenerator(): ProblemGenerator<number> {
  let n = 0;
  return {
    next: () => (n += 1),
    check: (problem, answer) => answer === problem,
  };
}

describe('quiz controller', () => {
  it('starts at index 0 with the first problem', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    expect(c.state().index).toBe(0);
    expect(c.state().total).toBe(3);
    expect(c.state().current).toBe(1);
    expect(c.state().finished).toBe(false);
  });

  it('awards points and advances on a correct answer', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    const res = c.submit(1); // correct
    expect(res.correct).toBe(true);
    expect(c.state().score).toBe(10);
    expect(c.state().streak).toBe(1);
    expect(c.state().index).toBe(1);
    expect(c.state().current).toBe(2);
  });

  it('does not award points and resets streak on a wrong answer but still advances', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    c.submit(1);        // correct, streak 1
    const res = c.submit(999); // wrong
    expect(res.correct).toBe(false);
    expect(c.state().score).toBe(10);
    expect(c.state().streak).toBe(0);
    expect(c.state().index).toBe(2);
  });

  it('finishes after `length` submissions and reports a summary', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    c.submit(1); // correct
    c.submit(2); // correct
    expect(c.state().finished).toBe(false);
    const last = c.submit(3); // correct -> finishes
    expect(last.finished).toBe(true);
    expect(c.state().finished).toBe(true);
    const summary = c.summary();
    expect(summary.totalPoints).toBe(30);
    expect(summary.accuracy).toBeCloseTo(1, 5);
    expect(summary.streak).toBe(3);
    expect(summary.durationSec).toBeGreaterThanOrEqual(0);
  });

  it('computes fractional accuracy', () => {
    const c = createQuizController(seqGenerator(), { length: 2, pointsPerCorrect: 5 });
    c.submit(1);   // correct
    c.submit(999); // wrong -> finishes
    expect(c.summary().accuracy).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 3: Run test, expect fail**

Run: `npm test -- quiz/controller` (or `npm test -- controller`)
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/games3d/quiz/controller.ts`**

```typescript
import type { CompleteSummary } from '../types';
import type { ProblemGenerator, QuizConfig, QuizState } from './types';

export interface SubmitResult {
  correct: boolean;
  finished: boolean;
}

export interface QuizController<TProblem> {
  state(): QuizState<TProblem>;
  submit(answer: unknown): SubmitResult;
  summary(): CompleteSummary;
}

export function createQuizController<TProblem>(
  generator: ProblemGenerator<TProblem>,
  config: QuizConfig,
  now: () => number = () => Date.now()
): QuizController<TProblem> {
  const startedAt = now();
  let current = generator.next();
  let index = 0;
  let score = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let finished = false;

  function state(): QuizState<TProblem> {
    return { current, index, total: config.length, score, correct, streak, finished };
  }

  function submit(answer: unknown): SubmitResult {
    if (finished) return { correct: false, finished: true };
    const isCorrect = generator.check(current, answer);
    if (isCorrect) {
      score += config.pointsPerCorrect;
      correct += 1;
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
    index += 1;
    if (index >= config.length) {
      finished = true;
    } else {
      current = generator.next();
    }
    return { correct: isCorrect, finished };
  }

  function summary(): CompleteSummary {
    return {
      totalPoints: score,
      accuracy: config.length > 0 ? correct / config.length : 0,
      durationSec: Math.max(0, (now() - startedAt) / 1000),
      streak: bestStreak,
    };
  }

  return { state, submit, summary };
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- controller`
Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**
```bash
git add src/lib/games3d/quiz/
git commit -m "feat(games3d): add ProblemGenerator contract and generic quiz controller"
```

---

## Task 5: Games registry + lazy-import map

**Files:**
- Create: `src/lib/games3d/games/index.ts`
- Test: `src/lib/games3d/games/__tests__/index.test.ts`

This starts effectively empty (no games yet) and is appended to as each game lands. It owns BOTH registration (for the catalog) and the lazy-import map (for the dynamic route).

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/games/__tests__/index.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GAME_IDS, gameLoaders, getRegisteredGames } from '../index';

describe('games index', () => {
  it('exposes a loader for every registered game id', () => {
    for (const id of GAME_IDS) {
      expect(typeof gameLoaders[id]).toBe('function');
    }
  });

  it('GAME_IDS matches the registered games', () => {
    const registeredIds = getRegisteredGames().map((g) => g.meta.id).sort();
    expect([...GAME_IDS].sort()).toEqual(registeredIds);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- games/__tests__/index`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/games3d/games/index.ts` (initially empty maps)**

```typescript
import type { Game3D } from '../types';
import { registerGame, listGames } from '../registry';

/**
 * The single source of truth for which 3D games exist.
 * Adding a game = add one entry to BOTH maps below (id -> static game meta module
 * for the catalog, and id -> lazy loader for the dynamic route). No route files,
 * no listing edits.
 */

// Statically-imported game definitions (small — meta + init fn). Registered for the catalog.
const games: Game3D[] = [
  // GAMES GO HERE as each task lands, e.g.:
  // multiplicationArrayGame,
];

// Lazy loaders so each game's Three.js code is its own code-split chunk.
export const gameLoaders: Record<string, () => Promise<{ default: Game3D }>> = {
  // 'multiplication-array': () => import('./multiplication-array/MultiplicationArrayGame').then(m => ({ default: m.multiplicationArrayGame })),
};

export const GAME_IDS = Object.keys(gameLoaders);

let registered = false;
export function ensureRegistered(): void {
  if (registered) return;
  registered = true;
  for (const g of games) registerGame(g);
}

export function getRegisteredGames(): Game3D[] {
  ensureRegistered();
  return listGames();
}
```

> Note: while `games` and `gameLoaders` are empty, both test assertions pass trivially (empty arrays/objects). Each game task appends to both.

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- games/__tests__/index`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/index.ts src/lib/games3d/games/__tests__/index.test.ts
git commit -m "feat(games3d): add games registry + lazy-import map (empty seed)"
```

---

## Task 6: Dynamic `/play/[gameId]` route

**Files:**
- Create: `src/app/[locale]/play/[gameId]/page.tsx`

- [ ] **Step 1: Implement the route**

`src/app/[locale]/play/[gameId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { getRegisteredGames, gameLoaders, GAME_IDS } from '@/lib/games3d/games';
import type { Locale } from '@/i18n/config';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';

export function generateStaticParams(): Array<{ gameId: string }> {
  return GAME_IDS.map((gameId) => ({ gameId }));
}

function findMeta(gameId: string) {
  return getRegisteredGames().find((g) => g.meta.id === gameId)?.meta ?? null;
}

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string; gameId: string }> }): Promise<Metadata> {
  const { locale, gameId } = await params;
  const meta = findMeta(gameId);
  if (!meta) return {};
  const t = await getTranslations({ locale, namespace: meta.i18nKey });
  const title = t('title');
  const description = t('description');
  return {
    title,
    description,
    alternates: generateAlternates(`/play/${gameId}`, locale as Locale),
    openGraph: generateOpenGraphMeta(locale as Locale, title, description, `/play/${gameId}`),
    twitter: generateTwitterMeta(title, description),
  };
}

export default async function GamePage({
  params,
}: { params: Promise<{ locale: string; gameId: string }> }) {
  const { locale, gameId } = await params;
  const meta = findMeta(gameId);
  if (!meta || !gameLoaders[gameId]) notFound();

  const loaded = await gameLoaders[gameId]();
  const game = loaded.default;
  const t = await getTranslations({ locale, namespace: meta.i18nKey });

  return (
    <Game3DShell
      game={game}
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

- [ ] **Step 2: Verify typecheck + build does not crash on empty registry**

Run: `npx tsc --noEmit`
Expected: exits 0. (With no games registered, `generateStaticParams` returns `[]` — the route simply pre-renders nothing yet, which is correct.)

- [ ] **Step 3: Commit**
```bash
git add "src/app/[locale]/play/[gameId]/page.tsx"
git commit -m "feat(games3d): add registry-driven dynamic /play/[gameId] route"
```

---

## Task 7: Append registry-rendered 3D section to `/play`

**Files:**
- Modify: `src/app/[locale]/play/page.tsx`

Render a "3D games" section from the registry, below the existing hardcoded text-game cards. Existing cards are untouched.

- [ ] **Step 1: Add the registry render**

At the top of `page.tsx` imports, add (the file already imports `Link` from `@/i18n/navigation` — reuse it, do not re-import):
```tsx
import { getRegisteredGames } from '@/lib/games3d/games';
```
Inside `PlayPage`, after the existing `t` translations are set up, add:
```tsx
  const games3d = getRegisteredGames();
  const tGames3d = await getTranslations({ locale, namespace: 'games3d' });
```
Then, in the returned JSX, after the existing topics grid, insert a new section (only when there are 3D games):
```tsx
        {games3d.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 text-2xl font-bold">{tGames3d('sectionTitle')}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {games3d.map((g) => {
                const gt = tGames3d.raw(g.meta.i18nKey.replace('games3d.', '')) as {
                  title: string;
                  description: string;
                };
                return (
                  <Link
                    key={g.meta.id}
                    href={`/play/${g.meta.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <span className="mb-2 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      3D · {tGames3d(`topics.${g.meta.topic}`)}
                    </span>
                    <h3 className="text-lg font-bold">{gt.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{gt.description}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {tGames3d('grades', { from: g.meta.gradeRange[0], to: g.meta.gradeRange[1] })}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. (Section is gated on `games3d.length > 0`, so it renders nothing until games register — safe.)

- [ ] **Step 3: Commit**
```bash
git add "src/app/[locale]/play/page.tsx"
git commit -m "feat(games3d): render 3D games section on /play from registry"
```

---

## Task 8: i18n scaffolding (section, topics, modes, grades)

**Files:**
- Modify: `messages/{he,en,ar,de,es,ru}/games3d.json`

Add the shared (non-per-game) keys the foundation needs. Per-game `title/description/instructions` blocks are added by each game task.

- [ ] **Step 1: Add shared keys to each locale's `games3d.json`**

Merge these top-level keys into `messages/he/games3d.json` (Hebrew shown; translate per locale):
```json
{
  "sectionTitle": "משחקי תלת-ממד",
  "grades": "כיתות {from}–{to}",
  "modes": { "choose": "בחר מצב", "practice": "תרגול", "quiz": "חידון" },
  "topics": {
    "arithmetic": "חשבון",
    "fractions": "שברים",
    "geometry": "גאומטריה",
    "units": "יחידות מידה"
  }
}
```
English (`en`):
```json
{
  "sectionTitle": "3D Games",
  "grades": "Grades {from}–{to}",
  "modes": { "choose": "Choose a mode", "practice": "Practice", "quiz": "Quiz" },
  "topics": { "arithmetic": "Arithmetic", "fractions": "Fractions", "geometry": "Geometry", "units": "Measurement" }
}
```
Arabic (`ar`):
```json
{
  "sectionTitle": "ألعاب ثلاثية الأبعاد",
  "grades": "الصفوف {from}–{to}",
  "modes": { "choose": "اختر الوضع", "practice": "تدريب", "quiz": "اختبار" },
  "topics": { "arithmetic": "الحساب", "fractions": "الكسور", "geometry": "الهندسة", "units": "وحدات القياس" }
}
```
German (`de`):
```json
{
  "sectionTitle": "3D-Spiele",
  "grades": "Klassen {from}–{to}",
  "modes": { "choose": "Modus wählen", "practice": "Üben", "quiz": "Quiz" },
  "topics": { "arithmetic": "Arithmetik", "fractions": "Brüche", "geometry": "Geometrie", "units": "Maßeinheiten" }
}
```
Spanish (`es`):
```json
{
  "sectionTitle": "Juegos 3D",
  "grades": "Grados {from}–{to}",
  "modes": { "choose": "Elige un modo", "practice": "Práctica", "quiz": "Cuestionario" },
  "topics": { "arithmetic": "Aritmética", "fractions": "Fracciones", "geometry": "Geometría", "units": "Medidas" }
}
```
Russian (`ru`):
```json
{
  "sectionTitle": "3D-игры",
  "grades": "Классы {from}–{to}",
  "modes": { "choose": "Выберите режим", "practice": "Практика", "quiz": "Викторина" },
  "topics": { "arithmetic": "Арифметика", "fractions": "Дроби", "geometry": "Геометрия", "units": "Единицы измерения" }
}
```

- [ ] **Step 2: Verify JSON is valid and app still builds**

Run: `node -e "['he','en','ar','de','es','ru'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'/games3d.json','utf8')))" && echo OK`
Expected: prints `OK`.

- [ ] **Step 3: Commit**
```bash
git add messages/*/games3d.json
git commit -m "feat(games3d): add shared i18n keys (section, topics, modes, grades)"
```

---

# PHASE 2 — Game 1: multiplication-array (proves the pipeline)

## Task 9: multiplication-array problem generator

**Files:**
- Create: `src/lib/games3d/games/multiplication-array/problems.ts`
- Test: `src/lib/games3d/games/multiplication-array/__tests__/problems.test.ts`

Problem shape: `{ rows: number; cols: number; product: number }`. Grade 3–4 factor range 2–10.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/games/multiplication-array/__tests__/problems.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createMultiplicationGenerator } from '../problems';

describe('multiplication generator', () => {
  it('produces factors within grade 3-4 range (2..10)', () => {
    const g = createMultiplicationGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.rows).toBeGreaterThanOrEqual(2);
      expect(p.rows).toBeLessThanOrEqual(10);
      expect(p.cols).toBeGreaterThanOrEqual(2);
      expect(p.cols).toBeLessThanOrEqual(10);
      expect(p.product).toBe(p.rows * p.cols);
    }
  });

  it('check() accepts the product and rejects others', () => {
    const g = createMultiplicationGenerator();
    const p = g.next();
    expect(g.check(p, p.product)).toBe(true);
    expect(g.check(p, p.product + 1)).toBe(false);
    expect(g.check(p, String(p.product))).toBe(false); // strict: number expected
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npm test -- multiplication-array`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/games3d/games/multiplication-array/problems.ts`:
```typescript
import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface MultiplicationProblem {
  rows: number;
  cols: number;
  product: number;
}

const MIN = 2;
const MAX = 10;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createMultiplicationGenerator(): ProblemGenerator<MultiplicationProblem> {
  return {
    next(): MultiplicationProblem {
      const rows = randInt(MIN, MAX);
      const cols = randInt(MIN, MAX);
      return { rows, cols, product: rows * cols };
    },
    check(problem: MultiplicationProblem, answer: unknown): boolean {
      return typeof answer === 'number' && answer === problem.product;
    },
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- multiplication-array`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/multiplication-array/problems.ts src/lib/games3d/games/multiplication-array/__tests__/problems.test.ts
git commit -m "feat(games3d): add multiplication-array problem generator"
```

---

## Task 10: multiplication-array Game3D implementation

**Files:**
- Create: `src/lib/games3d/games/multiplication-array/MultiplicationArrayGame.ts`

The child taps the baseplate to add a row or column of unit cubes; the overlay shows the prompt (`rows × cols = ?`) and the live count. Tapping the green "✓" target marker submits the current built count. Practice = endless; quiz = 10 problems via the controller.

> The prompt text and count are surfaced to the React overlay via `ctx.feedback.hint(...)` (which the OverlayHUD shows) and `ctx.score`. The built array dimensions are read from the child's taps. This keeps all text in HTML overlay.

- [ ] **Step 1: Implement the game**

`src/lib/games3d/games/multiplication-array/MultiplicationArrayGame.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMultiplicationGenerator, type MultiplicationProblem } from './problems';

const CUBE = 0.9;
const GAP = 0.1;
const STEP = CUBE + GAP;

export const multiplicationArrayGame: Game3D = {
  meta: {
    id: 'multiplication-array',
    i18nKey: 'games3d.multiplicationArray',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0, 0), 14);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createMultiplicationGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;

    const geo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f7cff });
    const group = new THREE.Group();
    ctx.scene.add(group);

    let problem: MultiplicationProblem = quiz ? quiz.state().current : generator.next();
    let builtRows = 1;
    let builtCols = 1;

    function showPrompt(): void {
      ctx.feedback.hint(`${problem.rows} × ${problem.cols} = ?  (${builtRows}×${builtCols} = ${builtRows * builtCols})`);
    }

    function rebuild(): void {
      group.clear();
      const offsetX = -((builtCols - 1) * STEP) / 2;
      const offsetZ = -((builtRows - 1) * STEP) / 2;
      for (let r = 0; r < builtRows; r++) {
        for (let c = 0; c < builtCols; c++) {
          const cube = new THREE.Mesh(geo, mat);
          cube.position.set(offsetX + c * STEP, CUBE / 2, offsetZ + r * STEP);
          group.add(cube);
        }
      }
      showPrompt();
    }

    // Confirm the current build as the answer.
    function confirm(): void {
      const answer = builtRows * builtCols;
      const ok = generator.check(problem, answer);
      if (ok) {
        ctx.audio.play('success');
        ctx.feedback.correct('+10');
        if (quiz) {
          quiz.submit(answer);
          if (quiz.state().finished) {
            ctx.complete(quiz.summary());
            return;
          }
          problem = quiz.state().current;
        } else {
          ctx.score.add(10);
          problem = generator.next();
        }
        builtRows = 1;
        builtCols = 1;
        rebuild();
      } else {
        ctx.audio.play('fail');
        ctx.feedback.wrong();
        if (quiz) {
          quiz.submit(answer);
          if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
          problem = quiz.state().current;
          builtRows = 1; builtCols = 1; rebuild();
        }
      }
    }

    // Tap left/right half adds a column; top/bottom half adds a row. Double-tap-ish confirm via the HUD button is out of scope;
    // here a tap with two fingers (pinch=0 not used) — simplify: tap adds a column, tap while holding shift adds a row.
    // Practical mapping for touch: tap adds a column; when builtCols reaches problem.cols, taps start adding rows.
    const offTap = ctx.input.on('tap', () => {
      if (builtCols < problem.cols) {
        builtCols += 1;
      } else if (builtRows < problem.rows) {
        builtRows += 1;
      }
      rebuild();
      if (builtRows === problem.rows && builtCols === problem.cols) {
        confirm();
      }
    });

    rebuild();

    return {
      onResize() {},
      dispose() {
        offTap();
        group.clear();
        geo.dispose();
        mat.dispose();
        ctx.scene.remove(group);
      },
    };
  },
};
```

> Note for the implementer: the tap-to-build mapping above is intentionally simple (fill columns then rows, auto-confirm when the array matches). During execution, verify the feel in the running app; if it's awkward, a clearer mapping is "tap empty grid cells to toggle cubes, tap the ✓ marker to confirm." Keep the `dispose()` contract intact whatever the mapping.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**
```bash
git add src/lib/games3d/games/multiplication-array/MultiplicationArrayGame.ts
git commit -m "feat(games3d): implement multiplication-array game"
```

---

## Task 11: Register multiplication-array + i18n

**Files:**
- Modify: `src/lib/games3d/games/index.ts`
- Modify: `messages/{he,en,ar,de,es,ru}/games3d.json`

- [ ] **Step 1: Register in `games/index.ts`**

Add the static import at the top:
```typescript
import { multiplicationArrayGame } from './multiplication-array/MultiplicationArrayGame';
```
Add to the `games` array:
```typescript
  multiplicationArrayGame,
```
Add to `gameLoaders`:
```typescript
  'multiplication-array': () =>
    import('./multiplication-array/MultiplicationArrayGame').then((m) => ({ default: m.multiplicationArrayGame })),
```

- [ ] **Step 2: Add per-game i18n**

Add a `multiplicationArray` block to each locale's `games3d.json`. Hebrew:
```json
  "multiplicationArray": {
    "title": "מערכי כפל",
    "description": "בנה מערך קוביות כדי לפתור תרגיל כפל",
    "instructions": "הקש כדי להוסיף קוביות עד שהמערך מתאים לתרגיל"
  }
```
English:
```json
  "multiplicationArray": {
    "title": "Multiplication Arrays",
    "description": "Build a cube array to solve a multiplication fact",
    "instructions": "Tap to add cubes until the array matches the problem"
  }
```
(Arabic/German/Spanish/Russian: translate the same three fields. Suggested:
`ar`: "مصفوفات الضرب" / "ابنِ مصفوفة مكعبات لحل مسألة ضرب" / "انقر لإضافة مكعبات حتى تطابق المصفوفة المسألة".
`de`: "Multiplikations-Felder" / "Baue ein Würfelfeld, um eine Multiplikation zu lösen" / "Tippe, um Würfel hinzuzufügen, bis das Feld zur Aufgabe passt".
`es`: "Arreglos de multiplicación" / "Construye un arreglo de cubos para resolver una multiplicación" / "Toca para añadir cubos hasta que el arreglo coincida con el problema".
`ru`: "Массивы умножения" / "Постройте массив кубиков, чтобы решить умножение" / "Нажимайте, чтобы добавлять кубики, пока массив не совпадёт с задачей".)

- [ ] **Step 3: Verify foundation tests + JSON + typecheck**

Run: `npm test -- games/__tests__/index && npx tsc --noEmit && node -e "['he','en','ar','de','es','ru'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'/games3d.json','utf8')))" && echo OK`
Expected: index tests pass (now 1 game), tsc 0, prints OK.

- [ ] **Step 4: Commit**
```bash
git add src/lib/games3d/games/index.ts messages/*/games3d.json
git commit -m "feat(games3d): register multiplication-array and add its translations"
```

---

## Task 12: Verify multiplication-array end-to-end

**Files:** none (verification).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds; `/play/[gameId]` appears as a dynamic/SSG route and `multiplication-array` is among prerendered params.

- [ ] **Step 2: Perf benchmark (dev server running)**

```bash
npm run dev   # terminal 1
PERF_URL=http://localhost:3000/en/play/multiplication-array PERF_DURATION_MS=8000 npm run perf:games3d  # terminal 2, after picking a mode in-browser once if needed
```
Expected: avg ≥55fps, p95-low ≥30fps, heap delta <20MB. (If the mode picker blocks rendering, the benchmark URL can append a mode once `?mode=` support is considered; for now pick a mode manually in a browser tab, or temporarily default single-mode for the perf run. Record the numbers.)

- [ ] **Step 3: Manual smoke (browser, dev)**

Visit `http://localhost:3000/he/play/multiplication-array`: mode picker shows; choose תרגול; tapping builds cubes; prompt + count update; matching the array fires success + score; mute works; navigate away and back 5× → no heap growth in DevTools.

- [ ] **Step 4: Commit (if any tweaks were needed)**
```bash
git add -A && git commit -m "chore(games3d): verify multiplication-array end-to-end" || echo "nothing to commit"
```

---

# PHASE 3 — Game 2: measure-fill

## Task 13: measure-fill problem generator

**Files:**
- Create: `src/lib/games3d/games/measure-fill/problems.ts`
- Test: `src/lib/games3d/games/measure-fill/__tests__/problems.test.ts`

Problem shape: `{ targetMl: number; capacityMl: number }`. Targets on 50 ml graduations; capacity 1000 ml.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/games/measure-fill/__tests__/problems.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createMeasureFillGenerator, MEASURE_TOLERANCE_ML } from '../problems';

describe('measure-fill generator', () => {
  it('targets are positive multiples of 50 within capacity', () => {
    const g = createMeasureFillGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(p.targetMl % 50).toBe(0);
      expect(p.targetMl).toBeGreaterThan(0);
      expect(p.targetMl).toBeLessThanOrEqual(p.capacityMl);
    }
  });

  it('check() accepts answers within tolerance and rejects outside', () => {
    const g = createMeasureFillGenerator();
    const p = { targetMl: 250, capacityMl: 1000 };
    expect(g.check(p, 250)).toBe(true);
    expect(g.check(p, 250 + MEASURE_TOLERANCE_ML)).toBe(true);
    expect(g.check(p, 250 + MEASURE_TOLERANCE_ML + 1)).toBe(false);
    expect(g.check(p, 'x')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect fail** — `npm test -- measure-fill` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/lib/games3d/games/measure-fill/problems.ts`:
```typescript
import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface MeasureFillProblem {
  targetMl: number;
  capacityMl: number;
}

export const MEASURE_TOLERANCE_ML = 25;
const CAPACITY = 1000;
const STEP = 50;

export function createMeasureFillGenerator(): ProblemGenerator<MeasureFillProblem> {
  return {
    next(): MeasureFillProblem {
      const steps = Math.floor(CAPACITY / STEP); // 20
      const n = Math.floor(Math.random() * steps) + 1; // 1..20
      return { targetMl: n * STEP, capacityMl: CAPACITY };
    },
    check(problem: MeasureFillProblem, answer: unknown): boolean {
      return typeof answer === 'number' && Math.abs(answer - problem.targetMl) <= MEASURE_TOLERANCE_ML;
    },
  };
}
```

- [ ] **Step 4: Run test, expect pass** — `npm test -- measure-fill` → 2 PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/measure-fill/problems.ts src/lib/games3d/games/measure-fill/__tests__/problems.test.ts
git commit -m "feat(games3d): add measure-fill problem generator"
```

---

## Task 14: measure-fill Game3D implementation

**Files:**
- Create: `src/lib/games3d/games/measure-fill/MeasureFillGame.ts`

Transparent graduated cylinder; child drags vertically to set the liquid level; the overlay shows target + current ml; releasing (dragEnd) submits.

- [ ] **Step 1: Implement**

`src/lib/games3d/games/measure-fill/MeasureFillGame.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createMeasureFillGenerator, type MeasureFillProblem } from './problems';

const CONTAINER_H = 4;
const RADIUS = 1.2;

export const measureFillGame: Game3D = {
  meta: {
    id: 'measure-fill',
    i18nKey: 'games3d.measureFill',
    topic: 'units',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.locked(new THREE.Vector3(0, 2, 8), new THREE.Vector3(0, 2, 0));
    ctx.presets.lighting.soft(ctx.scene);

    const generator = createMeasureFillGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: MeasureFillProblem = quiz ? quiz.state().current : generator.next();

    // Glass
    const glassGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, CONTAINER_H, 32, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x99ccff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = CONTAINER_H / 2;
    ctx.scene.add(glass);

    // Liquid
    const liquidGeo = new THREE.CylinderGeometry(RADIUS * 0.92, RADIUS * 0.92, 1, 32);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x2196f3 });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    ctx.scene.add(liquid);

    let fillMl = 0;
    function setFill(ml: number): void {
      fillMl = Math.max(0, Math.min(problem.capacityMl, ml));
      const frac = fillMl / problem.capacityMl;
      liquid.scale.y = Math.max(0.001, frac * CONTAINER_H);
      liquid.position.y = (liquid.scale.y) / 2;
      ctx.feedback.hint(`${ctxTarget()} | ${Math.round(fillMl)} ml`);
    }
    function ctxTarget(): string { return `→ ${problem.targetMl} ml`; }

    function nextOrComplete(): void {
      if (quiz) {
        if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      setFill(0);
    }

    const offDrag = ctx.input.on('drag', (p) => {
      // p.y is normalized 0..1 (top=0). Map to fill fraction (bottom = full pour control).
      const frac = 1 - Math.min(1, Math.max(0, p.y));
      setFill(frac * problem.capacityMl);
    });
    const offDragEnd = ctx.input.on('dragEnd', () => {
      const ok = generator.check(problem, fillMl);
      if (ok) { ctx.audio.play('success'); ctx.feedback.correct('+10'); if (!quiz) ctx.score.add(10); }
      else { ctx.audio.play('fail'); ctx.feedback.wrong(); }
      if (quiz) {
        quiz.submit(fillMl);
        nextOrComplete();
      } else if (ok) {
        nextOrComplete();
      }
    });

    setFill(0);

    return {
      dispose() {
        offDrag();
        offDragEnd();
        ctx.scene.remove(glass); glassGeo.dispose(); glassMat.dispose();
        ctx.scene.remove(liquid); liquidGeo.dispose(); liquidMat.dispose();
      },
    };
  },
};
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → 0.
- [ ] **Step 3: Commit**
```bash
git add src/lib/games3d/games/measure-fill/MeasureFillGame.ts
git commit -m "feat(games3d): implement measure-fill game"
```

---

## Task 15: Register measure-fill + i18n + verify

**Files:**
- Modify: `src/lib/games3d/games/index.ts`
- Modify: `messages/{he,en,ar,de,es,ru}/games3d.json`

- [ ] **Step 1: Register** — add `import { measureFillGame } from './measure-fill/MeasureFillGame';`, push to `games`, add loader key `'measure-fill'` (mirror Task 11 pattern).
- [ ] **Step 2: i18n** — add `measureFill` block to each locale. Hebrew: `{ "title": "מילוי מיכל", "description": "מלא את המיכל עד הנפח המבוקש", "instructions": "גרור כדי לצקת נוזל עד הסימון המבוקש" }`. English: `{ "title": "Fill the Container", "description": "Fill the container to the target volume", "instructions": "Drag to pour liquid to the target mark" }`. (ar: "ملء الوعاء"; de: "Behälter füllen"; es: "Llena el recipiente"; ru: "Наполни сосуд" — with matching description/instructions.)
- [ ] **Step 3: Verify** — `npm test -- games/__tests__/index && npx tsc --noEmit && node -e "['he','en','ar','de','es','ru'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'/games3d.json','utf8')))" && echo OK` → index tests pass (2 games), tsc 0, OK.
- [ ] **Step 4: Manual + perf** — visit `/he/play/measure-fill`, drag to fill, release to submit; run `PERF_URL=…/play/measure-fill npm run perf:games3d`. Expected ≥55fps avg.
- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/index.ts messages/*/games3d.json
git commit -m "feat(games3d): register measure-fill and add its translations"
```

---

# PHASE 4 — Game 3: fraction-build

## Task 16: fraction-build problem generator

**Files:**
- Create: `src/lib/games3d/games/fraction-build/problems.ts`
- Test: `src/lib/games3d/games/fraction-build/__tests__/problems.test.ts`

Problem shape: `{ numerator: number; denominator: number }`. Denominators ∈ {2,3,4,5,6,8,10}; 1 ≤ numerator < denominator. Answer = number of filled slices.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/games/fraction-build/__tests__/problems.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createFractionGenerator, FRACTION_DENOMINATORS } from '../problems';

describe('fraction-build generator', () => {
  it('produces proper fractions with allowed denominators', () => {
    const g = createFractionGenerator();
    for (let i = 0; i < 200; i++) {
      const p = g.next();
      expect(FRACTION_DENOMINATORS).toContain(p.denominator);
      expect(p.numerator).toBeGreaterThanOrEqual(1);
      expect(p.numerator).toBeLessThan(p.denominator);
    }
  });

  it('check() accepts the numerator (filled-slice count) and rejects others', () => {
    const g = createFractionGenerator();
    const p = { numerator: 3, denominator: 4 };
    expect(g.check(p, 3)).toBe(true);
    expect(g.check(p, 2)).toBe(false);
    expect(g.check(p, '3')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail** — `npm test -- fraction-build` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/games3d/games/fraction-build/problems.ts`:
```typescript
import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface FractionProblem {
  numerator: number;
  denominator: number;
}

export const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10] as const;

export function createFractionGenerator(): ProblemGenerator<FractionProblem> {
  return {
    next(): FractionProblem {
      const denominator = FRACTION_DENOMINATORS[Math.floor(Math.random() * FRACTION_DENOMINATORS.length)];
      const numerator = Math.floor(Math.random() * (denominator - 1)) + 1; // 1..denominator-1
      return { numerator, denominator };
    },
    check(problem: FractionProblem, answer: unknown): boolean {
      return typeof answer === 'number' && answer === problem.numerator;
    },
  };
}
```

- [ ] **Step 4: Run, expect pass** — 2 PASS.
- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/fraction-build/problems.ts src/lib/games3d/games/fraction-build/__tests__/problems.test.ts
git commit -m "feat(games3d): add fraction-build problem generator"
```

---

## Task 17: fraction-build Game3D implementation

**Files:**
- Create: `src/lib/games3d/games/fraction-build/FractionBuildGame.ts`

A pie (cylinder) split into `denominator` wedge meshes; tapping a wedge toggles it filled; the overlay shows the target fraction + filled count; a confirm fires when filled count is submitted. For simplicity, auto-check after each tap: when filled === numerator, success.

- [ ] **Step 1: Implement**

`src/lib/games3d/games/fraction-build/FractionBuildGame.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createFractionGenerator, type FractionProblem } from './problems';

const RADIUS = 3;
const HEIGHT = 0.6;

export const fractionBuildGame: Game3D = {
  meta: {
    id: 'fraction-build',
    i18nKey: 'games3d.fractionBuild',
    topic: 'fractions',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 9);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createFractionGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: FractionProblem = quiz ? quiz.state().current : generator.next();

    const group = new THREE.Group();
    ctx.scene.add(group);
    const emptyMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const fillMat = new THREE.MeshStandardMaterial({ color: 0xff7043 });
    const wedgeGeos: THREE.CylinderGeometry[] = [];
    let wedges: THREE.Mesh[] = [];
    const filled = new Set<number>();

    function buildPie(): void {
      group.clear();
      wedgeGeos.forEach((g) => g.dispose());
      wedgeGeos.length = 0;
      wedges = [];
      filled.clear();
      const n = problem.denominator;
      const theta = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const geo = new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, 32, 1, false, i * theta, theta);
        wedgeGeos.push(geo);
        const wedge = new THREE.Mesh(geo, emptyMat);
        wedge.userData.index = i;
        group.add(wedge);
        wedges.push(wedge);
      }
      showPrompt();
    }

    function showPrompt(): void {
      ctx.feedback.hint(`${problem.numerator}/${problem.denominator}  (${filled.size}/${problem.denominator})`);
    }

    function advance(): void {
      if (quiz) {
        if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      buildPie();
    }

    const offTap = ctx.input.on('tap', (p) => {
      const idx = p.picked?.userData?.index;
      if (typeof idx !== 'number') return;
      if (filled.has(idx)) { filled.delete(idx); wedges[idx].material = emptyMat; }
      else { filled.add(idx); wedges[idx].material = fillMat; }
      showPrompt();
      // auto-confirm when count matches numerator
      if (filled.size === problem.numerator) {
        ctx.audio.play('success'); ctx.feedback.correct('+10');
        if (quiz) { quiz.submit(filled.size); advance(); }
        else { ctx.score.add(10); advance(); }
      }
    });

    buildPie();

    return {
      dispose() {
        offTap();
        group.clear();
        wedgeGeos.forEach((g) => g.dispose());
        emptyMat.dispose();
        fillMat.dispose();
        ctx.scene.remove(group);
      },
    };
  },
};
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → 0.
- [ ] **Step 3: Commit**
```bash
git add src/lib/games3d/games/fraction-build/FractionBuildGame.ts
git commit -m "feat(games3d): implement fraction-build game"
```

---

## Task 18: Register fraction-build + i18n + verify

- [ ] **Step 1: Register** — `import { fractionBuildGame } from './fraction-build/FractionBuildGame';`, push to `games`, loader `'fraction-build'` (mirror Task 11).
- [ ] **Step 2: i18n** — `fractionBuild` block per locale. Hebrew: `{ "title": "בונה שברים", "description": "מלא חלקים מהעוגה כדי להתאים לשבר", "instructions": "הקש על פלחים כדי למלא אותם עד שמתאים לשבר המבוקש" }`. English: `{ "title": "Fraction Builder", "description": "Fill parts of the pie to match the fraction", "instructions": "Tap slices to fill them until they match the target fraction" }`. (ar: "بناء الكسور"; de: "Bruch-Baumeister"; es: "Constructor de fracciones"; ru: "Конструктор дробей".)
- [ ] **Step 3: Verify** — `npm test -- games/__tests__/index && npx tsc --noEmit && node -e "['he','en','ar','de','es','ru'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'/games3d.json','utf8')))" && echo OK` → 3 games, tsc 0, OK.
- [ ] **Step 4: Manual + perf** — `/he/play/fraction-build`; tap wedges; `PERF_URL=…/play/fraction-build npm run perf:games3d`.
- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/index.ts messages/*/games3d.json
git commit -m "feat(games3d): register fraction-build and add its translations"
```

---

# PHASE 5 — Game 4: area-perimeter

## Task 19: area-perimeter problem generator

**Files:**
- Create: `src/lib/games3d/games/area-perimeter/problems.ts`
- Test: `src/lib/games3d/games/area-perimeter/__tests__/problems.test.ts`

Problem shape: `{ kind: 'area' | 'perimeter'; target: number }`. Solvable with integer w,h in 1..10. Answer = the current rectangle's area or perimeter.

- [ ] **Step 1: Write the failing test**

`src/lib/games3d/games/area-perimeter/__tests__/problems.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAreaPerimeterGenerator, MAX_SIDE } from '../problems';

describe('area-perimeter generator', () => {
  it('targets are solvable with integer sides within the grid', () => {
    const g = createAreaPerimeterGenerator();
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      let solvable = false;
      for (let w = 1; w <= MAX_SIDE && !solvable; w++) {
        for (let h = 1; h <= MAX_SIDE; h++) {
          const value = p.kind === 'area' ? w * h : 2 * (w + h);
          if (value === p.target) { solvable = true; break; }
        }
      }
      expect(solvable).toBe(true);
    }
  });

  it('check() matches the rectangle metric to the target', () => {
    const g = createAreaPerimeterGenerator();
    expect(g.check({ kind: 'area', target: 12 }, { width: 3, height: 4 })).toBe(true);
    expect(g.check({ kind: 'area', target: 12 }, { width: 2, height: 4 })).toBe(false);
    expect(g.check({ kind: 'perimeter', target: 14 }, { width: 3, height: 4 })).toBe(true);
    expect(g.check({ kind: 'perimeter', target: 14 }, { width: 3, height: 3 })).toBe(false);
    expect(g.check({ kind: 'area', target: 12 }, 12)).toBe(false); // needs {width,height}
  });
});
```

- [ ] **Step 2: Run, expect fail** — `npm test -- area-perimeter` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/games3d/games/area-perimeter/problems.ts`:
```typescript
import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface AreaPerimeterProblem {
  kind: 'area' | 'perimeter';
  target: number;
}

export interface RectAnswer {
  width: number;
  height: number;
}

export const MAX_SIDE = 10;

function isRectAnswer(a: unknown): a is RectAnswer {
  return typeof a === 'object' && a !== null
    && typeof (a as RectAnswer).width === 'number'
    && typeof (a as RectAnswer).height === 'number';
}

export function createAreaPerimeterGenerator(): ProblemGenerator<AreaPerimeterProblem> {
  return {
    next(): AreaPerimeterProblem {
      const kind: 'area' | 'perimeter' = Math.random() < 0.5 ? 'area' : 'perimeter';
      const w = Math.floor(Math.random() * MAX_SIDE) + 1;
      const h = Math.floor(Math.random() * MAX_SIDE) + 1;
      const target = kind === 'area' ? w * h : 2 * (w + h);
      return { kind, target };
    },
    check(problem: AreaPerimeterProblem, answer: unknown): boolean {
      if (!isRectAnswer(answer)) return false;
      const value =
        problem.kind === 'area'
          ? answer.width * answer.height
          : 2 * (answer.width + answer.height);
      return value === problem.target;
    },
  };
}
```

- [ ] **Step 4: Run, expect pass** — 2 PASS.
- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/area-perimeter/problems.ts src/lib/games3d/games/area-perimeter/__tests__/problems.test.ts
git commit -m "feat(games3d): add area-perimeter problem generator"
```

---

## Task 20: area-perimeter Game3D implementation

**Files:**
- Create: `src/lib/games3d/games/area-perimeter/AreaPerimeterGame.ts`

A rectangle of extruded unit tiles on a grid; a corner handle the child drags to change width/height (in integer units); overlay shows kind + target + current area/perimeter; dragEnd submits.

- [ ] **Step 1: Implement**

`src/lib/games3d/games/area-perimeter/AreaPerimeterGame.ts`:
```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { createAreaPerimeterGenerator, type AreaPerimeterProblem } from './problems';

const TILE = 1;
const MAX = 10;

export const areaPerimeterGame: Game3D = {
  meta: {
    id: 'area-perimeter',
    i18nKey: 'games3d.areaPerimeter',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 150,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.topDown(new THREE.Vector3(MAX / 2, 0, MAX / 2), 14);
    ctx.presets.lighting.daylight(ctx.scene);

    const generator = createAreaPerimeterGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: 10, pointsPerCorrect: 10 })
        : null;
    let problem: AreaPerimeterProblem = quiz ? quiz.state().current : generator.next();

    const group = new THREE.Group();
    ctx.scene.add(group);
    const tileGeo = new THREE.BoxGeometry(TILE * 0.95, 0.3, TILE * 0.95);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a });
    let width = 2;
    let height = 2;

    function metric(): number {
      return problem.kind === 'area' ? width * height : 2 * (width + height);
    }
    function showPrompt(): void {
      ctx.feedback.hint(`${problem.kind}=${problem.target} | ${width}×${height} (${metric()})`);
    }
    function rebuild(): void {
      group.clear();
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < height; z++) {
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(x + 0.5, 0.15, z + 0.5);
          group.add(tile);
        }
      }
      showPrompt();
    }
    function advance(): void {
      width = 2; height = 2;
      if (quiz) {
        if (quiz.state().finished) { ctx.complete(quiz.summary()); return; }
        problem = quiz.state().current;
      } else {
        problem = generator.next();
      }
      rebuild();
    }

    const offDrag = ctx.input.on('drag', (p) => {
      // map normalized pointer to integer width/height within [1, MAX]
      width = Math.max(1, Math.min(MAX, Math.round(p.x * MAX)));
      height = Math.max(1, Math.min(MAX, Math.round((1 - p.y) * MAX)));
      rebuild();
    });
    const offDragEnd = ctx.input.on('dragEnd', () => {
      const ok = generator.check(problem, { width, height });
      if (ok) { ctx.audio.play('success'); ctx.feedback.correct('+10'); if (!quiz) ctx.score.add(10); }
      else { ctx.audio.play('fail'); ctx.feedback.wrong(); }
      if (quiz) { quiz.submit({ width, height }); advance(); }
      else if (ok) { advance(); }
    });

    rebuild();

    return {
      dispose() {
        offDrag(); offDragEnd();
        group.clear();
        tileGeo.dispose(); tileMat.dispose();
        ctx.scene.remove(group);
      },
    };
  },
};
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → 0.
- [ ] **Step 3: Commit**
```bash
git add src/lib/games3d/games/area-perimeter/AreaPerimeterGame.ts
git commit -m "feat(games3d): implement area-perimeter game"
```

---

## Task 21: Register area-perimeter + i18n + verify

- [ ] **Step 1: Register** — `import { areaPerimeterGame } from './area-perimeter/AreaPerimeterGame';`, push to `games`, loader `'area-perimeter'`.
- [ ] **Step 2: i18n** — `areaPerimeter` block per locale. Hebrew: `{ "title": "שטח והיקף", "description": "בנה מלבן עם שטח או היקף נתון", "instructions": "גרור כדי לשנות את גודל המלבן עד שהשטח/ההיקף מתאים" }`. English: `{ "title": "Area & Perimeter", "description": "Build a rectangle with a given area or perimeter", "instructions": "Drag to resize the rectangle until the area/perimeter matches" }`. (ar: "المساحة والمحيط"; de: "Fläche & Umfang"; es: "Área y perímetro"; ru: "Площадь и периметр".)
- [ ] **Step 3: Verify** — `npm test -- games/__tests__/index && npx tsc --noEmit && node -e "['he','en','ar','de','es','ru'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'/games3d.json','utf8')))" && echo OK` → 4 games, tsc 0, OK.
- [ ] **Step 4: Manual + perf** — `/he/play/area-perimeter`; drag to resize; `PERF_URL=…/play/area-perimeter npm run perf:games3d`.
- [ ] **Step 5: Commit**
```bash
git add src/lib/games3d/games/index.ts messages/*/games3d.json
git commit -m "feat(games3d): register area-perimeter and add its translations"
```

---

# PHASE 6 — Playwright E2E + close-out

## Task 22: Playwright setup

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install Playwright**

Run: `npm i -D @playwright/test && npx playwright install chromium`
Expected: installs without errors.

- [ ] **Step 2: Add e2e script to `package.json`**

In `scripts`, add:
```json
    "e2e": "playwright test"
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/en',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json playwright.config.ts
git commit -m "chore(games3d): add Playwright for E2E"
```

---

## Task 23: E2E happy-path specs

**Files:**
- Create: `e2e/games3d.spec.ts`

- [ ] **Step 1: Write the specs**

`e2e/games3d.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

const GAMES = ['multiplication-array', 'measure-fill', 'fraction-build', 'area-perimeter'];

test.describe('3D games', () => {
  test('all games are listed on /play', async ({ page }) => {
    await page.goto('/en/play');
    for (const id of GAMES) {
      await expect(page.locator(`a[href$="/play/${id}"]`)).toBeVisible();
    }
  });

  for (const id of GAMES) {
    test(`${id}: loads, shows mode picker, enters practice`, async ({ page }) => {
      await page.goto(`/en/play/${id}`);
      // Mode picker
      const practice = page.getByRole('button', { name: 'Practice' });
      await expect(practice).toBeVisible();
      await practice.click();
      // Canvas mounts
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    });
  }
});
```

> Note: deeper interaction (tapping/dragging to a correct answer through to the completion summary) is hard to drive reliably on a WebGL canvas via Playwright coordinates. The happy-path here asserts load → mode picker → scene mount, which catches routing/registry/mode regressions. Interaction correctness is covered by the unit tests on generators + quiz controller and by manual verification.

- [ ] **Step 2: Run E2E**

Run: `npm run e2e`
Expected: all specs pass (5 tests: 1 listing + 4 per-game). If `dev` is already running on 3000, `reuseExistingServer` uses it.

- [ ] **Step 3: Commit**
```bash
git add e2e/games3d.spec.ts
git commit -m "test(games3d): add Playwright happy-path E2E for the 4 games"
```

---

## Task 24: Full close-out verification

**Files:** none (verification + any final fixes).

- [ ] **Step 1: Full gate**

Run, in order:
```bash
npm test            # all vitest green (foundation + 4 generators + quiz + components)
npx tsc --noEmit    # 0
npm run lint        # 0 errors
npm run build       # succeeds; 4 games in /play/[gameId] prerender params
npm run e2e         # green
```
Expected: every command green.

- [ ] **Step 2: Per-game perf**

For each id run `PERF_URL=http://localhost:3000/en/play/<id> PERF_DURATION_MS=8000 npm run perf:games3d`. Record avg / p95-low / heap. Expected: avg ≥55, p95-low ≥30, heap <20MB. Flag any game that misses.

- [ ] **Step 3: Manual matrix**

For each game, in a browser: practice + quiz both reachable; quiz reaches a completion summary; mute persists; tab-blur pauses & resumes; 5× in/out no heap growth; RTL framing correct in `he` and `ar`.

- [ ] **Step 4: Final commit (marker)**
```bash
git commit --allow-empty -m "chore(games3d): batch 1 (4 games) complete — sub-project #3"
```

---

## Notes for future batches (sub-project #4+)

Adding a game now requires exactly: (1) a folder under `src/lib/games3d/games/<id>/` with `problems.ts` (+ test) and `<Name>Game.ts`; (2) two lines in `games/index.ts` (push to `games`, add a `gameLoaders` entry); (3) a `games3d.<key>` block in the 6 locale files. No route files, no `/play` edits, no engine changes. The dynamic route, listing, mode picker, and quiz controller all pick it up automatically.
