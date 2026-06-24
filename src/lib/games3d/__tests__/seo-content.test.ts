import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isCompleteGameSeo, type GameSeo } from '../gameSeo';
import { buildGameFaqJsonLd } from '../seo';

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
  function collectHeStrings(gameKey: string): string[] {
    const data = loadGames3d('he');
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

  it('no em-dashes or en-dashes in any fractions game Hebrew seo string', () => {
    for (const key of FRACTIONS_KEYS) {
      const strings = collectHeStrings(key);
      for (const str of strings) {
        const emIdx = str.indexOf('—');
        const enIdx = str.indexOf('–');
        if (emIdx !== -1) {
          throw new Error(
            `[${key}] em-dash (—) found in: "${str.slice(Math.max(0, emIdx - 20), emIdx + 20)}"`
          );
        }
        if (enIdx !== -1) {
          throw new Error(
            `[${key}] en-dash (–) found in: "${str.slice(Math.max(0, enIdx - 20), enIdx + 20)}"`
          );
        }
      }
    }
  });

  it('no blacklisted AI-ish Hebrew words in any fractions game Hebrew seo string', () => {
    for (const key of FRACTIONS_KEYS) {
      const strings = collectHeStrings(key);
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
