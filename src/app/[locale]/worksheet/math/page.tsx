import { Suspense } from 'react';
import WorksheetClient from '@/components/worksheet/WorksheetClient';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta, getOrganizationName, getEducationalLevels } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.worksheet.title');
    const description = t('pages.worksheet.description');

    return {
        title,
        description,
        alternates: generateAlternates('/worksheet/math', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/worksheet/math'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function MathWorksheetPage({ params }: { params: Promise<{ locale: string }> }) {
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
                "name": t('pages.worksheet.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/worksheet/math`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.worksheet.title'),
        "description": t('pages.worksheet.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/worksheet/math`,
        "inLanguage": locale,
        "learningResourceType": "Worksheet",
        "educationalLevel": eduLevels,
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
                <WorksheetClient />
            </Suspense>
        </>
    );
}
