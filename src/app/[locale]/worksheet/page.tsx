import { Suspense } from 'react';
import WorksheetClient from '@/components/worksheet/WorksheetClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.worksheet.title');
    const description = t('pages.worksheet.description');

    return {
        title,
        description,
        alternates: generateAlternates('/worksheet', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/worksheet'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function WorksheetPage({ params }: { params: Promise<{ locale: string }> }) {
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
                "name": t('pages.worksheet.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/worksheet`
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
            <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
                <WorksheetClient />
            </Suspense>
        </>
    );
}
