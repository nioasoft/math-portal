import { Suspense } from 'react';
import GeometryClient from '@/components/worksheet/GeometryClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const baseUrl = 'https://www.tirgul.net';
    const canonicalPath = `${baseUrl}${locale !== 'he' ? `/${locale}` : ''}/geometry`;

    return {
        title: t('pages.geometry.title'),
        description: t('pages.geometry.description'),
        alternates: {
            canonical: canonicalPath,
        },
    };
}

export default function GeometryWorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse">...</div>}>
            <GeometryClient />
        </Suspense>
    );
}
