import { describe, it, expect } from 'vitest';
import {
  countWords,
  blogPostWordCount,
  helpTopicWordCount,
  isSubstantialBlogPost,
  isSubstantialHelpTopic,
  MIN_BLOG_WORDS,
  MIN_HELP_WORDS,
} from '../contentQuality';
import type { BlogPostJSON, HelpTopicJSON } from '../content';

function makeBlogPost(content: string): BlogPostJSON {
  return {
    slug: 'x',
    title: 'T',
    excerpt: 'E',
    date: '01/01/2026',
    readTime: '3',
    category: 'tips' as BlogPostJSON['category'],
    categoryLabel: 'Tips',
    image: '/x.jpg',
    tags: [],
    content,
  };
}

function makeHelpTopic(partial: Partial<HelpTopicJSON>): HelpTopicJSON {
  return {
    slug: 'x',
    title: 'T',
    shortDescription: '',
    importance: '',
    howToTeach: [],
    examples: [],
    commonMistakes: [],
    parentTips: [],
    relatedGeneratorHref: '/x',
    relatedGeneratorTitle: 'X',
    ...partial,
  };
}

describe('countWords', () => {
  it('strips HTML tags and counts visible words', () => {
    expect(countWords('<p>hello <strong>brave</strong> world</p>')).toBe(3);
  });
  it('strips HTML entities', () => {
    expect(countWords('a &amp; b')).toBe(2); // "a b" -> 2
  });
  it('handles empty / whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   <br/>  ')).toBe(0);
  });
  it('counts non-Latin scripts by whitespace', () => {
    expect(countWords('שלום עולם מתמטיקה')).toBe(3);
  });
});

describe('isSubstantialBlogPost', () => {
  it('rejects a thin post', () => {
    const post = makeBlogPost('<p>Too short to index.</p>');
    expect(blogPostWordCount(post)).toBeLessThan(MIN_BLOG_WORDS);
    expect(isSubstantialBlogPost(post)).toBe(false);
  });
  it('accepts a post at/over the threshold', () => {
    const body = `<p>${Array(MIN_BLOG_WORDS).fill('word').join(' ')}</p>`;
    expect(isSubstantialBlogPost(makeBlogPost(body))).toBe(true);
  });
});

describe('isSubstantialHelpTopic', () => {
  it('rejects a thin topic', () => {
    expect(isSubstantialHelpTopic(makeHelpTopic({ importance: 'short' }))).toBe(false);
  });
  it('counts across all structured fields and accepts when long enough', () => {
    const filler = Array(MIN_HELP_WORDS).fill('word').join(' ');
    const topic = makeHelpTopic({ importance: filler });
    expect(helpTopicWordCount(topic)).toBeGreaterThanOrEqual(MIN_HELP_WORDS);
    expect(isSubstantialHelpTopic(topic)).toBe(true);
  });
  it('aggregates examples fields into the count', () => {
    const topic = makeHelpTopic({
      examples: [{ problem: 'a b c', solution: 'd e f', explanation: 'g h i' }],
    });
    expect(helpTopicWordCount(topic)).toBe(9);
  });
});
