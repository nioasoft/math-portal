import { Metadata } from 'next';
import FractionsGameClient from './FractionsGameClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playFractions.title'),
        description: t('pages.playFractions.description'),
    };
}

export default function FractionsGamePage() {
    return <FractionsGameClient />;
}
