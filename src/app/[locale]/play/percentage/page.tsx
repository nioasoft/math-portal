import { Metadata } from 'next';
import PercentageGameClient from './PercentageGameClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playPercentage.title'),
        description: t('pages.playPercentage.description'),
    };
}

export default function PercentageGamePage() {
    return <PercentageGameClient />;
}
