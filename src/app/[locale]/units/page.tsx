import UnitsClient from '@/components/worksheet/UnitsClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.units.title'),
        description: t('pages.units.description'),
        alternates: generateAlternates('/units', locale as Locale),
    };
}

export default function UnitsPage() {
    return <UnitsClient />;
}
