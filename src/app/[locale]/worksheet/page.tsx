import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen, Printer } from 'lucide-react';
import { Link, redirect } from '@/i18n/navigation';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WorksheetCatalog } from '@/components/worksheet/WorksheetCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'home.generators' });
    const title = t('title');
    const description = t('subtitle');
    return {
        title, description,
        alternates: generateAlternates('/worksheet', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/worksheet'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function WorksheetPage({ params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const query = await searchParams;
    // Preserve older bookmarks and curriculum links to the arithmetic generator.
    if (query.op || query.range) {
        const legacy = new URLSearchParams();
        for (const key of ['op', 'range']) if (typeof query[key] === 'string') legacy.set(key, query[key]);
        redirect({ href: `/worksheet/math?${legacy}`, locale });
    }
    const t = await getTranslations('worksheet');
    const home = await getTranslations('home');
    return (
        <>
        <Header />
        <main id="main-content" tabIndex={-1} className="bg-slate-50 min-h-screen py-8 sm:py-12">
            <div className="container-custom">
                <div className="max-w-3xl mb-6">
                    <Printer className="text-orange-600 mb-4" size={36} aria-hidden="true" />
                    <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">{home('generators.title')}</h1>
                    <p className="text-lg text-slate-600 leading-relaxed">{t('catalog.intro')}</p>

                </div>
                <details className="mb-8 rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <summary className="min-h-11 cursor-pointer py-2 font-bold text-orange-800 focus-visible:outline-2 focus-visible:outline-orange-700">{t('catalog.howTo')}</summary>
                <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                    {['choose', 'customize', 'print'].map((step, index) => <li key={step} className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-orange-800" aria-hidden="true">{index + 1}</span>
                        <div><h2 className="font-bold text-slate-900">{t(`catalog.steps.${step}.title`)}</h2><p className="mt-1 text-sm leading-relaxed text-slate-700">{t(`catalog.steps.${step}.text`)}</p></div>
                    </li>)}
                </ol>
                </details>
                <WorksheetCatalog />
                <Link data-discovery-source="worksheet_catalog" data-discovery-target="parent-help" href="/help" className="mt-10 inline-flex items-center gap-2 text-emerald-800 underline"><BookOpen size={20} aria-hidden="true" />{t('controls.helpForParents')}</Link>
            </div>
        </main>
        <Footer />
        </>
    );
}
