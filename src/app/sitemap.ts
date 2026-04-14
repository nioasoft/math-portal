import { MetadataRoute } from 'next'
import { locales, defaultLocale, type Locale } from '@/i18n/config'
import {
    getBlogContentLocales,
    getBlogPosts,
    getHelpContentLocales,
    getHelpTopics,
    parseContentDate,
} from '@/lib/content'

const BASE_URL = 'https://www.tirgul.net'

// Helper to generate URL for a path and locale
function getUrl(path: string, locale: Locale): string {
    if (locale === defaultLocale) {
        return `${BASE_URL}${path}`
    }
    return `${BASE_URL}/${locale}${path === '/' ? '' : path}`
}

// Helper to generate language alternates for a path
function getLanguageAlternates(path: string, availableLocales: readonly Locale[]): Record<string, string> {
    const alternates: Record<string, string> = {}
    for (const locale of availableLocales) {
        alternates[locale] = getUrl(path, locale)
    }
    return alternates
}

type SitemapRoute = {
    path: string
    priority: number
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
    availableLocales?: readonly Locale[]
    lastModified?: Date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = []
    const blogLocales = getBlogContentLocales()
    const helpLocales = getHelpContentLocales()
    const blogPosts = await getBlogPosts(defaultLocale)
    const helpTopics = await getHelpTopics(defaultLocale)

    // Main pages
    const mainRoutes: SitemapRoute[] = [
        { path: '/', priority: 1, changeFrequency: 'daily' as const },
        { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
        { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
        { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
        { path: '/editorial-guidelines', priority: 0.3, changeFrequency: 'yearly' as const },
    ]

    // Grade pages
    const gradeRoutes: SitemapRoute[] = [1, 2, 3, 4, 5, 6].map(grade => ({
        path: `/grade/${grade}`,
        priority: 0.9,
        changeFrequency: 'weekly' as const,
    }))

    // Worksheet pages
    const worksheetRoutes: SitemapRoute[] = [
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
    const playRoutes: SitemapRoute[] = [
        { path: '/play', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/math', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/fractions', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/percentage', priority: 0.7, changeFrequency: 'weekly' as const },
    ]

    // Blog pages
    const blogRoutes: SitemapRoute[] = [
        { path: '/blog', priority: 0.7, changeFrequency: 'daily' as const, availableLocales: blogLocales },
        ...blogPosts.map(post => ({
            path: `/blog/${post.slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
            availableLocales: blogLocales,
            lastModified: parseContentDate(post.lastModified ?? post.date),
        })),
    ]

    // Help pages
    const helpRoutes: SitemapRoute[] = [
        { path: '/help', priority: 0.7, changeFrequency: 'weekly' as const, availableLocales: helpLocales },
        ...helpTopics.map(topic => ({
            path: `/help/${topic.slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
            availableLocales: helpLocales,
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
    for (const { path, priority, changeFrequency, availableLocales = locales, lastModified } of allRoutes) {
        for (const locale of availableLocales) {
            const entry: MetadataRoute.Sitemap[number] = {
                url: getUrl(path, locale),
                changeFrequency,
                priority,
                alternates: {
                    languages: getLanguageAlternates(path, availableLocales),
                },
            }

            if (lastModified) {
                entry.lastModified = lastModified
            }

            entries.push(entry)
        }
    }

    return entries
}
