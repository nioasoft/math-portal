import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Calculator, Percent, PieChart, Gamepad2, Trophy, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta.pages.play' });

    return {
        title: t('title'),
        description: t('description'),
        alternates: generateAlternates('/play', locale as Locale),
    };
}

const topics = [
    {
        id: 'math',
        icon: Calculator,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        href: '/play/math'
    },
    {
        id: 'fractions',
        icon: PieChart,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50',
        href: '/play/fractions'
    },
    {
        id: 'percentage',
        icon: Percent,
        color: 'from-emerald-500 to-emerald-600',
        bgColor: 'bg-emerald-50',
        href: '/play/percentage'
    }
];

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'games.play' });
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Header - Compact on mobile */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="container-custom py-3 md:py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-2 md:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg md:rounded-xl shadow-lg">
                                <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-2xl font-bold text-slate-800">{t('header.title')}</h1>
                                <p className="text-slate-500 text-xs md:text-sm hidden md:block">{t('header.subtitle')}</p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="text-slate-500 hover:text-slate-700 transition text-sm"
                        >
                            {t('header.back')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container-custom py-4 md:py-12">
                {/* Topic Cards - First on mobile */}
                <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6">{t('topics.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-12">
                    {topics.map((topic) => {
                        const Icon = topic.icon;
                        return (
                            <Link
                                key={topic.id}
                                href={topic.href}
                                className="group"
                            >
                                <div className={`${topic.bgColor} rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-slate-300 flex md:block items-center gap-4`}>
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center md:mb-4 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                                        <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-0.5 md:mb-2">{t(`topics.${topic.id}.title`)}</h3>
                                        <p className="text-slate-600 text-xs md:text-sm">{t(`topics.${topic.id}.description`)}</p>
                                    </div>
                                    <div className="hidden md:flex mt-4 items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-slate-700 transition">
                                        <span>{t('topics.startPlaying')}</span>
                                        <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Game Mode Explanation - Hidden on mobile */}
                <div className="hidden md:grid md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Zap className="w-5 h-5 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">{t('gameModes.practice.title')}</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {t('gameModes.practice.description')}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Trophy className="w-5 h-5 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">{t('gameModes.quiz.title')}</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {t('gameModes.quiz.description')}
                        </p>
                    </div>
                </div>

                {/* Back to worksheets link */}
                <div className="mt-6 md:mt-8 text-center">
                    <p className="text-slate-500 text-sm mb-2">{t('footer.worksheetsPrompt')}</p>
                    <Link
                        href="/"
                        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                        {t('footer.backToHome')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
