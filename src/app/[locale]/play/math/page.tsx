import { Metadata } from 'next';
import MathGameClient from './MathGameClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.playMath.title');
    const description = t('pages.playMath.description');

    return {
        title,
        description,
        alternates: generateAlternates('/play/math', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/play/math'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function MathGamePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

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
                "name": t('pages.play.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/play`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": t('pages.playMath.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/play/math`
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
            <MathGameClient />
        </>
    );
}
