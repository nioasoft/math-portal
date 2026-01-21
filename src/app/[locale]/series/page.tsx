import SeriesClient from '@/components/worksheet/SeriesClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.series.title'),
        description: t('pages.series.description'),
        alternates: generateAlternates('/series', locale as Locale),
    };
}

export default function SeriesPage() {
    return <SeriesClient />;
}
