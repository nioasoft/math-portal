import { Suspense } from 'react';
import WorksheetClient from '@/components/worksheet/WorksheetClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.worksheet.title'),
        description: t('pages.worksheet.description'),
        alternates: generateAlternates('/worksheet', locale as Locale),
    };
}

export default function WorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
            <WorksheetClient />
        </Suspense>
    );
}
