import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Calculator, Percent, PieChart, Gamepad2, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { GamesCatalog } from '@/components/games3d/GamesCatalog';
import { getGameCards } from '@/components/games3d/gameCards';
import { TOPIC_ORDER } from '@/components/games3d/topicMeta';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta.pages.play' });

    const title = t('title');
    const description = t('description');

    return {
        title,
        description,
        alternates: generateAlternates('/play', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/play'),
        twitter: generateTwitterMeta(title, description),
    };
}

/** The 3 classic 2D timed-quiz games (distinct from the 3D games catalog). */
const quizTopics = [
    { id: 'math', icon: Calculator, gradient: 'from-blue-500 to-blue-600', href: '/play/math' },
    { id: 'fractions', icon: PieChart, gradient: 'from-violet-500 to-purple-600', href: '/play/fractions' },
    { id: 'percentage', icon: Percent, gradient: 'from-emerald-500 to-emerald-600', href: '/play/percentage' },
];

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'games.play' });
    const metaT = await getTranslations({ locale, namespace: 'meta' });

    const cards = await getGameCards(locale);

    // Topic chips, ordered. Counts are computed inside the catalog so they can
    // follow the grade filter.
    const present = [...new Set(cards.map((c) => c.topic))];
    const catalogTopics = [
        ...TOPIC_ORDER.filter((tp) => present.includes(tp)),
        ...present.filter((tp) => !TOPIC_ORDER.includes(tp)),
    ];

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: metaT('breadcrumb.home'), item: 'https://www.tirgul.net' },
            {
                '@type': 'ListItem',
                position: 2,
                name: metaT('pages.play.title'),
                item: `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/play`,
            },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            <Header />
            <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100">
                {/* Page header */}
                <div className="border-b border-slate-200 bg-white shadow-sm">
                    <div className="container-custom pt-3">
                        <Breadcrumb
                            items={[
                                { label: metaT('breadcrumb.home'), href: '/' },
                                { label: metaT('breadcrumb.play') },
                            ]}
                        />
                    </div>
                    <div className="container-custom py-3 md:py-6">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-lg md:rounded-xl md:p-3">
                                <Gamepad2 className="h-5 w-5 text-white md:h-6 md:w-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold text-slate-800 md:text-2xl">{t('header.title')}</h1>
                                <p className="text-sm text-slate-600 md:text-base">{t('header.subtitle')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <main className="container-custom flex-1 py-5 md:py-8">
                    {/* Classic 2D quick quizzes — first so a kid who wants a fast
                        timed challenge starts immediately, before the big catalog. */}
                    <section className="mb-8 md:mb-10">
                        <div className="mb-5 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                                <Zap className="h-5 w-5 text-amber-600" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 md:text-xl">{t('catalog.quizzesTitle')}</h2>
                                <p className="text-sm text-slate-500">{t('catalog.quizzesSubtitle')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
                            {quizTopics.map((topic) => {
                                const Icon = topic.icon;
                                return (
                                    <Link
                                        key={topic.id}
                                        href={topic.href}
                                        className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                                    >
                                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${topic.gradient} shadow-sm transition-transform group-hover:scale-110`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800">{t(`topics.${topic.id}.title`)}</h3>
                                            <p className="line-clamp-2 text-sm text-slate-500">{t(`topics.${topic.id}.description`)}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    {/* 3D games catalog — the primary content */}
                    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-xl font-black text-slate-800 md:text-2xl">{t('catalog.title')}</h2>
                        <p className="text-sm text-slate-600">{t('catalog.subtitle')}</p>
                    </div>

                    <GamesCatalog games={cards} topics={catalogTopics} />

                    {/* Back to worksheets */}
                    <div className="mt-10 text-center">
                        <p className="mb-1 text-sm text-slate-500">{t('footer.worksheetsPrompt')}</p>
                        <Link href="/" className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700">
                            {t('footer.backToHome')}
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
}
