import type { Metadata } from 'next';
import PercentageClient from '@/components/worksheet/PercentageClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta, getOrganizationName, getEducationalLevels } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.percentage.title');
    const description = t('pages.percentage.description');

    return {
        title,
        description,
        alternates: generateAlternates('/percentage', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/percentage'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function PercentagePage({ params }: { params: Promise<{ locale: string }> }) {
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
                "name": t('pages.percentage.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/percentage`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.percentage.title'),
        "description": t('pages.percentage.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/percentage`,
        "inLanguage": locale,
        "learningResourceType": "Worksheet",
        "educationalLevel": eduLevels.slice(4), // Grades 5-6
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
            <PercentageClient />
        </>
    );
}
