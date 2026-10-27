import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen, ArrowLeft, Printer } from 'lucide-react';
import { Link, redirect } from '@/i18n/navigation';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

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

const topics = [
    { route: '/worksheet/math?op=add', title: 'operations.addition', description: 'content.description' },
    { route: '/worksheet/math?op=sub', title: 'operations.subtraction', description: 'content.description' },
    { route: '/worksheet/math?op=mul&range=100', title: 'operations.multiplication', description: 'content.description' },
    { route: '/worksheet/math?op=div&range=100', title: 'operations.division', description: 'content.description' },
    { route: '/fractions', title: 'fractions.title', description: 'fractions.content.description' },
    { route: '/decimals', title: 'decimals.title', description: 'decimals.content.description' },
    { route: '/geometry', title: 'geometry.title', description: 'geometry.content.description' },
    { route: '/word-problems', title: 'wordProblems.title', description: 'wordProblems.content.description' },
    { route: '/series', title: 'series.title', description: 'series.content.description' },
    { route: '/units', title: 'units.title', description: 'units.content.description' },
    { route: '/percentage', title: 'percentage.title', description: 'percentage.content.description' },
    { route: '/ratio', title: 'ratio.title', description: 'ratio.content.description' },
] as const;

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
        <main className="bg-slate-50 min-h-screen py-12 sm:py-16">
            <div className="container-custom">
                <div className="max-w-3xl mb-10">
                    <Printer className="text-orange-600 mb-4" size={36} aria-hidden="true" />
                    <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">{home('generators.title')}</h1>
                    <p className="text-lg text-slate-600 leading-relaxed">{home('generators.subtitle')}</p>
                    <p className="mt-3 text-slate-600">{t('document.printHint')}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {topics.map(topic => (
                        <Link key={topic.route} href={topic.route} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 hover:border-orange-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-orange-600 transition">
                            <h2 className="text-xl font-bold text-slate-900 mb-3">{t(topic.title)}</h2>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">{t(topic.description)}</p>
                            <span className="flex items-center gap-2 font-bold text-orange-700">{home('generators.cta')}<ArrowLeft size={18} className="ltr:rotate-180" aria-hidden="true" /></span>
                        </Link>
                    ))}
                </div>
                <Link href="/help" className="mt-10 inline-flex items-center gap-2 text-emerald-800 underline"><BookOpen size={20} aria-hidden="true" />{t('controls.helpForParents')}</Link>
            </div>
        </main>
    );
}
