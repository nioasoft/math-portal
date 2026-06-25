import { MetadataRoute } from 'next'
import { locales, defaultLocale, type Locale } from '@/i18n/config'
import {
    getBlogContentLocales,
    getBlogPosts,
    getHelpContentLocales,
    getHelpTopics,
    parseContentDate,
} from '@/lib/content'
import {
    isSubstantialBlogPost,
    isSubstantialHelpTopic,
    isCompleteGameSeo,
} from '@/lib/contentQuality'
import { GAME_IDS } from '@/lib/games3d/games/loaders'
import { getRegisteredGames } from '@/lib/games3d/games'
import heGames3d from '../../messages/he/games3d.json'
import enGames3d from '../../messages/en/games3d.json'
import arGames3d from '../../messages/ar/games3d.json'
import deGames3d from '../../messages/de/games3d.json'
import esGames3d from '../../messages/es/games3d.json'
import ruGames3d from '../../messages/ru/games3d.json'

const BASE_URL = 'https://www.tirgul.net'

// A locale's blog/help index page is only worth indexing once it lists a few
// substantial children — an index of thin pages is itself thin.
const INDEX_MIN_CHILDREN = 3

// Per-locale games3d messages, used to check each game's SEO completeness.
type GameSeoMessages = Record<string, { seo?: unknown } | undefined>
const gameMessagesByLocale: Record<Locale, GameSeoMessages> = {
    he: heGames3d as GameSeoMessages,
    en: enGames3d as GameSeoMessages,
    ar: arGames3d as GameSeoMessages,
    de: deGames3d as GameSeoMessages,
    es: esGames3d as GameSeoMessages,
    ru: ruGames3d as GameSeoMessages,
}

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
    // Locales for which this page is indexable. Membership === page robots === hreflang.
    availableLocales?: readonly Locale[]
    lastModified?: Date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = []
    const blogLocales = getBlogContentLocales()
    const helpLocales = getHelpContentLocales()

    // --- Blog: build slug -> indexable locales, and per-locale substantial counts ---
    const blogLocalesBySlug = new Map<string, Locale[]>()
    const blogLastModifiedBySlug = new Map<string, Date | undefined>()
    const blogSubstantialCountByLocale = new Map<Locale, number>()
    for (const locale of blogLocales) {
        const posts = await getBlogPosts(locale)
        for (const post of posts) {
            if (!isSubstantialBlogPost(post)) continue
            const arr = blogLocalesBySlug.get(post.slug) ?? []
            arr.push(locale)
            blogLocalesBySlug.set(post.slug, arr)
            blogSubstantialCountByLocale.set(locale, (blogSubstantialCountByLocale.get(locale) ?? 0) + 1)
            if (locale === defaultLocale || !blogLastModifiedBySlug.has(post.slug)) {
                blogLastModifiedBySlug.set(post.slug, parseContentDate(post.lastModified ?? post.date))
            }
        }
    }

    // --- Help: build slug -> indexable locales, and per-locale substantial counts ---
    const helpLocalesBySlug = new Map<string, Locale[]>()
    const helpSubstantialCountByLocale = new Map<Locale, number>()
    for (const locale of helpLocales) {
        const topics = await getHelpTopics(locale)
        for (const topic of topics) {
            if (!isSubstantialHelpTopic(topic)) continue
            const arr = helpLocalesBySlug.get(topic.slug) ?? []
            arr.push(locale)
            helpLocalesBySlug.set(topic.slug, arr)
            helpSubstantialCountByLocale.set(locale, (helpSubstantialCountByLocale.get(locale) ?? 0) + 1)
        }
    }

    // --- Games: build gameId -> locales whose SEO block is complete ---
    const metaById = new Map(getRegisteredGames().map((g) => [g.meta.id, g.meta]))
    const gameLocalesById = new Map<string, Locale[]>()
    for (const gameId of GAME_IDS) {
        const meta = metaById.get(gameId)
        if (!meta) continue
        const seoKey = meta.i18nKey.replace(/^games3d\./, '')
        const locs: Locale[] = []
        for (const locale of locales) {
            const seo = gameMessagesByLocale[locale]?.[seoKey]?.seo
            if (isCompleteGameSeo(seo)) locs.push(locale)
        }
        if (locs.length > 0) gameLocalesById.set(gameId, locs)
    }

    // Index pages: keep only locales that have enough substantial children.
    const blogIndexLocales = blogLocales.filter(
        (loc) => (blogSubstantialCountByLocale.get(loc) ?? 0) >= INDEX_MIN_CHILDREN,
    )
    const helpIndexLocales = helpLocales.filter(
        (loc) => (helpSubstantialCountByLocale.get(loc) ?? 0) >= INDEX_MIN_CHILDREN,
    )

    // Main pages (not part of the thin tier — all locales)
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

    // Play category pages (not individual games — those are gated below)
    const playCategoryRoutes: SitemapRoute[] = [
        { path: '/play', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/math', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/fractions', priority: 0.7, changeFrequency: 'weekly' as const },
        { path: '/play/percentage', priority: 0.7, changeFrequency: 'weekly' as const },
    ]

    // Individual game pages — only locales whose SEO block is complete
    const gameRoutes: SitemapRoute[] = GAME_IDS
        .filter((gameId) => gameLocalesById.has(gameId))
        .map((gameId) => ({
            path: `/play/${gameId}`,
            priority: 0.7,
            changeFrequency: 'weekly' as const,
            availableLocales: gameLocalesById.get(gameId),
        }))

    // Blog pages — index + substantial posts only
    const blogRoutes: SitemapRoute[] = [
        ...(blogIndexLocales.length > 0
            ? [{ path: '/blog', priority: 0.7, changeFrequency: 'daily' as const, availableLocales: blogIndexLocales }]
            : []),
        ...Array.from(blogLocalesBySlug.entries()).map(([slug, locs]) => ({
            path: `/blog/${slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
            availableLocales: locs,
            lastModified: blogLastModifiedBySlug.get(slug),
        })),
    ]

    // Help pages — index + substantial topics only
    const helpRoutes: SitemapRoute[] = [
        ...(helpIndexLocales.length > 0
            ? [{ path: '/help', priority: 0.7, changeFrequency: 'weekly' as const, availableLocales: helpIndexLocales }]
            : []),
        ...Array.from(helpLocalesBySlug.entries()).map(([slug, locs]) => ({
            path: `/help/${slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
            availableLocales: locs,
        })),
    ]

    // Combine all routes
    const allRoutes = [
        ...mainRoutes,
        ...gradeRoutes,
        ...worksheetRoutes,
        ...playCategoryRoutes,
        ...gameRoutes,
        ...blogRoutes,
        ...helpRoutes,
    ]

    // Generate sitemap entries for each route in each indexable locale.
    // alternates.languages is built from the SAME locale set, so sitemap
    // membership, hreflang, and per-page robots all stay consistent.
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
