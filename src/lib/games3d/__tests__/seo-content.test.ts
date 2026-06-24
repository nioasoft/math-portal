import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isCompleteGameSeo, type GameSeo } from '../gameSeo';
import { buildGameFaqJsonLd } from '../seo';

const LOCALES = ['he', 'en', 'ar', 'de', 'es', 'ru'] as const;

// camelCase i18n keys for the 4 fractions games (this task's scope).
const FRACTIONS_KEYS = ['fractionBuild', 'fractionNumberLine', 'fractionSlice', 'fractionStrip'];

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
