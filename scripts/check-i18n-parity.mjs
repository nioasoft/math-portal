#!/usr/bin/env node
/**
 * i18n parity checker for the games3d + home namespaces.
 *
 * Compares the key sets of every locale against the reference locale (he) and
 * reports any missing or extra keys — including inside every per-game block
 * (title/description/instructions/prompt/correct/wrong + game-specific keys),
 * controls.*, topics.*, modes.*, and the home gamesHub block.
 *
 * Also asserts that every `meta.topic` actually used by a registered game has a
 * `topics.<topic>` label in ALL locales (a missing one throws MISSING_MESSAGE
 * in the /play catalog at build/SSG time).
 *
 * Usage: node scripts/check-i18n-parity.mjs   (exit 1 on any gap)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LOCALES = ['he', 'en', 'ar', 'de', 'es', 'ru'];
const REF = 'he';
const NAMESPACES = ['games3d', 'home'];

function load(locale, ns) {
  return JSON.parse(readFileSync(join(ROOT, `messages/${locale}/${ns}.json`), 'utf8'));
}

/** Flatten an object to a Set of dotted key paths (leaves only). */
function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

/** Topics actually used by the registered games (parsed from each *Game.ts meta). */
function usedTopics() {
  const base = join(ROOT, 'src/lib/games3d/games');
  const dirs = readdirSync(base).filter((d) => d !== '__tests__' && statSync(join(base, d)).isDirectory());
  const topics = new Set();
  for (const d of dirs) {
    const f = readdirSync(join(base, d)).find((x) => x.endsWith('Game.ts'));
    if (!f) continue;
    const m = readFileSync(join(base, d, f), 'utf8').match(/topic:\s*['"]([^'"]+)['"]/);
    if (m) topics.add(m[1]);
  }
  return topics;
}

let problems = 0;

// 1. Key parity per namespace, every locale vs the reference (he).
for (const ns of NAMESPACES) {
  const ref = flatten(load(REF, ns));
  for (const locale of LOCALES) {
    if (locale === REF) continue;
    const cur = flatten(load(locale, ns));
    const missing = [...ref].filter((k) => !cur.has(k));
    const extra = [...cur].filter((k) => !ref.has(k));
    if (missing.length || extra.length) {
      problems += missing.length + extra.length;
      console.log(`\n✗ ${ns} — ${locale}`);
      if (missing.length) console.log(`   MISSING (${missing.length}): ${missing.join(', ')}`);
      if (extra.length) console.log(`   EXTRA   (${extra.length}): ${extra.join(', ')}`);
    }
  }
}

// 2. Every used topic has a topics.<topic> label in all locales.
const topics = usedTopics();
for (const locale of LOCALES) {
  const block = load(locale, 'games3d').topics ?? {};
  const missing = [...topics].filter((t) => !(t in block));
  if (missing.length) {
    problems += missing.length;
    console.log(`\n✗ games3d.topics — ${locale} missing labels for used topics: ${missing.join(', ')}`);
  }
}

if (problems === 0) {
  console.log(`✓ i18n parity OK — ${NAMESPACES.join(', ')} aligned across ${LOCALES.join('/')}; all ${topics.size} used topics labelled in every locale.`);
  process.exit(0);
} else {
  console.log(`\n✗ ${problems} i18n parity problem(s) found.`);
  process.exit(1);
}
