import type { Metadata } from 'next';
import FractionsClient from '@/components/worksheet/FractionsClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.fractions.title'),
        description: t('pages.fractions.description'),
        alternates: generateAlternates('/fractions', locale as Locale),
    };
}

export default function FractionsPage() {
  return <FractionsClient />;
}
