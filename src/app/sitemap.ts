import { MetadataRoute } from 'next'
import { blogPosts } from '@/lib/blog-data'
import { HELP_TOPICS } from '@/lib/help-data'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.tirgul.net'

    // Main pages
    const mainRoutes = [
        { route: '', priority: 1, changeFrequency: 'daily' as const },
        { route: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
        { route: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
        { route: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    ]

    // Grade pages
    const gradeRoutes = [1, 2, 3, 4, 5, 6].map(grade => ({
        route: `/grade/${grade}`,
        priority: 0.9,
        changeFrequency: 'weekly' as const,
    }))

    // Worksheet pages
    const worksheetRoutes = [
        { route: '/worksheet', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/worksheet/math', priority: 0.9, changeFrequency: 'weekly' as const },
        { route: '/geometry', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/fractions', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/decimals', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/percentage', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/ratio', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/units', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/series', priority: 0.8, changeFrequency: 'weekly' as const },
        { route: '/word-problems', priority: 0.8, changeFrequency: 'weekly' as const },
    ]

    // Play/Games pages
    const playRoutes = [
        { route: '/play', priority: 0.7, changeFrequency: 'weekly' as const },
        { route: '/play/math', priority: 0.7, changeFrequency: 'weekly' as const },
        { route: '/play/fractions', priority: 0.7, changeFrequency: 'weekly' as const },
        { route: '/play/percentage', priority: 0.7, changeFrequency: 'weekly' as const },
    ]

    // Blog pages
    const blogRoutes = [
        { route: '/blog', priority: 0.7, changeFrequency: 'daily' as const },
        ...blogPosts.map(post => ({
            route: `/blog/${post.slug}`,
            priority: 0.6,
            changeFrequency: 'monthly' as const,
        })),
    ]

    // Help pages
    const helpRoutes = [
        { route: '/help', priority: 0.7, changeFrequency: 'weekly' as const },
        ...HELP_TOPICS.map(topic => ({
            route: `/help/${topic.slug}`,
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

    return allRoutes.map(({ route, priority, changeFrequency }) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
    }))
}
