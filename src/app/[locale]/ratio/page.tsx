import type { Metadata } from 'next';
import RatioClient from '@/components/worksheet/RatioClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.ratio.title'),
        description: t('pages.ratio.description'),
        alternates: generateAlternates('/ratio', locale as Locale),
    };
}

export default async function RatioPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'meta' });

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": locale === 'he' ? "ראשי" : "Home",
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": t('pages.ratio.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/ratio`
            }
        ]
    };

    const educationalResourceSchema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": t('pages.ratio.title'),
        "description": t('pages.ratio.description'),
        "url": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/ratio`,
        "inLanguage": locale,
        "learningResourceType": "Worksheet",
        "educationalLevel": ["כיתה ה", "כיתה ו"],
        "educationalUse": "Practice",
        "interactivityType": "active",
        "isAccessibleForFree": true,
        "provider": {
            "@type": "Organization",
            "name": "דפי עבודה חכמים",
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
            <RatioClient />
        </>
    );
}
