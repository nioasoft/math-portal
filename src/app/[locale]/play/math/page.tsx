import { Metadata } from 'next';
import MathGameClient from './MathGameClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playMath.title'),
        description: t('pages.playMath.description'),
    };
}

export default function MathGamePage() {
    return <MathGameClient />;
}
