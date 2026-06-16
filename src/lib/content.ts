import { Locale, defaultLocale, locales } from '@/i18n/config';
import { BlogCategory, blogCategories } from './blog-data';
import fs from 'fs';
import path from 'path';

const FALLBACK_LOCALE: Locale = 'en';

function getContentDir(section: 'blog' | 'help', locale: Locale): string {
  return path.join(process.cwd(), 'content', section, locale);
}

function resolveContentDir(section: 'blog' | 'help', locale: Locale): string {
  const localeDir = getContentDir(section, locale);
  if (fs.existsSync(localeDir) && fs.readdirSync(localeDir).some(f => f.endsWith('.json'))) {
    return localeDir;
  }
  // For non-Hebrew locales, prefer English fallback; for Hebrew, use Hebrew
  if (locale !== defaultLocale) {
    const enDir = getContentDir(section, FALLBACK_LOCALE);
    if (fs.existsSync(enDir) && fs.readdirSync(enDir).some(f => f.endsWith('.json'))) {
      return enDir;
    }
  }
  return getContentDir(section, defaultLocale);
}

function hasLocalizedSectionContent(section: 'blog' | 'help', locale: Locale): boolean {
  const dir = getContentDir(section, locale);

  if (!fs.existsSync(dir)) {
    return false;
  }

  return fs.readdirSync(dir).some((file) => file.endsWith('.json'));
}

export function hasLocalizedBlogContent(locale: Locale): boolean {
  return hasLocalizedSectionContent('blog', locale);
}

export function hasLocalizedHelpContent(locale: Locale): boolean {
  return hasLocalizedSectionContent('help', locale);
}

export function getBlogContentLocales(): Locale[] {
  return locales.filter(hasLocalizedBlogContent);
}

export function getHelpContentLocales(): Locale[] {
  return locales.filter(hasLocalizedHelpContent);
}

export function parseContentDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.includes('/')
    ? value.split('/').reverse().join('-')
    : value;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export interface BlogPostJSON {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: BlogCategory;
  categoryLabel: string;
  image: string;
  tags: string[];
  author?: string;
  lastModified?: string;
  content: string;
}

/**
 * Get all blog posts for a specific locale
 * Falls back to English (then Hebrew) if locale-specific content doesn't exist
 */
export async function getBlogPosts(locale: Locale = defaultLocale): Promise<BlogPostJSON[]> {
  const dir = resolveContentDir('blog', locale);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const posts: BlogPostJSON[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const post = JSON.parse(content) as BlogPostJSON;
      posts.push(post);
    } catch (error) {
      console.error(`Error loading blog post ${file}:`, error);
    }
  }

  // Sort by date (newest first)
  posts.sort((a, b) => {
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  return posts;
}

/**
 * Get a single blog post by slug
 * Falls back to English (then Hebrew) if locale-specific content doesn't exist
 */
export async function getBlogPost(slug: string, locale: Locale = defaultLocale): Promise<BlogPostJSON | null> {
  const localePath = path.join(getContentDir('blog', locale), `${slug}.json`);
  const enPath = path.join(getContentDir('blog', FALLBACK_LOCALE), `${slug}.json`);
  const hePath = path.join(getContentDir('blog', defaultLocale), `${slug}.json`);

  let filePath = localePath;
  if (!fs.existsSync(filePath)) {
    filePath = locale !== defaultLocale ? enPath : hePath;
  }
  if (!fs.existsSync(filePath)) {
    filePath = hePath;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BlogPostJSON;
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Get all blog post slugs (for static generation)
 */
export async function getBlogSlugs(): Promise<string[]> {
  const contentDir = getContentDir('blog', defaultLocale);

  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  return files.map(f => f.replace('.json', ''));
}

/**
 * Re-export blog categories from blog-data
 */
export { blogCategories };
export type { BlogCategory };

// =============================================================================
// Help Topics
// =============================================================================

export interface HelpTopicJSON {
  slug: string;
  title: string;
  shortDescription: string;
  importance: string;
  howToTeach: string[];
  examples: {
    problem: string;
    solution: string;
    explanation: string;
  }[];
  commonMistakes: string[];
  parentTips: string[];
  relatedGeneratorHref: string;
  relatedGeneratorTitle: string;
}

/**
 * Get all help topics for a specific locale
 * Falls back to English (then Hebrew) if locale-specific content doesn't exist
 */
export async function getHelpTopics(locale: Locale = defaultLocale): Promise<HelpTopicJSON[]> {
  const dir = resolveContentDir('help', locale);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const topics: HelpTopicJSON[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const topic = JSON.parse(content) as HelpTopicJSON;
      topics.push(topic);
    } catch (error) {
      console.error(`Error loading help topic ${file}:`, error);
    }
  }

  return topics;
}

/**
 * Get a single help topic by slug
 * Falls back to English (then Hebrew) if locale-specific content doesn't exist
 */
export async function getHelpTopic(slug: string, locale: Locale = defaultLocale): Promise<HelpTopicJSON | null> {
  const localePath = path.join(getContentDir('help', locale), `${slug}.json`);
  const enPath = path.join(getContentDir('help', FALLBACK_LOCALE), `${slug}.json`);
  const hePath = path.join(getContentDir('help', defaultLocale), `${slug}.json`);

  let filePath = localePath;
  if (!fs.existsSync(filePath)) {
    filePath = locale !== defaultLocale ? enPath : hePath;
  }
  if (!fs.existsSync(filePath)) {
    filePath = hePath;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as HelpTopicJSON;
  } catch (error) {
    console.error(`Error loading help topic ${slug}:`, error);
    return null;
  }
}

/**
 * Get all help topic slugs (for static generation)
 */
export async function getHelpSlugs(): Promise<string[]> {
  const contentDir = getContentDir('help', defaultLocale);

  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  return files.map(f => f.replace('.json', ''));
}
