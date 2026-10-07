# Math Portal (תרגול / דפי עבודה חכמים)

Next.js App Router, static-first, React Compiler on. Two product surfaces for grades 1–6:
**printable worksheets** and **browser math games**. Hebrew is the default locale
(`defaultLocale: 'he'`, `localePrefix: 'as-needed'` — `/he/…` is served at `/…`), with
7 locales total: `he, en, ar, de, es, ru, zh` (`src/i18n/config.ts`).

- **The worksheet deliverable is print**: A4 via `print:` Tailwind utilities and `@media print`
  in `globals.css` — check the print preview, not just the screen.
- **Never hardcode math symbols.** Division, decimal and thousands separators are per-locale in
  `src/lib/math-notation.ts` (a `Record<Locale, …>`). `:` for division is Israeli notation
  (`he`, plus `de`); `en, ar, es, ru, zh` use `÷`. zh follows mainland primary-school notation:
  `÷`, decimal `.`, thousands `,`.
- Worksheet generators are client components in `src/components/worksheet/` and all follow one
  pattern: problem engine from `src/lib/` (`math-engine.ts`, `word-problem-engine.ts`,
  `curriculum.ts` for grade topics) + URL query-param sync for settings + show/hide answers
  toggle. New generators copy an existing one.
- Grade ids are the numeric strings `'1'`–`'6'` (`GRADE_IDS` in `src/lib/curriculum.ts`).
  The Hebrew labels in `curriculum.ts` are a fallback; what renders comes from
  `messages/{locale}/curriculum.json`.
- Blog and help content is **JSON on disk**, not TS: `content/{blog,help}/{locale}/*.json`,
  read by `src/lib/content.ts` with `locale → en → he` fallback. A locale without content
  (zh today, by design) serves English and is marked `noindex`. `src/lib/blog-data.ts` now
  only supplies the category list — its `blogPosts` array is dead.
- Fonts are per-locale in `fontByLocale` (`src/app/[locale]/layout.tsx`): Assistant (he),
  Noto Sans Arabic (ar), Inter (en/de/es/ru), Noto Sans SC (zh).

## Games

- `src/lib/games3d/` is a **hand-rolled vanilla three.js** engine (`three ^0.180.0`) — not
  react-three-fiber. 53 registry games; each is a folder under `src/lib/games3d/games/<id>/`,
  registered in `games/index.ts`, lazy-loaded via `games/loaders.ts`, and rendered through
  `src/components/games3d/Game3DShell.tsx`. Shared helpers live in `games3d/kit/`, engine
  plumbing (renderer, resize, audio, dispose) in `games3d/engine/`.
- 3 legacy 2D quiz games (`/play/math|fractions|percentage`) run on a separate engine,
  `src/lib/game/game-engine.ts`.
- Adding a game means touching all four places above plus copy in `messages/{locale}/games3d.json`
  under that game's id (`title, description, instructions, prompt, correct, seo{…}`).

## i18n

- 14 namespace files per locale in `messages/{locale}/`; `npm run i18n:check` enforces key
  parity, topic labels and per-game `seo` blocks. Run it after any copy change.
- `games.json` and `home.json` are plain 2-space JSON and safe to rewrite with a script.
  **`games3d.json` is hand-formatted** (inline `{ "q": …, "a": … }` objects in `faqs` arrays),
  so a JSON round-trip reformats the whole file — edit it surgically.
- CJK writes no inter-word space, so a `{gap}` separator between adjacent `t()` calls comes
  from `scriptTypography[locale]`. JSX drops children of void elements, so it can never sit
  next to a `<br />`.
- `Record<Locale, …>` is the compile gate for a new locale (`fontByLocale`, `math-notation`,
  the maps in `src/lib/seo.ts` and `src/lib/games3d/seo.ts`, `scriptTypography`). `localeConfig`
  in `src/i18n/config.ts` is a plain literal, so TS will *not* catch an omission there.

## Commands

- `npm run build` — already passes `--webpack`; **Turbopack builds hang.** Dev is Turbopack:
  `PORT=3100 npm run dev`.
- `npm run test` (vitest; the 80/80/70/80 coverage thresholds apply only to games3d),
  `npm run lint`, `npm run i18n:check`, `npm run e2e` (Playwright against :3100),
  `npm run perf:games3d` (needs `PERF_URL=http://localhost:3100/play/canary-dev`).
