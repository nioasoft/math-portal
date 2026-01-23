import { Suspense } from 'react';
import GeometryClient from '@/components/worksheet/GeometryClient';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta, getOrganizationName, getEducationalLevels } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.geometry.title');
    const description = t('pages.geometry.description');

    return {
        title,
        description,
        alternates: generateAlternates('/geometry', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/geometry'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function GeometryWorksheetPage({ params }: { params: Promise<{ locale: string }> }) {
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
                "name": t('pages.geometry.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/geometry`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.geometry.title'),
        "description": t('pages.geometry.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/geometry`,
        "inLanguage": locale,
        "learningResourceType": "Worksheet",
        "educationalLevel": eduLevels.slice(2), // Grades 3-6
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
            <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
                <GeometryClient />
            </Suspense>
        </>
    );
}
