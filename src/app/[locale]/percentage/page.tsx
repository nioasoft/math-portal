import type { Metadata } from 'next';
import PercentageClient from '@/components/worksheet/PercentageClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.percentage.title'),
        description: t('pages.percentage.description'),
    };
}

export default function PercentagePage() {
  return <PercentageClient />;
}
