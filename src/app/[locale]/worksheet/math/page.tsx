import { Suspense } from 'react';
import WorksheetClient from '@/components/worksheet/WorksheetClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const baseUrl = 'https://www.tirgul.net';
    const canonicalPath = `${baseUrl}${locale !== 'he' ? `/${locale}` : ''}/worksheet/math`;

    return {
        title: t('pages.worksheet.title'),
        description: t('pages.worksheet.description'),
        alternates: {
            canonical: canonicalPath,
        },
    };
}

export default function MathWorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
            <WorksheetClient />
        </Suspense>
    );
}
