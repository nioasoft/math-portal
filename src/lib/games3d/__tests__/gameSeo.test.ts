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
