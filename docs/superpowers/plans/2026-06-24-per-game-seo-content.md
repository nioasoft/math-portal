# Per-Game SEO Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the 53 game pages a substantial block of unique, visible, game-specific SEO copy + unique FAQ schema, so Google stops treating them as thin near-duplicates.

**Architecture:** Add a structured `seo` object to each game block in the six `messages/<locale>/games3d.json` files. A typed validator (`gameSeo.ts`) gates rendering and indexing. `GameSeoContent.tsx` renders the per-game sections + FAQs; `seo.ts` builds the FAQ JSON-LD from that same per-game data. A noindex safety gate (mirroring the existing blog/help pattern) keeps any incomplete game out of the index. Content is authored topic-by-topic so each task ends green.

**Tech Stack:** Next.js 16 (App Router, RSC), next-intl v4, TypeScript strict, Vitest, Node script for i18n parity.

## Global Constraints

- **Locales (all 6, exact dir names):** `he`, `en`, `ar`, `de`, `es`, `ru`. Reference locale for parity is `he`.
- **Default locale:** `he` (un-prefixed URLs). Others are path-prefixed.
- **Games in scope:** the 53 ids in `GAME_IDS` (`src/lib/games3d/games/loaders.ts`). The `canary` i18n block (`/play/canary-dev`) is dev-only and excluded.
- **i18n key shape:** each game's `meta.i18nKey` is `games3d.<camelKey>`; page code reads game strings via `getTranslations({ locale, namespace: meta.i18nKey })`, so `seo` lives at `games3d.json[<camelKey>].seo`.
- **`seo` block required fields (every game, every locale):** `intro` (string), `howToPlay` (string[], ≥3), `skills` (string), `example` (string), `mistakes` (string), `faqs` (Array<{q,a}>, ≥3). Target ~250–300 words total per locale.
- **FAQ uniqueness:** no two games may share an identical first FAQ question (`faqs[0].q`). FAQs must be substantively game-specific, not a name-swapped template.
- **Content confidence:** `he` + `en` authored at full confidence. `ar`/`de`/`es`/`ru` are AI-generated and MUST be flagged "needs native review" in each authoring task's commit body.
- **TypeScript:** strict, no `any`. Files ≤800 lines.
- **TS-facing user strings stay in i18n JSON** (never hardcoded in components). JSDoc/comments in English.
- **Commit attribution:** disabled (per user global settings) — no Co-Authored-By trailer.
- **Run all commands from** `math-portal/`. Branch: `feat/per-game-seo-content`.

---

### Task 1: `seo` content types + validator

**Files:**
- Create: `src/lib/games3d/gameSeo.ts`
- Test: `src/lib/games3d/__tests__/gameSeo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface GameFaq { q: string; a: string }`
  - `export interface GameSeo { intro: string; howToPlay: string[]; skills: string; example: string; mistakes: string; faqs: GameFaq[] }`
  - `export function isCompleteGameSeo(value: unknown): value is GameSeo` — true only when all fields present, strings non-empty after trim, `howToPlay.length >= 3` (all non-empty strings), `faqs.length >= 3` (each with non-empty `q` and `a`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/games3d/__tests__/gameSeo.test.ts
import { describe, it, expect } from 'vitest';
import { isCompleteGameSeo, type GameSeo } from '../gameSeo';

const valid: GameSeo = {
  intro: 'An intro sentence.',
  howToPlay: ['Step one.', 'Step two.', 'Step three.'],
  skills: 'Skill text.',
  example: 'Example text.',
  mistakes: 'Mistake text.',
  faqs: [
    { q: 'Q1?', a: 'A1.' },
    { q: 'Q2?', a: 'A2.' },
    { q: 'Q3?', a: 'A3.' },
  ],
};

describe('isCompleteGameSeo', () => {
  it('accepts a complete block', () => {
    expect(isCompleteGameSeo(valid)).toBe(true);
  });
  it('rejects a missing field', () => {
    const { skills, ...rest } = valid;
    expect(isCompleteGameSeo(rest)).toBe(false);
  });
  it('rejects fewer than 3 howToPlay steps', () => {
    expect(isCompleteGameSeo({ ...valid, howToPlay: ['only one'] })).toBe(false);
  });
  it('rejects fewer than 3 faqs', () => {
    expect(isCompleteGameSeo({ ...valid, faqs: valid.faqs.slice(0, 2) })).toBe(false);
  });
  it('rejects empty strings and non-objects', () => {
    expect(isCompleteGameSeo({ ...valid, intro: '   ' })).toBe(false);
    expect(isCompleteGameSeo('seo')).toBe(false);
    expect(isCompleteGameSeo(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/games3d/__tests__/gameSeo.test.ts`
Expected: FAIL — `Cannot find module '../gameSeo'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/games3d/gameSeo.ts
/** A single game-specific FAQ entry rendered both visibly and as FAQPage JSON-LD. */
export interface GameFaq {
  q: string;
  a: string;
}

/** Unique, game-specific SEO content stored per game in messages/<locale>/games3d.json. */
export interface GameSeo {
  intro: string;
  howToPlay: string[];
  skills: string;
  example: string;
  mistakes: string;
  faqs: GameFaq[];
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Type guard: true only when the value is a fully-populated GameSeo block. */
export function isCompleteGameSeo(value: unknown): value is GameSeo {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!nonEmpty(v.intro) || !nonEmpty(v.skills) || !nonEmpty(v.example) || !nonEmpty(v.mistakes)) {
    return false;
  }
  if (!Array.isArray(v.howToPlay) || v.howToPlay.length < 3 || !v.howToPlay.every(nonEmpty)) {
    return false;
  }
  if (!Array.isArray(v.faqs) || v.faqs.length < 3) return false;
  return v.faqs.every(
    (f) => typeof f === 'object' && f !== null && nonEmpty((f as GameFaq).q) && nonEmpty((f as GameFaq).a),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/games3d/__tests__/gameSeo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/games3d/gameSeo.ts src/lib/games3d/__tests__/gameSeo.test.ts
git commit -m "feat(games-seo): add GameSeo types and completeness validator"
```

---

### Task 2: Rendering + FAQ JSON-LD + noindex gate, with the fractions pilot content

This task wires the full pipeline end-to-end against real content for the 4 **fractions** games (`fraction-build`, `fraction-number-line`, `fraction-slice`, `fraction-strip-compare`) in all 6 locales. After this task, fractions games render rich unique copy and are indexable; every other game is automatically `noindex` via the gate until its content lands.

**Files:**
- Modify: `messages/he/games3d.json`, `messages/en/games3d.json`, `messages/ar/games3d.json`, `messages/de/games3d.json`, `messages/es/games3d.json`, `messages/ru/games3d.json` (add `seo` to the 4 fractions game blocks: `fractionBuild`, `fractionNumberLine`, `fractionSlice`, `fractionStrip`)
- Modify: `src/components/games3d/GameSeoContent.tsx`
- Modify: `src/lib/games3d/seo.ts:695-738` (`buildGameFaqJsonLd`)
- Modify: `src/app/[locale]/play/[gameId]/page.tsx`
- Create: `src/lib/games3d/__tests__/seo-content.test.ts`

**Interfaces:**
- Consumes: `GameSeo`, `GameFaq`, `isCompleteGameSeo` from Task 1.
- Produces:
  - `GameSeoContent` gains required prop `seo: GameSeo` (replaces internal use of shared topic-guide/FAQ copy).
  - `buildGameFaqJsonLd(args: { faqs: GameFaq[] })` — new signature; maps each faq to a `Question`/`Answer`.

- [ ] **Step 1: Author the fractions `seo` content (he + en at full confidence)**

Add a `seo` object to each fractions game block in `messages/he/games3d.json` and `messages/en/games3d.json`. Use this `fractionBuild` entry as the exact quality bar; write the other three fractions games to the same depth and structure.

`messages/en/games3d.json` → `fractionBuild`:
```json
"seo": {
  "intro": "Fraction Builder turns an abstract fraction into a pie you fill with your own hands. You read a target such as 3/4, then shade slices until the pie matches — so the symbol stops being two numbers and becomes a visible amount.",
  "howToPlay": [
    "Read the target fraction shown above the pie.",
    "Tap or drag slices to shade them, counting up to the numerator.",
    "Notice the denominator decides how many equal slices the whole is cut into.",
    "Press Check to confirm the shaded part matches the target fraction."
  ],
  "skills": "It builds the core idea that the denominator names the size of each equal part while the numerator counts how many you take — the foundation students need before comparing or adding fractions.",
  "example": "For 3/4 the pie is cut into 4 equal slices and you shade 3. Seeing the single empty slice makes it obvious that 3/4 is one slice short of a whole, not just 'three and four'.",
  "mistakes": "Many students read 3/4 as 'three of four separate things' and miss that the parts must be equal. Building the pie forces equal slices and corrects the most common early fraction error.",
  "faqs": [
    { "q": "Which grades is Fraction Builder for?", "a": "It fits grades 3-4, where students first meet fractions as equal parts of one whole." },
    { "q": "Do students need multiplication before this game?", "a": "No. Fraction Builder only needs counting and the idea of equal sharing, so it works as a first introduction to fractions." },
    { "q": "How is this different from the Fraction Number Line game?", "a": "Fraction Builder shows a fraction as part of one whole (a pie); Fraction Number Line places the same fraction as a point between 0 and 1 — two complementary models." }
  ]
}
```

`messages/he/games3d.json` → `fractionBuild`:
```json
"seo": {
  "intro": "במשחק \"בונים שבר\" השבר המופשט הופך לעוגה שממלאים ביד. קוראים יעד כמו 3/4, וצובעים פרוסות עד שהעוגה מתאימה — וכך הסימן מפסיק להיות שני מספרים והופך לכמות שרואים בעיניים.",
  "howToPlay": [
    "קוראים את השבר שמופיע מעל העוגה.",
    "מקישים או גוררים כדי לצבוע פרוסות, וסופרים עד המונה.",
    "שמים לב שהמכנה קובע לכמה פרוסות שוות חותכים את השלם.",
    "לוחצים על בדיקה כדי לוודא שהחלק הצבוע מתאים ליעד."
  ],
  "skills": "המשחק מבסס את הרעיון שהמכנה קובע את גודל כל חלק שווה, והמונה סופר כמה חלקים לוקחים — בסיס הכרחי לפני השוואת שברים וחיבורם.",
  "example": "עבור 3/4 העוגה נחתכת ל-4 פרוסות שוות וצובעים 3. הפרוסה הריקה האחת ממחישה ש-3/4 הם פרוסה אחת פחות משלם, ולא סתם \"שלוש וארבע\".",
  "mistakes": "תלמידים רבים קוראים 3/4 כ\"שלושה מתוך ארבעה דברים נפרדים\" ומפספסים שהחלקים חייבים להיות שווים. בניית העוגה מכריחה פרוסות שוות ומתקנת את הטעות הנפוצה ביותר בשברים.",
  "faqs": [
    { "q": "לאילו כיתות מתאים \"בונים שבר\"?", "a": "מתאים לכיתות ג'-ד', שבהן התלמידים פוגשים שברים בפעם הראשונה כחלקים שווים של שלם אחד." },
    { "q": "צריך לדעת כפל לפני המשחק?", "a": "לא. המשחק דורש רק ספירה ורעיון של חלוקה שווה, ולכן מתאים כהיכרות ראשונה עם שברים." },
    { "q": "במה זה שונה ממשחק \"שבר על ציר המספרים\"?", "a": "\"בונים שבר\" מציג שבר כחלק משלם אחד (עוגה), בעוד \"שבר על ציר המספרים\" ממקם את אותו שבר כנקודה בין 0 ל-1 — שני מודלים משלימים." }
  ]
}
```

- [ ] **Step 2: Author the fractions `seo` content for ar / de / es / ru**

Produce the same four fractions blocks in `ar`, `de`, `es`, `ru`, matching the he/en depth and the math exactly. These are AI-generated — they will be flagged for native review in the commit.

- [ ] **Step 3: Write the failing rendering/JSON-LD/coverage test**

```ts
// src/lib/games3d/__tests__/seo-content.test.ts
import { describe, it, expect } from 'vitest';
import { isCompleteGameSeo, type GameSeo } from '../gameSeo';
import { buildGameFaqJsonLd } from '../seo';

const LOCALES = ['he', 'en', 'ar', 'de', 'es', 'ru'] as const;

// camelCase i18n keys for the 4 fractions games (this task's scope).
const FRACTIONS_KEYS = ['fractionBuild', 'fractionNumberLine', 'fractionSlice', 'fractionStrip'];

function loadGames3d(locale: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../../../../messages/${locale}/games3d.json`);
}

describe('fractions seo content', () => {
  it('every fractions game has a complete seo block in every locale', () => {
    for (const locale of LOCALES) {
      const data = loadGames3d(locale);
      for (const key of FRACTIONS_KEYS) {
        const block = data[key] as Record<string, unknown> | undefined;
        expect(block, `${locale}/${key}`).toBeDefined();
        expect(isCompleteGameSeo(block?.seo), `${locale}/${key}.seo`).toBe(true);
      }
    }
  });

  it('first FAQ questions are unique across fractions games (en)', () => {
    const data = loadGames3d('en');
    const firstQs = FRACTIONS_KEYS.map((k) => ((data[k] as { seo: GameSeo }).seo.faqs[0].q));
    expect(new Set(firstQs).size).toBe(firstQs.length);
  });

  it('buildGameFaqJsonLd emits one Question per provided faq', () => {
    const faqs = [
      { q: 'Q1?', a: 'A1.' },
      { q: 'Q2?', a: 'A2.' },
      { q: 'Q3?', a: 'A3.' },
    ];
    const jsonLd = buildGameFaqJsonLd({ faqs });
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(3);
    expect(jsonLd.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'Q1?',
      acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/games3d/__tests__/seo-content.test.ts`
Expected: FAIL — `buildGameFaqJsonLd` still has the old signature / the seo blocks for ar-ru may be incomplete until Step 2 done. (The JSON-LD test fails on signature.)

- [ ] **Step 5: Rewrite `buildGameFaqJsonLd` to use per-game faqs**

In `src/lib/games3d/seo.ts`, replace the existing `buildGameFaqJsonLd` (lines ~695-738):
```ts
import type { GameFaq } from './gameSeo';

/** Build FAQPage JSON-LD from a game's own FAQ list (unique per game). */
export function buildGameFaqJsonLd(args: { faqs: GameFaq[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: args.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  } as const;
}
```
Leave `buildGameJsonLd` and `buildGameBreadcrumbJsonLd` unchanged.

- [ ] **Step 6: Update `GameSeoContent` to render the per-game block**

In `src/components/games3d/GameSeoContent.tsx`, add `seo: GameSeo` to `GameSeoContentProps` and import the type:
```ts
import type { GameSeo } from '@/lib/games3d/gameSeo';
```
Replace the left-column body (the `practiceTitle`/`parentTitle` paragraphs that used `guide.focus/method/outcome`) with the per-game sections, and replace the three-card FAQ grid (`copy.faqGameQuestion` … `copy.faqUseAnswer`) with a list built from `seo.faqs`. Keep the related-games aside and the `practicePath`/`/play` internal links unchanged. Concretely:

```tsx
{/* left column — replaces the shared topic-guide paragraphs */}
<p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{seo.intro}</p>

<div className="mt-6">
  <h3 className="text-lg font-bold text-slate-900">{copy.practiceTitle}</h3>
  <p className="mt-2 leading-7 text-slate-600">{seo.skills}</p>
  <ol className="mt-3 list-decimal space-y-1 ps-5 leading-7 text-slate-600">
    {seo.howToPlay.map((step, i) => (
      <li key={i}>{step}</li>
    ))}
  </ol>
</div>

<div className="mt-6 grid gap-5 md:grid-cols-2">
  <div>
    <h3 className="text-lg font-bold text-slate-900">{copy.parentTitle}</h3>
    <p className="mt-2 leading-7 text-slate-600">{seo.example}</p>
  </div>
  <div>
    <p className="mt-2 leading-7 text-slate-600">{seo.mistakes}</p>
    <p className="mt-2 leading-7 text-slate-600">{copy.classroomUse}</p>
    <p className="mt-2 leading-7 text-slate-600">{copy.playCta}</p>
  </div>
</div>
```

```tsx
{/* full-width FAQ — replaces the 3 shared cards */}
<div className="md:col-span-2">
  <h3 className="text-lg font-black text-slate-900">{copy.faqTitle}</h3>
  <dl className="mt-4 grid gap-4 md:grid-cols-3">
    {seo.faqs.map((faq, i) => (
      <div key={i} className="rounded-xl border border-slate-200 p-4">
        <dt className="font-bold text-slate-900">{faq.q}</dt>
        <dd className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</dd>
      </div>
    ))}
  </dl>
</div>
```
The `guide`/`gameGuide` variables and the `description`/`instructions` props are no longer needed for these blocks; remove now-unused locals to satisfy lint (keep `topicLabel`, `copy`, `relatedGames`, `practicePath`).

- [ ] **Step 7: Wire the page — read `seo`, gate indexing, pass it down**

In `src/app/[locale]/play/[gameId]/page.tsx`:

Imports:
```ts
import { isCompleteGameSeo, type GameSeo } from '@/lib/games3d/gameSeo';
```

In `generateMetadata`, after `const t = await getTranslations(...)`, add the gate:
```ts
const seoRaw = (() => {
  try { return t.raw('seo'); } catch { return undefined; }
})();
const hasSeo = isCompleteGameSeo(seoRaw);
```
Then add to the returned `Metadata`:
```ts
robots: hasSeo ? undefined : { index: false, follow: true },
```

In the default `GamePage` component, read the same block and pass it to children:
```ts
const seoRaw = (() => {
  try { return t.raw('seo'); } catch { return undefined; }
})();
const gameSeo: GameSeo | null = isCompleteGameSeo(seoRaw) ? seoRaw : null;
```
Change the FAQ JSON-LD call to use the per-game faqs (fall back to no FAQ schema when absent), and pass `seo` to the content component. Update the JSON-LD assembly:
```ts
const faqJsonLd = gameSeo ? buildGameFaqJsonLd({ faqs: gameSeo.faqs }) : null;
```
When rendering, only emit the FAQ script + `<GameSeoContent>` SEO block when `gameSeo` is non-null (an incomplete game renders the playable shell but skips the SEO section and FAQ schema). Pass `seo={gameSeo}` to `<GameSeoContent>` where it is rendered. Remove the now-unused `topicLabel`/`metaT` args only if they become unused; keep what the breadcrumb/LearningResource builders still need.

- [ ] **Step 8: Run the full check for this task**

Run:
```bash
npx vitest run src/lib/games3d/__tests__/ && npx tsc --noEmit && npm run i18n:check
```
Expected: vitest PASS (gameSeo + seo-content), `tsc` clean, `i18n:check` PASS (he/en/ar/de/es/ru all have the 4 fractions `seo` blocks symmetrically).

- [ ] **Step 9: Visually verify one page renders the content**

Run: `npm run dev`, open `http://localhost:3000/play/fraction-build` (he) and `http://localhost:3000/en/play/fraction-build`. Confirm the intro, numbered how-to-play, skills, example, mistakes, and 3 game-specific FAQs are visible. View source → confirm a `FAQPage` script with the 3 game-specific questions. Open `http://localhost:3000/play/multiplication-array` → confirm `<meta name="robots" content="noindex, follow">` is present (no content yet).

- [ ] **Step 10: Commit**

```bash
git add messages/*/games3d.json src/components/games3d/GameSeoContent.tsx src/lib/games3d/seo.ts "src/app/[locale]/play/[gameId]/page.tsx" src/lib/games3d/__tests__/seo-content.test.ts
git commit -m "feat(games-seo): render per-game SEO content + unique FAQ schema; gate incomplete games to noindex

Pilot content for the 4 fractions games in all 6 locales.
ar/de/es/ru fractions copy is AI-generated and needs native review."
```

---

### Authoring tasks (3–11): one topic per task

Each task adds a complete `seo` block (per the Global Constraints schema and the Task 2 `fractionBuild` quality bar) to every game in one topic, in **all 6 locales**, then verifies. The recipe is identical for each — only the game list changes. After each task: every game in the topic renders rich content and becomes indexable; the rest stay `noindex` until their task.

**Per-task recipe (apply to the game list in the task):**

- [ ] **Step A: Author he + en `seo` blocks** for every game in the topic (full confidence), each game grounded in its real mechanic, topic, and grade range (table below). Match the Task 2 depth (~250–300 words). Ensure each game's `faqs[0].q` is distinct from every other game's already in the files.
- [ ] **Step B: Author ar / de / es / ru `seo` blocks** for the same games (AI-generated; flagged for native review in the commit body).
- [ ] **Step C: Verify.** Run:
  ```bash
  npx tsc --noEmit && npm run i18n:check && npx vitest run src/lib/games3d/__tests__/seo-content.test.ts
  ```
  Expected: `tsc` clean; `i18n:check` PASS (symmetric across locales); the existing fractions assertions still PASS. (Full 53-game coverage is asserted in Task 12, not here.)
- [ ] **Step D: Commit** with message `feat(games-seo): <topic> game SEO content (all locales)` and the `ar/de/es/ru needs native review` note in the body.

**Game lists (i18n key | route id | grade range):**

- [ ] **Task 3 — geometry (9 games):** `angleBuilder`/angle-builder [4,5] · `areaPerimeter`/area-perimeter [3,4] · `coordinatePlot`/coordinate-plot [4,6] · `geoboard`/geoboard-shapes [3,5] · `netFold`/net-fold [3,5] · `shapeSort`/shape-sort-3d [2,4] · `symmetryMirror`/symmetry-mirror [2,4] · `tangram`/tangram-build [2,5] · `volumeBuilder`/volume-cube-fill [4,6]

- [ ] **Task 4 — arithmetic A (10 games):** `additionMine`/addition-mine [2,4] · `algebraBalance`/algebra-balance [5,6] · `arrayMultiply`/array-multiply-slice [2,3] · `balanceScale`/balance-scale-equations [2,5] · `divisionShare`/division-share [3,4] · `estimationLand`/estimation-land [3,5] · `explodingDots`/exploding-dots [2,3] · `factris`/factris-blocks [3,5] · `hundredChart`/hundred-chart-colour [2,4] · `longDivision`/long-division-tower [3,5]

- [ ] **Task 5 — arithmetic B (10 games):** `moneyShop`/money-shop [2,4] · `multiplicationArray`/multiplication-array [3,4] · `factorTree`/multiplication-factor-tree [3,5] · `numberBond`/number-bond-split [1,2] · `numberLineJump`/number-line-jump [1,4] · `placeValue`/place-value-builder [2,4] · `skipCount`/skip-count-track [2,3] · `subitize`/subitize-dots [1,2] · `subtractionBridge`/subtraction-bridge [2,4] · `tenFrame`/ten-frame-fill [1,2]

- [ ] **Task 6 — decimals (3 games):** `decimalAddition`/decimal-addition [4,5] · `decimalNumberLine`/decimal-number-line [3,5] · `decimalBuilder`/decimal-place-value [4,5]

- [ ] **Task 7 — percentage (3 games):** `percentBar`/percent-bar [5,6] · `percentDiscount`/percent-discount [5,6] · `percentOfQuantity`/percent-of-quantity [5,6]

- [ ] **Task 8 — ratio (3 games):** `ratioMixer`/ratio-mixer [5,6] · `ratioRecipe`/ratio-recipe [5,6] · `ratioTable`/ratio-table [4,6]

- [ ] **Task 9 — series (3 games):** `geometricSequence`/geometric-sequence [4,6] · `numberSequence`/number-sequence [3,5] · `patternComplete`/pattern-complete [2,4]

- [ ] **Task 10 — units (4 games):** `clockBuilder`/clock-builder [2,3] · `measureFill`/measure-fill [3,4] · `rulerMeasure`/ruler-measure [2,4] · `weightBalance`/weight-balance [2,3]

- [ ] **Task 11 — word problems + misc (4 games):** `wordProblemBar`/word-problem-bar [2,4] · `wordProblemSteps`/word-problem-steps [3,5] · `barGraph`/bar-graph-builder [2,5] · `vennSort`/venn-sort [4,6]

---

### Task 12: Enforce full coverage + remove dead shared copy

After all 53 games have content, lock the gate so coverage can never silently regress, and delete the shared FAQ/guide maps the new content replaced.

**Files:**
- Modify: `src/lib/games3d/__tests__/seo-content.test.ts`
- Modify: `scripts/check-i18n-parity.mjs`
- Modify: `src/lib/games3d/seo.ts` (remove superseded shared maps)
- Modify: `src/components/games3d/GameSeoContent.tsx` (drop now-unused `copy` keys if any)

**Interfaces:**
- Consumes: `GAME_IDS` from `@/lib/games3d/games/loaders`, `getRegisteredGames` from `@/lib/games3d/games`, `isCompleteGameSeo`.
- Produces: a coverage test asserting all 53 games complete in all 6 locales.

- [ ] **Step 1: Add the full-coverage assertion (failing only if a game is missing)**

Append to `src/lib/games3d/__tests__/seo-content.test.ts`:
```ts
import { getRegisteredGames } from '../games';

describe('full game seo coverage', () => {
  // Map route id (kebab) -> i18n camel key via meta.i18nKey ('games3d.<key>').
  const games = getRegisteredGames().map((g) => ({
    id: g.meta.id,
    key: g.meta.i18nKey.replace(/^games3d\./, ''),
  }));

  it('covers all 53 registered games', () => {
    expect(games).toHaveLength(53);
  });

  for (const locale of LOCALES) {
    it(`every registered game has complete seo in ${locale}`, () => {
      const data = loadGames3d(locale);
      const missing = games
        .filter(({ key }) => !isCompleteGameSeo((data[key] as { seo?: unknown })?.seo))
        .map(({ id }) => id);
      expect(missing, `${locale} missing/incomplete: ${missing.join(', ')}`).toEqual([]);
    });
  }

  it('first FAQ questions are globally unique across all games (en)', () => {
    const data = loadGames3d('en');
    const firstQs = games.map(({ key }) => (data[key] as { seo: GameSeo }).seo.faqs[0].q);
    expect(new Set(firstQs).size).toBe(firstQs.length);
  });
});
```

- [ ] **Step 2: Run it — expect PASS now that all content exists**

Run: `npx vitest run src/lib/games3d/__tests__/seo-content.test.ts`
Expected: PASS (coverage + global FAQ uniqueness green).

- [ ] **Step 3: Extend the parity script to assert `seo` presence in the reference locale**

In `scripts/check-i18n-parity.mjs`, after the existing parity loop, add a check that the reference locale (`he`) has a `seo` object with the six required fields for every game block that has a `title`. (Parity already guarantees the other locales match `he`.) Add:
```js
// Assert every game block in the reference locale carries a complete seo block.
const refGames = load(REF, 'games3d');
const REQUIRED_SEO = ['intro', 'howToPlay', 'skills', 'example', 'mistakes', 'faqs'];
for (const [key, block] of Object.entries(refGames)) {
  if (!block || typeof block !== 'object' || !('title' in block) || key === 'canary') continue;
  const seo = block.seo;
  const missing = !seo || typeof seo !== 'object'
    ? REQUIRED_SEO
    : REQUIRED_SEO.filter((f) => !(f in seo));
  if (missing.length) {
    console.error(`SEO_INCOMPLETE games3d.${key}.seo (he) missing: ${missing.join(', ')}`);
    problems++;
  }
}
```

- [ ] **Step 4: Run the parity script**

Run: `npm run i18n:check`
Expected: PASS (exit 0, no `SEO_INCOMPLETE` lines).

- [ ] **Step 5: Remove superseded shared copy from `seo.ts`**

Delete the now-unused members that the per-game `seo` replaced: in `localizedCopy` remove `faqGameQuestion`, `faqGameAnswer`, `faqCostQuestion`, `faqCostAnswer`, `faqUseQuestion`, `faqUseAnswer` (all 6 locales). Remove the `topicGuides` map + `getTopicSeoGuide` and the `gameSpecificGuides` map + `getGameSpecificSeoGuide` ONLY if no remaining importer references them — first run:
```bash
grep -rn "getTopicSeoGuide\|getGameSpecificSeoGuide\|gameSpecificGuides\|topicGuides\|faqGameQuestion\|faqGameAnswer\|faqCostQuestion\|faqUseQuestion" src
```
Remove only symbols with no remaining references outside their own definition. Keep `getGameSeoCopy`, `interpolate`, `getTopicPracticePath`, `topicPracticePath`, `buildGameJsonLd`, `buildGameBreadcrumbJsonLd`. Drop the matching unused keys from `GameSeoContent.tsx` references if any remain.

- [ ] **Step 6: Full verification**

Run:
```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run i18n:check && npm run build
```
Expected: all clean/PASS; build succeeds with 53 indexable game pages × 6 locales.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(games-seo): enforce full seo coverage in CI and remove superseded shared copy"
```

---

## Self-Review

**Spec coverage:**
- Schema (`seo` object) → Task 1 (types) + Tasks 2–11 (authoring). ✓
- Rendering per-game sections + visible FAQs → Task 2 Steps 6. ✓
- Unique FAQ JSON-LD from per-game data → Task 2 Step 5. ✓
- Keep related-games/internal links → Task 2 Step 6 (explicitly kept). ✓
- noindex quality gate (blog/help pattern) → Task 2 Step 7. ✓
- `check-i18n-parity` completeness gate → Task 12 Step 3. ✓
- Completeness + dedup test → Task 2 Step 3 (pilot) + Task 12 Step 1 (full). ✓
- Remove superseded shared maps (keep seo.ts <800 lines) → Task 12 Step 5. ✓
- All 6 locales, he/en full + ar/de/es/ru flagged → every authoring task. ✓
- 53 games, canary excluded → Global Constraints + Task 12 grep guard. ✓

**Placeholder scan:** No TBD/TODO. Bulk content is authored data, not code — Task 2 gives a complete worked exemplar (he+en) as the quality bar and every authoring task carries the exact game list + grade ranges + verification commands. ✓

**Type consistency:** `GameSeo`/`GameFaq`/`isCompleteGameSeo` defined in Task 1, consumed unchanged in Tasks 2 & 12. `buildGameFaqJsonLd({ faqs })` signature defined in Task 2 Step 5 and called identically in Task 2 Step 7 and tested in Task 2 Step 3. i18n key derivation `meta.i18nKey.replace(/^games3d\./,'')` consistent between Task 12 test and the existing related-games code. ✓
