import { Suspense } from 'react';
import GeometryClient from '@/components/worksheet/GeometryClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.geometry.title'),
        description: t('pages.geometry.description'),
        alternates: generateAlternates('/geometry', locale as Locale),
    };
}

export default function GeometryWorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
            <GeometryClient />
        </Suspense>
    );
}
