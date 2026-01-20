import WordProblemsClient from '@/components/worksheet/WordProblemsClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.wordProblems.title'),
        description: t('pages.wordProblems.description'),
    };
}

export default function WordProblemsPage() {
    return <WordProblemsClient />;
}
