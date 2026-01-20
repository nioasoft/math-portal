import { MetadataRoute } from 'next'
import { blogPosts } from '@/lib/blog-data'
import { HELP_TOPICS } from '@/lib/help-data'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

const BASE_URL = 'https://www.tirgul.net'

// Helper to generate URL for a path and locale
function getUrl(path: string, locale: Locale): string {
    if (locale === defaultLocale) {
        return `${BASE_URL}${path}`
    }
    return `${BASE_URL}/${locale}${path === '/' ? '' : path}`
}

// Helper to generate language alternates for a path
function getLanguageAlternates(path: string): Record<string, string> {
    const alternates: Record<string, string> = {}
    for (const locale of locales) {
        alternates[locale] = getUrl(path, locale)
    }
    return alternates
}

export default function sitemap(): MetadataRoute.Sitemap {
    const entries: MetadataRoute.Sitemap = []

    // Main pages
    const mainRoutes = [
        { path: '/', priority: 1, changeFrequency: 'daily' as const },
        { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
        { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
        { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    ]

    // Grade pages
    const gradeRoutes = [1, 2, 3, 4, 5, 6].map(grade => ({
        path: `/grade/${grade}`,
        priority: 0.9,
        changeFrequency: 'weekly' as const,
    }))

    // Worksheet pages
    const worksheetRoutes = [
        { path: '/worksheet', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/worksheet/math', priority: 0.9, changeFrequency: 'weekly' as const },
        { path: '/geometry', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/fractions', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/decimals', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/percentage', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/ratio', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/units', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/series', priority: 0.8, changeFrequency: 'weekly' as const },
        { path: '/word-problems', priority: 0.8, changeFrequency: 'weekly' as const },
    ]

    // Play/Games pages
    const playRoutes = [
        { path: '/play', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/math', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/fractions', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/percentage', priority: 0.7, changeFrequency: 'weekly' as const },
    ]

    // Blog pages
    const blogRoutes = [
        { path: '/blog', priority: 0.7, changeFrequency: 'daily' as const },
        ...blogPosts.map(post => ({
            path: `/blog/${post.slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
        })),
    ]

    // Help pages
    const helpRoutes = [
        { path: '/help', priority: 0.7, changeFrequency: 'weekly' as const },
        ...HELP_TOPICS.map(topic => ({
            path: `/help/${topic.slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
        })),
    ]

    // Combine all routes
    const allRoutes = [
        ...mainRoutes,
        ...gradeRoutes,
        ...worksheetRoutes,
        ...playRoutes,
        ...blogRoutes,
        ...helpRoutes,
    ]

    // Generate sitemap entries for each route in each locale
    for (const { path, priority, changeFrequency } of allRoutes) {
        for (const locale of locales) {
            entries.push({
                url: getUrl(path, locale),
                lastModified: new Date(),
                changeFrequency,
                priority,
                alternates: {
                    languages: getLanguageAlternates(path),
                },
            })
        }
    }

    return entries
}
