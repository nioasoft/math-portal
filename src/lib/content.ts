import { Locale, defaultLocale } from '@/i18n/config';
import { BlogCategory, blogCategories } from './blog-data';
import fs from 'fs';
import path from 'path';

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
 * Falls back to Hebrew if locale-specific content doesn't exist
 */
export async function getBlogPosts(locale: Locale = defaultLocale): Promise<BlogPostJSON[]> {
  const contentDir = path.join(process.cwd(), 'content', 'blog', locale);
  const fallbackDir = path.join(process.cwd(), 'content', 'blog', defaultLocale);

  // Use locale directory if it exists, otherwise fallback to default
  const dir = fs.existsSync(contentDir) ? contentDir : fallbackDir;

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
 * Falls back to Hebrew if locale-specific content doesn't exist
 */
export async function getBlogPost(slug: string, locale: Locale = defaultLocale): Promise<BlogPostJSON | null> {
  const localePath = path.join(process.cwd(), 'content', 'blog', locale, `${slug}.json`);
  const fallbackPath = path.join(process.cwd(), 'content', 'blog', defaultLocale, `${slug}.json`);

  const filePath = fs.existsSync(localePath) ? localePath : fallbackPath;

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
  const contentDir = path.join(process.cwd(), 'content', 'blog', defaultLocale);

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
 * Falls back to Hebrew if locale-specific content doesn't exist
 */
export async function getHelpTopics(locale: Locale = defaultLocale): Promise<HelpTopicJSON[]> {
  const contentDir = path.join(process.cwd(), 'content', 'help', locale);
  const fallbackDir = path.join(process.cwd(), 'content', 'help', defaultLocale);

  // Use locale directory if it exists and has files, otherwise fallback to default
  let dir = fallbackDir;
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
      dir = contentDir;
    }
  }

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
 * Falls back to Hebrew if locale-specific content doesn't exist
 */
export async function getHelpTopic(slug: string, locale: Locale = defaultLocale): Promise<HelpTopicJSON | null> {
  const localePath = path.join(process.cwd(), 'content', 'help', locale, `${slug}.json`);
  const fallbackPath = path.join(process.cwd(), 'content', 'help', defaultLocale, `${slug}.json`);

  const filePath = fs.existsSync(localePath) ? localePath : fallbackPath;

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
  const contentDir = path.join(process.cwd(), 'content', 'help', defaultLocale);

  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  return files.map(f => f.replace('.json', ''));
}
