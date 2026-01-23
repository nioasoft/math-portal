import type { Metadata } from 'next';
import DecimalsClient from '@/components/worksheet/DecimalsClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta, getOrganizationName, getEducationalLevels } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.decimals.title');
    const description = t('pages.decimals.description');

    return {
        title,
        description,
        alternates: generateAlternates('/decimals', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/decimals'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function DecimalsPage({ params }: { params: Promise<{ locale: string }> }) {
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
                "name": t('pages.decimals.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/decimals`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.decimals.title'),
        "description": t('pages.decimals.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/decimals`,
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
            <DecimalsClient />
        </>
    );
}
