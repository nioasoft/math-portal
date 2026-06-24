import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isCompleteGameSeo, type GameSeo } from '../gameSeo';
import { buildGameFaqJsonLd } from '../seo';
import { getRegisteredGames } from '../games';

const LOCALES = ['he', 'en', 'ar', 'de', 'es', 'ru'] as const;

// camelCase i18n keys for the 4 fractions games (this task's scope).
const FRACTIONS_KEYS = ['fractionBuild', 'fractionNumberLine', 'fractionSlice', 'fractionStrip'];

const BLACKLISTED_WORDS = [
  'מגוון', 'מרתק', 'חיוני', 'מהותי', 'ייחודי', 'רב-ממדי', 'מקיף', 'חדשני',
  'פורץ דרך', 'חסר תקדים', 'משמעותי', 'מרכזי', 'בולט', 'רלוונטי',
  'רב-תכליתי', 'מאתגר', 'מהווה',
];

function loadGames3d(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}/games3d.json`), 'utf8'));
}

// Module-scope helpers shared across multiple describe blocks.
function collectSeoStrings(locale: string, gameKey: string): string[] {
  const data = loadGames3d(locale);
  const block = data[gameKey] as Record<string, unknown> | undefined;
  if (!block || typeof block.seo !== 'object' || block.seo === null) return [];
  const seo = block.seo as {
    intro: string;
    howToPlay: string[];
    skills: string;
    example: string;
    mistakes: string;
    faqs: { q: string; a: string }[];
  };
  return [
    seo.intro,
    ...seo.howToPlay,
    seo.skills,
    seo.example,
    seo.mistakes,
    ...seo.faqs.map((f) => f.q),
    ...seo.faqs.map((f) => f.a),
  ];
}

function gamesWithSeo(locale: string): string[] {
  const data = loadGames3d(locale);
  return Object.entries(data)
    .filter(([, v]) => typeof v === 'object' && v !== null && 'seo' in (v as object))
    .map(([k]) => k);
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

describe('hebrew seo quality', () => {
  function assertNoDashes(locale: string, keys: string[]): void {
    for (const key of keys) {
      const strings = collectSeoStrings(locale, key);
      for (const str of strings) {
        const emIdx = str.indexOf('—');
        const enIdx = str.indexOf('–');
        if (emIdx !== -1) {
          throw new Error(
            `[${locale}/${key}] em-dash (—) found in: "${str.slice(Math.max(0, emIdx - 20), emIdx + 20)}"`
          );
        }
        if (enIdx !== -1) {
          throw new Error(
            `[${locale}/${key}] en-dash (–) found in: "${str.slice(Math.max(0, enIdx - 20), enIdx + 20)}"`
          );
        }
      }
    }
  }

  it('no em-dashes or en-dashes in he or ar seo strings (any game)', () => {
    for (const locale of ['he', 'ar'] as const) {
      assertNoDashes(locale, gamesWithSeo(locale));
    }
  });

  it('no blacklisted AI-ish Hebrew words in any he seo string (any game)', () => {
    for (const key of gamesWithSeo('he')) {
      const strings = collectSeoStrings('he', key);
      for (const str of strings) {
        for (const word of BLACKLISTED_WORDS) {
          if (str.includes(word)) {
            throw new Error(`[${key}] blacklisted word "${word}" found in: "${str}"`);
          }
        }
      }
    }
  });
});

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

describe('non-latin script sanity', () => {
  // For each locale with a non-Latin script, every game's concatenated seo strings
  // must contain at least one character of that script. This guards against
  // transliteration/accent-stripping corruption.
  const scriptChecks: Array<{ locale: (typeof LOCALES)[number]; label: string; regex: RegExp }> = [
    { locale: 'ru', label: 'Cyrillic', regex: /[Ѐ-ӿ]/ },
    { locale: 'ar', label: 'Arabic', regex: /[؀-ۿ]/ },
    { locale: 'he', label: 'Hebrew', regex: /[֐-׿]/ },
    { locale: 'de', label: 'German-specific (äöüßÄÖÜ)', regex: /[äöüßÄÖÜ]/ },
    { locale: 'es', label: 'Spanish accent/ñ', regex: /[áéíóúñ¿¡ÁÉÍÓÚÑ]/ },
  ];

  for (const { locale, label, regex } of scriptChecks) {
    it(`every game with seo in ${locale} contains ${label} characters`, () => {
      const keys = gamesWithSeo(locale);
      for (const key of keys) {
        const all = collectSeoStrings(locale, key).join(' ');
        expect(
          regex.test(all),
          `[${locale}/${key}] expected ${label} characters but found none — possible transliteration corruption`,
        ).toBe(true);
      }
    });
  }
});
