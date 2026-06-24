import { describe, expect, it } from 'vitest';
import {
  buildGameFaqJsonLd,
  buildGameJsonLd,
  getGameSeoCopy,
  getGameSpecificSeoGuide,
  getTopicPracticePath,
  getTopicSeoGuide,
} from '../seo';
import type { GameMeta } from '../types';
import { GAME_IDS } from '../games/loaders';

const meta: GameMeta = {
  id: 'fraction-build',
  i18nKey: 'games3d.fractionBuild',
  topic: 'fractions',
  difficulty: 2,
  gradeRange: [2, 4],
  estimatedSeconds: 120,
  supportedModes: ['practice', 'quiz'],
};

describe('games3d seo helpers', () => {
  it('builds LearningResource JSON-LD for a game page', () => {
    const jsonLd = buildGameJsonLd({
      locale: 'en',
      gameId: meta.id,
      meta,
      title: 'Fraction Builder',
      description: 'Fill parts of the pie to match the fraction',
      topicLabel: 'Fractions',
    });

    expect(jsonLd['@type']).toBe('LearningResource');
    expect(jsonLd.url).toBe('https://www.tirgul.net/en/play/fraction-build');
    expect(jsonLd.learningResourceType).toBe('Game');
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect(jsonLd.teaches).toBe('Fractions');
  });

  it('builds FAQ JSON-LD from a per-game faq list', () => {
    const faqs = [
      { q: 'שאלה 1?', a: 'תשובה 1.' },
      { q: 'שאלה 2?', a: 'תשובה 2.' },
      { q: 'שאלה 3?', a: 'תשובה 3.' },
    ];
    const jsonLd = buildGameFaqJsonLd({ faqs });
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(3);
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toBe('תשובה 1.');
  });

  it('provides localized SEO copy for every supported locale', () => {
    expect(getGameSeoCopy('ar').gameType).toContain('ثلاثية');
    expect(getGameSeoCopy('de').practiceTitle).toBe('Was geübt wird');
    expect(getGameSeoCopy('es').faqTitle).toBe('Preguntas frecuentes');
    expect(getGameSeoCopy('ru').relatedTitle).toBe('Связанная практика');
  });

  it('provides localized topic guides instead of falling back to English', () => {
    expect(getTopicSeoGuide('he', 'fractions').focus).toContain('שברים');
    expect(getTopicSeoGuide('ar', 'geometry').focus).toContain('الأشكال');
    expect(getTopicSeoGuide('de', 'percentage').focus).toContain('Prozent');
    expect(getTopicSeoGuide('es', 'ratio').focus).toContain('razones');
    expect(getTopicSeoGuide('ru', 'decimals').focus).toContain('десятич');
  });

  it('provides a game-specific guide for every 3D game in every supported locale', () => {
    const locales = ['he', 'en', 'ar', 'de', 'es', 'ru'];
    for (const gameId of GAME_IDS) {
      for (const locale of locales) {
        const guide = getGameSpecificSeoGuide(locale, gameId);
        expect(guide, `${locale}/${gameId}`).toBeTruthy();
        expect(guide.length, `${locale}/${gameId}`).toBeGreaterThan(40);
      }
    }
  });

  it('maps game topics to related worksheet pages', () => {
    expect(getTopicPracticePath('fractions')).toBe('/fractions');
    expect(getTopicPracticePath('wordProblems')).toBe('/word-problems');
    expect(getTopicPracticePath('unknown')).toBe('/play');
  });
});
