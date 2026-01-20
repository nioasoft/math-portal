import type { Metadata } from 'next';
import DecimalsClient from '@/components/worksheet/DecimalsClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.decimals.title'),
        description: t('pages.decimals.description'),
    };
}

export default function DecimalsPage() {
  return <DecimalsClient />;
}
