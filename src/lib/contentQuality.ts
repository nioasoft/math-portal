import type { BlogPostJSON, HelpTopicJSON } from './content';
import { isCompleteGameSeo } from './games3d/gameSeo';

/**
 * Content-depth gate.
 *
 * Pages with too little unique body text get "Crawled - currently not indexed" in
 * Google Search Console: Google fetches them but judges them not worth indexing.
 * These helpers compute a word count and decide whether a blog post / help topic is
 * "substantial" enough to be indexable. The same predicate drives BOTH the page's
 * `robots` metadata AND the sitemap, so the two can never disagree.
 *
 * Mirrors the depth-gate pattern of {@link isCompleteGameSeo} in games3d/gameSeo.ts.
 */

/** Minimum body words for a blog post to be considered indexable. */
export const MIN_BLOG_WORDS = 350;
/** Minimum combined body words for a help topic to be considered indexable. */
export const MIN_HELP_WORDS = 300;

/**
 * Counts words in a string after stripping HTML.
 * Whitespace splitting is correct for all supported locales (he/ar/de/es/ru).
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const plain = text
    .replace(/<[^>]+>/g, ' ') // strip tags
    .replace(/&[a-z#0-9]+;/gi, ' ') // strip entities
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

/** Body word count for a blog post (title/excerpt are metadata, not counted). */
export function blogPostWordCount(post: BlogPostJSON): number {
  return countWords(post.content);
}

/** Combined body word count across a help topic's structured fields. */
export function helpTopicWordCount(topic: HelpTopicJSON): number {
  const parts: string[] = [
    topic.shortDescription,
    topic.importance,
    ...topic.howToTeach,
    ...topic.commonMistakes,
    ...topic.parentTips,
    ...topic.examples.flatMap((e) => [e.problem, e.solution, e.explanation]),
  ];
  return countWords(parts.join(' '));
}

/** True when a blog post has enough unique body text to deserve indexing. */
export function isSubstantialBlogPost(post: BlogPostJSON): boolean {
  return blogPostWordCount(post) >= MIN_BLOG_WORDS;
}

/** True when a help topic has enough unique body text to deserve indexing. */
export function isSubstantialHelpTopic(topic: HelpTopicJSON): boolean {
  return helpTopicWordCount(topic) >= MIN_HELP_WORDS;
}

// Re-export so all three depth gates live behind one module.
export { isCompleteGameSeo };
