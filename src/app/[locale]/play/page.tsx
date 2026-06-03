import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Calculator, Percent, PieChart, Gamepad2, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { getRegisteredGames } from '@/lib/games3d/games';
import { GamesCatalog, type CatalogTopic } from '@/components/games3d/GamesCatalog';
import { TOPIC_ORDER } from '@/components/games3d/topicMeta';
import type { GameCardData } from '@/components/games3d/GameCard';

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
    const tGames3d = await getTranslations({ locale, namespace: 'games3d' });

    // Resolve localized card data for every registered 3D game.
    const cards: GameCardData[] = getRegisteredGames().map((g) => {
        const suffix = g.meta.i18nKey.replace('games3d.', '');
        const block = tGames3d.raw(suffix) as { title?: string } | undefined;
        return {
            id: g.meta.id,
            title: block?.title ?? g.meta.id,
            topic: g.meta.topic,
            topicLabel: tGames3d(`topics.${g.meta.topic}`),
            gradeLabel: tGames3d('grades', { from: g.meta.gradeRange[0], to: g.meta.gradeRange[1] }),
        };
    });

    // Topic chips, ordered, with counts.
    const counts = cards.reduce<Record<string, number>>((acc, c) => {
        acc[c.topic] = (acc[c.topic] ?? 0) + 1;
        return acc;
    }, {});
    const catalogTopics: CatalogTopic[] = [
        ...TOPIC_ORDER.filter((tp) => counts[tp]),
        ...Object.keys(counts).filter((tp) => !TOPIC_ORDER.includes(tp)),
    ].map((key) => ({ key, count: counts[key] }));

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
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-lg md:rounded-xl md:p-3">
                                    <Gamepad2 className="h-5 w-5 text-white md:h-6 md:w-6" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-slate-800 md:text-2xl">{t('header.title')}</h1>
                                    <p className="hidden text-xs text-slate-500 md:block md:text-sm">{t('header.subtitle')}</p>
                                </div>
                            </div>
                            <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-700">
                                {t('header.back')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="container-custom py-5 md:py-8">
                    {/* 3D games catalog — the primary content */}
                    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-xl font-black text-slate-800 md:text-2xl">{t('catalog.title')}</h2>
                        <p className="text-sm text-slate-500">{t('catalog.subtitle')}</p>
                    </div>

                    <GamesCatalog games={cards} topics={catalogTopics} />

                    {/* Classic 2D quick quizzes — clearly separated secondary section */}
                    <section className="mt-14 border-t border-slate-200 pt-8">
                        <div className="mb-5 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                                <Zap className="h-5 w-5 text-amber-600" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 md:text-xl">{t('catalog.quizzesTitle')}</h2>
                                <p className="text-xs text-slate-500 md:text-sm">{t('catalog.quizzesSubtitle')}</p>
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
                                            <p className="truncate text-xs text-slate-500 md:text-sm">{t(`topics.${topic.id}.description`)}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    {/* Back to worksheets */}
                    <div className="mt-10 text-center">
                        <p className="mb-1 text-sm text-slate-500">{t('footer.worksheetsPrompt')}</p>
                        <Link href="/" className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700">
                            {t('footer.backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
