import type { Metadata } from 'next';
import FractionsClient from '@/components/worksheet/FractionsClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const baseUrl = 'https://www.tirgul.net';
    const canonicalPath = `${baseUrl}${locale !== 'he' ? `/${locale}` : ''}/fractions`;

    return {
        title: t('pages.fractions.title'),
        description: t('pages.fractions.description'),
        alternates: {
            canonical: canonicalPath,
        },
    };
}

export default function FractionsPage() {
  return <FractionsClient />;
}
