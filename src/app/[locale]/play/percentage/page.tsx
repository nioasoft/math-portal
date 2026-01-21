import { Metadata } from 'next';
import PercentageGameClient from './PercentageGameClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playPercentage.title'),
        description: t('pages.playPercentage.description'),
        alternates: generateAlternates('/play/percentage', locale as Locale),
    };
}

export default async function PercentageGamePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
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
                "name": t('pages.play.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/play`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": t('pages.playPercentage.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/play/percentage`
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema)
                }}
            />
            <PercentageGameClient />
        </>
    );
}
