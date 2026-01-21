import { Metadata } from 'next';
import FractionsGameClient from './FractionsGameClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playFractions.title'),
        description: t('pages.playFractions.description'),
        alternates: generateAlternates('/play/fractions', locale as Locale),
    };
}

export default function FractionsGamePage() {
    return <FractionsGameClient />;
}
