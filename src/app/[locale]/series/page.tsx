import SeriesClient from '@/components/worksheet/SeriesClient';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta, getOrganizationName, getEducationalLevels } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.series.title');
    const description = t('pages.series.description');

    return {
        title,
        description,
        alternates: generateAlternates('/series', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/series'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function SeriesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'meta' });
    const eduLevels = getEducationalLevels(locale as Locale);
    const orgName = getOrganizationName(locale as Locale);

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": t('breadcrumb.home'),
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": t('pages.series.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/series`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.series.title'),
        "description": t('pages.series.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/series`,
        "inLanguage": locale,
        "learningResourceType": "Worksheet",
        "educationalLevel": eduLevels.slice(3), // Grades 4-6
        "educationalUse": "Practice",
        "interactivityType": "active",
        "isAccessibleForFree": true,
        "provider": {
            "@type": "Organization",
            "name": orgName,
            "url": "https://www.tirgul.net"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(educationalResourceSchema) }}
            />
            <SeriesClient />
        </>
    );
}
