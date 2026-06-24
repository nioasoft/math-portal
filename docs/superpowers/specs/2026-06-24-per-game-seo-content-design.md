# Per-Game SEO Content — Design Spec

**Date:** 2026-06-24
**Status:** Approved (design)
**Branch:** `feat/per-game-seo-content`

## Problem

Google Search Console reports 539 not-indexed pages vs. 63 indexed. The two
dominant buckets are **Discovered – currently not indexed (460)** and
**Crawled – currently not indexed (73)** — i.e. Google is rationing crawl budget
and judging most pages thin/near-duplicate, not a technical defect.

The largest contributor is the game pages: **53 games × 6 locales = 318 URLs**,
over half the site. Each game page renders a 3D `<canvas>` (no crawlable text)
plus only ~60 genuinely unique words. Everything else repeats across all games:

- Topic guide (`focus`/`method`/`outcome`) — shared by every game in a topic.
- Boilerplate copy (`gameType`, `practiceTitle`, `skillPrefix`, grades line) — shared by all games.
- **FAQ JSON-LD — identical 3 questions/answers on every game page** (only grade/topic interpolated). The single strongest duplicate signal.

## Goal

Make a substantial, visible block of each game page **uniquely about that one
game** so Google indexes them as distinct, valuable pages — without adding new
routes, loaders, or content systems.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Locale scope | **All 6 locales** (ar, de, es, en, he, ru) get rich content |
| Authoring | **Claude generates, user reviews** (he/en full confidence; ar/de/es/ru flagged "needs native review") |
| Content storage | **Structured i18n JSON** — extend `messages/<locale>/games3d.json` |
| Quality gate | Reuse existing blog/help `noindex`-when-incomplete pattern + `check-i18n-parity` as completeness gate |

## Design

### 1. Content schema — new `seo` object per game block

Each game block in `messages/<locale>/games3d.json` gains a `seo` object
(~250–300 unique words per locale):

```jsonc
"multiplicationArray": {
  "title": "...", "description": "...", "instructions": "...",   // unchanged
  "prompt": "...", "correct": "...",                              // unchanged
  "seo": {
    "intro":     "What THIS game is + the concrete 'aha' it creates (~50w)",
    "howToPlay": ["step specific to this game", "step 2", "step 3"],
    "skills":    "The exact skill this mechanic builds (~40w)",
    "example":   "A worked example using this game's actual numbers/objects (~40w)",
    "mistakes":  "The misconception this game targets + how it fixes it (~40w)",
    "faqs": [
      { "q": "game-specific question", "a": "answer" },
      { "q": "...", "a": "..." },
      { "q": "...", "a": "..." }
    ]
  }
}
```

Constraints:
- `howToPlay`: 3–5 steps, specific to the game's actual interaction.
- `faqs`: ≥3, all game-specific. The first FAQ question must be unique across all games.
- All fields required for every game in every locale (enforced by parity check).

### 2. Rendering — `src/components/games3d/GameSeoContent.tsx`

- Replace the shared topic-guide paragraphs with per-game `intro / skills /
  example / mistakes` plus a `howToPlay` ordered list.
- Replace the 3 identical FAQ cards with the game's own `seo.faqs`, rendered as
  **visible HTML** (the visible text must match the FAQ JSON-LD, or Google
  ignores/penalizes the schema).
- **Keep** the related-games aside and the worksheet/play internal links — good
  internal linking that helps the "Discovered – not crawled" bucket.
- The component pulls the new fields via `getTranslations({ namespace: meta.i18nKey })`,
  consistent with how `title`/`description`/`instructions` are already read.

### 3. JSON-LD — `src/lib/games3d/seo.ts`

- `buildGameFaqJsonLd` reads each game's own `seo.faqs` (passed in from the page)
  instead of the shared `localizedCopy` trio → every page's `FAQPage` schema is
  unique. Drop the shared 3-question set from the FAQ schema path.
- `buildGameJsonLd` (`LearningResource`) unchanged structurally; `description`
  may be enriched from `seo.intro`.
- The shared `gameSpecificGuides` / `topicGuides` / FAQ entries in `seo.ts` that
  the new content supersedes are removed to avoid dead code and keep `seo.ts`
  under the 800-line limit.

### 4. Quality gate (safety net)

- In `src/app/[locale]/play/[gameId]/page.tsx` `generateMetadata`: if a game's
  `seo` block is missing/empty for the requested locale, set
  `robots: { index: false, follow: true }` — mirroring the existing
  `blog/[slug]` and `help/[topic]` pattern. Guarantees a thin game page never
  ships again, even for future games added before content is written.
- Extend `scripts/check-i18n-parity.mjs` to fail when any game's `seo` block is
  incomplete in any locale, so CI catches gaps.

### 5. Content generation

- Generate `seo` objects for all **53 registered games** (`GAME_IDS`) × 6
  locales, grounded in each game's real mechanic using `meta.topic`,
  `meta.gradeRange`, and the existing
  `title`/`description`/`instructions`/`gameSpecificGuide`. The `canary` i18n
  block is a dev-only game (not in `GAME_IDS`, served at `/play/canary-dev`) and
  is excluded — it stays dev/noindex.
- Batch by topic for terminology consistency.
- he + en written at full confidence; ar/de/es/ru produced and explicitly
  flagged for native review before the user trusts them.

### 6. Testing

- New test (`src/lib/games3d/__tests__/` or alongside sitemap test): for every
  registered game in `GAME_IDS` (53), assert a complete `seo` block exists in every locale,
  `faqs.length ≥ 3`, and no two games share an identical first FAQ question
  (automated dedup guard).
- `npm run i18n:check` parity passes.
- Existing sitemap test unaffected.

## Out of scope (YAGNI)

- No new content loader, no MDX, no per-game routes.
- No locale-strategy change (all 6 stay; quality gate handles incompleteness).
- No changes to the 3D game runtime or `Game3DShell`.

## Affected files

| File | Change |
|---|---|
| `messages/<locale>/games3d.json` (×6) | Add `seo` object to each of 54 game blocks |
| `src/components/games3d/GameSeoContent.tsx` | Render per-game sections + FAQs |
| `src/lib/games3d/seo.ts` | FAQ JSON-LD from per-game data; remove superseded shared maps |
| `src/app/[locale]/play/[gameId]/page.tsx` | Pass `seo.faqs` to JSON-LD; noindex gate |
| `scripts/check-i18n-parity.mjs` | Assert `seo` completeness per game per locale |
| `src/lib/games3d/__tests__/seo-content.test.ts` (new) | Completeness + dedup guard |

## Success criteria

- Every game page renders ≥250 words of unique, visible, game-specific copy.
- No two game pages emit identical `FAQPage` JSON-LD.
- `i18n:check` and the new test pass; CI blocks incomplete `seo` blocks.
- (Measured later in GSC) "Crawled – currently not indexed" for game URLs trends
  down as Google re-evaluates; this is a content/authority signal, so expect
  weeks, not days.
