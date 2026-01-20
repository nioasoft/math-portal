import type { Metadata } from 'next';
import RatioClient from '@/components/worksheet/RatioClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.ratio.title'),
        description: t('pages.ratio.description'),
    };
}

export default function RatioPage() {
  return <RatioClient />;
}
