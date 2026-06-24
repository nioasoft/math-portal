import { describe, expect, it } from 'vitest';
import {
  buildGameFaqJsonLd,
  buildGameJsonLd,
  getGameSeoCopy,
  getTopicPracticePath,
} from '../seo';
import type { GameMeta } from '../types';

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

  it('maps game topics to related worksheet pages', () => {
    expect(getTopicPracticePath('fractions')).toBe('/fractions');
    expect(getTopicPracticePath('wordProblems')).toBe('/word-problems');
    expect(getTopicPracticePath('unknown')).toBe('/play');
  });
});
