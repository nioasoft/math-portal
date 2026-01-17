import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.tirgul.net'

    const routes = [
        '',
        '/grade/1',
        '/grade/2',
        '/grade/3',
        '/grade/4',
        '/grade/5',
        '/grade/6',
        '/worksheet', // General/Custom
        '/geometry',
        '/fractions',
        '/decimals',
        '/percentage',
        '/ratio',
        '/units',
        '/series',
        '/word-problems',
        '/about'
    ]

    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1 : 0.8,
    }))
}
