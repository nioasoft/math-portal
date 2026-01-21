import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Brain, Printer, Settings, Sparkles, Heart, ArrowLeft, Calculator, Users, Target } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.about.title'),
        description: t('pages.about.description'),
        alternates: generateAlternates('/about', locale as Locale),
    };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'about' });
    const metaT = await getTranslations({ locale, namespace: 'meta' });

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": locale === 'he' ? "ראשי" : "Home",
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": metaT('pages.about.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/about`
            }
        ]
    };

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": t('schema.name'),
        "alternateName": "Tirgul",
        "url": "https://www.tirgul.net",
        "description": t('schema.description'),
        "foundingDate": "2024",
        "areaServed": {
            "@type": "Country",
            "name": t('schema.areaServed')
        },
        "knowsAbout": [
            t('schema.knowsAbout.math'),
            t('schema.knowsAbout.elementary'),
            t('schema.knowsAbout.worksheets'),
            t('schema.knowsAbout.mathematics')
        ]
    };

    const howToSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": t('howItWorks.title'),
        "description": t('howItWorks.subtitle'),
        "step": [
            {
                "@type": "HowToStep",
                "position": 1,
                "name": t('howItWorks.step1.title'),
                "text": t('howItWorks.step1.description')
            },
            {
                "@type": "HowToStep",
                "position": 2,
                "name": t('howItWorks.step2.title'),
                "text": t('howItWorks.step2.description')
            },
            {
                "@type": "HowToStep",
                "position": 3,
                "name": t('howItWorks.step3.title'),
                "text": t('howItWorks.step3.description')
            }
        ]
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <Script
                id="organization-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <Script
                id="howto-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
            />
            <Script
                id="breadcrumb-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-10 right-[10%] w-64 h-64 bg-orange-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-[10%] w-48 h-48 bg-sky-200/20 rounded-full blur-2xl"></div>

                    <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white border border-orange-200 rounded-full px-5 py-2.5 shadow-sm mb-6">
                            <Heart size={16} className="text-rose-500" />
                            <span className="text-sm font-bold text-slate-700">{t('badge')}</span>
                        </div>

                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-6 shadow-lg shadow-orange-200">
                            <Calculator size={40} className="text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6">
                            {t('hero.title')} <span className="text-gradient-warm">{t('hero.titleHighlight')}</span>
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-4">
                            {t('hero.description')}
                        </p>
                        <p className="text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
                            {t('hero.subdescription')}
                        </p>
                    </div>
                </section>

                {/* How it works */}
                <section className="py-20">
                    <div className="container-custom">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">{t('howItWorks.title')}</h2>
                            <p className="text-lg text-slate-500">{t('howItWorks.subtitle')}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-sky-200 relative z-10">1</div>
                                <h3 className="text-xl font-bold mb-3 relative z-10">{t('howItWorks.step1.title')}</h3>
                                <p className="text-slate-500 relative z-10">
                                    {t('howItWorks.step1.description')}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-violet-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-violet-200 relative z-10">2</div>
                                <h3 className="text-xl font-bold mb-3 relative z-10">{t('howItWorks.step2.title')}</h3>
                                <p className="text-slate-500 relative z-10">
                                    {t('howItWorks.step2.description')}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-emerald-200 relative z-10">3</div>
                                <h3 className="text-xl font-bold mb-3 relative z-10">{t('howItWorks.step3.title')}</h3>
                                <p className="text-slate-500 relative z-10">
                                    {t('howItWorks.step3.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why we built this */}
                <section className="py-20 bg-white">
                    <div className="container-custom">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-bold mb-6">
                                    <Target size={16} />
                                    {t('mission.badge')}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-6 leading-tight">
                                    {t('mission.title')}
                                </h2>
                                <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                                    <p>
                                        <strong className="text-slate-800">{t('mission.background.label')}</strong> {t('mission.background.text')}
                                    </p>
                                    <p>
                                        {t('mission.problem')}
                                    </p>
                                    <p>
                                        <strong className="text-slate-800">{t('mission.method.label')}</strong> {t('mission.method.text')}
                                    </p>
                                    <p>
                                        {t('mission.infinite')} <strong className="text-slate-800">{t('mission.infiniteHighlight')}</strong>{t('mission.infiniteText')}
                                    </p>
                                </div>
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-xl">
                                        <Brain size={22} className="text-emerald-600" />
                                        <span className="font-bold text-slate-700">{t('mission.features.thinking')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-sky-50 p-4 rounded-xl">
                                        <Printer size={22} className="text-sky-600" />
                                        <span className="font-bold text-slate-700">{t('mission.features.inkSaving')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-violet-50 p-4 rounded-xl">
                                        <Settings size={22} className="text-violet-600" />
                                        <span className="font-bold text-slate-700">{t('mission.features.customization')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-xl">
                                        <Sparkles size={22} className="text-amber-600" />
                                        <span className="font-bold text-slate-700">{t('mission.features.cleanUI')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-br from-orange-100 to-rose-100 rounded-[2.5rem] opacity-60 blur-2xl"></div>
                                <div className="relative bg-gradient-to-br from-orange-500 to-rose-500 p-10 rounded-3xl shadow-2xl shadow-orange-200/50 overflow-hidden">
                                    <div className="absolute -right-10 -top-10 text-white/10">
                                        <Heart size={200} fill="currentColor" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-4 relative z-10">{t('free.title')}</h3>
                                    <p className="text-orange-100 relative z-10 mb-6 text-lg leading-relaxed">
                                        {t('free.description')}
                                    </p>
                                    <Link
                                        href={`/${locale}`}
                                        className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all relative z-10"
                                    >
                                        <span>{t('free.cta')}</span>
                                        <ArrowLeft size={18} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-16 bg-slate-50">
                    <div className="container-custom">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">{t('stats.title')}</h2>
                            <p className="text-slate-500">{t('stats.subtitle')}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-100">
                                <div className="text-4xl font-black text-orange-500 mb-2">12+</div>
                                <div className="text-slate-500 font-medium">{t('stats.generators')}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-100">
                                <div className="text-4xl font-black text-sky-500 mb-2">6</div>
                                <div className="text-slate-500 font-medium">{t('stats.grades')}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-100">
                                <div className="text-4xl font-black text-emerald-500 mb-2">∞</div>
                                <div className="text-slate-500 font-medium">{t('stats.exercises')}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-100">
                                <div className="text-4xl font-black text-rose-500 mb-2">0₪</div>
                                <div className="text-slate-500 font-medium">{t('stats.cost')}</div>
                            </div>
                        </div>
                        <div className="max-w-2xl mx-auto mt-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-3 text-center">{t('stats.coverage.title')}</h3>
                            <p className="text-slate-600 text-center">
                                {t('stats.coverage.description')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Methodology Section */}
                <section className="py-20 bg-slate-50">
                    <div className="container-custom max-w-4xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">{t('methodology.title')}</h2>
                            <p className="text-lg text-slate-500">{t('methodology.subtitle')}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                                    <Target size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{t('methodology.personalized.title')}</h3>
                                <p className="text-slate-600">
                                    {t('methodology.personalized.description')}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center mb-4">
                                    <Brain size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{t('methodology.repetition.title')}</h3>
                                <p className="text-slate-600">
                                    {t('methodology.repetition.description')}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center mb-4">
                                    <Settings size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{t('methodology.progressive.title')}</h3>
                                <p className="text-slate-600">
                                    {t('methodology.progressive.description')}
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{t('methodology.feedback.title')}</h3>
                                <p className="text-slate-600">
                                    {t('methodology.feedback.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                    <div className="absolute inset-0 grid-pattern opacity-5"></div>
                    <div className="container-custom relative z-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-6 shadow-lg">
                            <Users size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{t('cta.title')}</h2>
                        <p className="text-xl text-slate-400 mb-8 max-w-xl mx-auto">
                            {t('cta.description')}
                        </p>
                        <Link
                            href={`/${locale}`}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all"
                        >
                            <span>{t('cta.button')}</span>
                            <ArrowLeft size={20} />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
