# Orchestration Prompt — Build the 40 Games (tirgul.net 3D learning games)

> Paste this whole file as the prompt (optionally append: `Build games: <id1>, <id2>, …` or `Build the recommended next 5`). You are the **main orchestrator**. You do NOT write game code yourself — you manage sub-agents. Per game you run a 3-agent chain (implementer → reviewer → approver/committer), do a browser visual check yourself, then move to the next game. Work sequentially (one game at a time): games share `catalog.ts` / `loaders.ts` / the 6 `games3d.json` files, so parallel implementers would conflict.

---

## 0. Inputs & where everything lives

- **Repo:** `/Users/asafbenatia/Projects/_personal/workpages/math-portal`, branch `feature/games3d-infrastructure` (NOT main — building here is fine).
- **The catalog (READ IT FIRST):** `docs/games/40-games-catalog.html` — open/read it; the `GAMES` array in its `<script>` holds every game's `id, he, en, topic, g (grade range), pri, mech (mechanic), theme, teaches, ins/url (inspiration)`. This is the source of truth for WHAT each game is.
- **The kit (read `src/lib/games3d/kit/index.ts` + modules):** `applyClayLook(ctx, opts)→{dispose}`, `PALETTE`/`PALETTE_SERIES`, `roundedBox(w,h,d,radius,segments)`, juice `popIn`/`punch`/`shake`/`tweenTo` (+ shared `tweenGroup`, already updated by the engine), `confetti` `celebrate()`/`bigCelebrate()`, `computeStars(accuracy)`.
- **Engine channels on `SceneContext`** (read `src/lib/games3d/engine/SceneContext.ts` + `types.ts`): `ctx.prompt.set/clear`, `ctx.controls.set/clear` (HTML overlay buttons), `ctx.status.set/clear` (stars/streak/progress), `ctx.t(key, params?)` (i18n in the `games3d` namespace), plus `ctx.scene/camera/input/audio/score/feedback/presets/mode`.
- **Reference games (COPY THEIR PATTERNS — they're built, polished, and browser-verified):**
  `src/lib/games3d/games/multiplication-array/` (chocolate, tap/buttons),
  `src/lib/games3d/games/measure-fill/` (juice glass, drag + ±),
  `src/lib/games3d/games/fraction-build/` (pizza, tap-toggle + olives),
  `src/lib/games3d/games/area-perimeter/` (garden plot, drag-resize + ±).
- **Registration:** `src/lib/games3d/games/catalog.ts` (static `games[]` array + `getRegisteredGames`) and `src/lib/games3d/games/loaders.ts` (`gameLoaders` lazy map + `GAME_IDS`). The dynamic route `src/app/[locale]/play/[gameId]/page.tsx` and the `/play` listing pick games up automatically — **no new route files, ever**.
- **HOW-TO:** `docs/games/HOW-TO-ADD-A-3D-GAME.md`.
- **Dev server:** run `PORT=3002 npm run dev` in the background once at the start (port 3000 is taken by another app — never assume 3000). Use `?mode=practice` / `?mode=quiz` deep-links to skip the mode picker for checks.

---

## 1. THE DEFINITIONS ("our rules") — every game MUST satisfy these

These are hard-won; a game is NOT done until all hold. The reviewer and your browser check enforce them.

**Structure**
1. One folder `src/lib/games3d/games/<id>/` with `problems.ts` (+ `__tests__/problems.test.ts`) and `<PascalName>Game.ts` exporting `<camelName>Game: Game3D`.
2. Register with exactly: a static import + push to `games[]` in `catalog.ts`, and one lazy entry in `loaders.ts` `gameLoaders`. Nothing else.
3. i18n block `<i18nKey-suffix>` added to ALL 6 locales (`he, en, ar, de, es, ru`) under `games3d`, merged (never remove existing keys). `meta.i18nKey = "games3d.<suffix>"`.
4. `meta`: correct `id` (kebab, == loader key), `i18nKey`, `topic`, `gradeRange` (from catalog), `difficulty`, `estimatedSeconds`, `supportedModes: ['practice','quiz']`.

**Modes & learning**
5. **practice** (endless, no fail-out — wrong keeps state so the child can fix it) AND **quiz** (10 problems, scored, `computeStars(accuracy)` + `bigCelebrate()` on finish, then `ctx.complete(summary)`).
6. **A wrong answer must be genuinely possible.** No "auto-win when it matches" — the child commits via the **Check** button. Quiz accuracy must be able to be < 100%.
7. In quiz mode mirror the score to the HUD: after `quiz.submit(...)` call `ctx.score.set(quiz.state().score)`. Track a `streak`; set `ctx.status.set({streak, progress:{current,total:10}})` (quiz) or `{streak, stars, maxStars:3}` (practice).

**Interaction (hybrid — this is what the user chose)**
8. Controls via `ctx.controls.set([...])`: fast **drag** for building/sizing PLUS on-screen **−/+ buttons** for fine control & undo, PLUS **`בדוק`/Check** (variant `confirm`) and **`נקה`/Reset** (variant `reset`). Labels via `ctx.t('controls.*')` (keys exist: rows/columns/width/height/total/check/reset). Re-`set` controls when state changes so handlers read fresh state (or use a ref object).
9. **Natural input directions** — dragging up = more, right = wider, etc. NEVER inverted. Remember `PointerInfo.x/y` are NDC −1..1; and Three's `CylinderGeometry` maps angle θ→(x,z)=(sinθ,cosθ) — match that convention when placing things on wedges/circles.

**Visual & text (the contrast lesson)**
10. Theme each game with its catalog `theme` as a real-world procedural skin (no asset files — geometry only). Call `applyClayLook(ctx, opts)` and dispose it.
11. **Prompt shows the TASK ONLY** via `ctx.prompt.set(ctx.t('<game>.prompt', {...}))` — the target + nothing that reveals success. Do NOT echo the live built value ("you built X / now X ml") in the prompt; the 3D scene shows progress. Add a short persistent **how-to** via the game's `instructions` i18n (already surfaced under the prompt by the shell — keep the `instructions` string accurate to the real interaction). Success is revealed ONLY after Check (the feedback toast).
12. **Contrast: every overlay text element sits on a dark pill or a solid button. NEVER light text on the light clay background.** (The HUD already does this; if you add any overlay text, give it a backing.) No transparent/outline buttons on light scenes.
13. Use `ctx.feedback.correct(...)`/`wrong(...)` for transient feedback; `celebrate()` on correct, `shake(...)` on wrong (gentle, never punishing), `punch(...)` on success.

**Correctness & hygiene**
14. **`dispose()` leak-free (top priority):** unsubscribe every input listener, `ctx.controls.clear()`, `ctx.prompt.clear()`, `ctx.status.clear()`, `clayLook.dispose()`, stop all game tweens (track them in a Set + `track()` wrapper like the reference games), remove every object added to the scene, and dispose every geometry + material created. Reuse shared geo/mat (one per kind) — don't allocate per-frame or per-toggle without disposing.
15. **Procedural only**, ≤ perf budget, target 60fps mobile. Use **Context7 MCP** to confirm any library API before using it (`@tweenjs/tween.js` v25, `three` geometries/materials, `canvas-confetti`) — don't guess.
16. **TDD the logic:** write `problems.ts` + generator tests first (valid ranges per grade, no degenerate/unsolvable problems, strict `check()`), red→green.

**Gate (all must pass, report actual results):** `npx tsc --noEmit` (0) · `npm test` (all pass) · `npm run lint` (0 errors; the one `coverage/` warning is pre-existing/ok) · `npm run build` (succeeds) · `curl -sL -o /dev/null -w "%{http_code}" "http://localhost:3002/play/<id>?mode=practice"` (200).

---

## 2. Per-game workflow (the 3-agent chain you orchestrate)

For each game, in order:

### Step A — Implementer sub-agent (model: **opus**, agentType: general-purpose)
Dispatch with a prompt containing: the game's full catalog row (id/he/en/topic/grade/mech/theme/teaches/inspiration-url), the §1 DEFINITIONS (paste them), pointers to the kit + the 4 reference games + HOW-TO, and the instruction to STUDY a reference game first. It must: use Context7 for APIs; TDD `problems.ts`; implement `<Name>Game.ts` on the kit with the theme + hybrid controls + task-only prompt + rewards + leak-free dispose; register (catalog.ts + loaders.ts) + i18n in 6 locales; run the full gate; commit is NOT its job (the approver commits) — but it should leave the working tree complete and report the gate results + a self-review against §1.

### Step B — Reviewer sub-agent (model: sonnet)
Dispatch AFTER the implementer reports DONE. Give it the game's requirements + the §1 DEFINITIONS as a checklist. It must NOT trust the implementer — read the actual code and verify, point by point: structure/registration/i18n-in-6-locales, practice+quiz, **wrong-answer genuinely possible**, **prompt task-only (no live result)**, **contrast (no light-on-light)**, **dispose leak-free** (every created geo/mat disposed, listeners unsubscribed, tweens stopped), natural input directions + correct angle conventions, Context7-confirmed APIs, kit usage, and re-run the gate (tsc/test/lint/build/curl). Report ✅ or ❌ with file:line for each gap. If ❌ → send the specific gaps back to the SAME implementer sub-agent to fix, then re-review. Loop until ✅.

### Step C — YOU do a browser visual check (only you have Chrome)
The sub-agents cannot see the screen. After the reviewer is ✅, you (orchestrator) load the game on `http://localhost:3002/play/<id>?mode=practice`, screenshot, drive the controls (build to the target, press Check), and confirm with your own eyes: the theme reads right, the prompt shows task-only, the **Reset/buttons are visible (contrast)**, success fires (confetti/feedback/stars), what you tap/build is what changes (no "appears elsewhere"), drag direction is natural. If anything looks wrong, feed the specific visual issue back to the implementer sub-agent (Step A same agent) → re-review → re-check.

### Step D — Approver/committer sub-agent (model: sonnet)
Only after reviewer ✅ AND your visual check ✅. It re-runs the full gate one last time, and if all green, commits with a conventional message (`feat(games3d): add <id> game (<theme>)`). It must report the commit SHA and confirm green; if anything is red, it must NOT commit and instead report back (you then route the fix to the implementer).

Then mark the game done (TodoWrite) and proceed to the next.

---

## 3. Sequencing & scope

- If the invocation named specific game ids, build those (in the given order).
- Else if it said "recommended next 5", build: `place-value-builder`, `ten-frame-fill`, `clock-builder`, `fraction-number-line`, `algebra-balance` (in that order).
- Else build ALL 40 from the catalog, **priority order**: all `high` first, then `med`, then `low`; within a tier, spread across grades/topics. Read priorities from the catalog `pri` field.
- **One game at a time** (shared files). Don't dispatch two implementers in parallel.
- Maintain a TodoWrite list (one item per game) and keep it updated.

## 4. Continuous execution & stop conditions

Execute games back-to-back without asking the user between them. Stop ONLY when: all targeted games are done; OR a sub-agent is BLOCKED on something you can't resolve (provide more context / re-dispatch with a stronger model / split the task — escalate to the user only if the catalog spec itself is wrong or a decision is genuinely the user's); OR a game needs a real product decision (e.g. a theme that needs asset files we don't allow — propose a procedural alternative and continue). Report a short summary after each game (id, commit SHA, gate status, anything you tuned visually).

## 5. First actions when you start
1. Read `docs/games/40-games-catalog.html` (extract the `GAMES` array) and `src/lib/games3d/kit/index.ts`.
2. Start `PORT=3002 npm run dev` in the background; wait until `/play` responds.
3. Create the TodoWrite list for the targeted games.
4. Begin Step A for the first game.
