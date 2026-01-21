import { Metadata } from 'next';
import MathGameClient from './MathGameClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.playMath.title'),
        description: t('pages.playMath.description'),
        alternates: generateAlternates('/play/math', locale as Locale),
    };
}

export default function MathGamePage() {
    return <MathGameClient />;
}
