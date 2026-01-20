import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getHelpTopic, getHelpTopics, getHelpSlugs } from '@/lib/content';
import { Locale, locales } from '@/i18n/config';
import { AdSlot } from '@/components/AdSlot';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, AlertTriangle, Lightbulb, CheckCircle, ExternalLink, GraduationCap } from 'lucide-react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface PageProps {
    params: Promise<{ topic: string; locale: string }>;
}

export async function generateStaticParams() {
    const slugs = await getHelpSlugs();

    // Generate params for all locales and all topics
    const params: { locale: string; topic: string }[] = [];
    for (const locale of locales) {
        for (const topic of slugs) {
            params.push({ locale, topic });
        }
    }

    return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { topic: topicSlug, locale } = await params;
    const topic = await getHelpTopic(topicSlug, locale as Locale);
    const t = await getTranslations({ locale, namespace: 'help' });

    if (!topic) {
        return {
            title: t('topic.notFound'),
        };
    }

    return {
        title: t('topic.metaTitle', { title: topic.title }),
        description: topic.shortDescription,
    };
}

export default async function HelpTopicPage({ params }: PageProps) {
    const { topic: topicSlug, locale } = await params;
    const topic = await getHelpTopic(topicSlug, locale as Locale);
    const t = await getTranslations({ locale, namespace: 'help' });

    if (!topic) {
        notFound();
    }

    // Get all topics for "other topics" section
    const allTopics = await getHelpTopics(locale as Locale);

    // Generate FAQ Schema structured data
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": t('topic.sections.whyImportant'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": topic.importance
                }
            },
            {
                "@type": "Question",
                "name": t('topic.sections.howToTeach'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": topic.howToTeach.join(" ")
                }
            },
            {
                "@type": "Question",
                "name": t('topic.sections.commonMistakes'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": topic.commonMistakes.join(" ")
                }
            },
            {
                "@type": "Question",
                "name": t('topic.sections.parentTips'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": topic.parentTips.join(" ")
                }
            }
        ]
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema)
                }}
            />
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-10 right-[5%] w-48 h-48 bg-emerald-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-[10%] w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"></div>

                    <div className="container-custom max-w-4xl relative z-10">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                            <Link href="/" className="hover:text-emerald-600 transition-colors">{t('topic.breadcrumb.home')}</Link>
                            <span>/</span>
                            <Link href="/help" className="hover:text-emerald-600 transition-colors">{t('topic.breadcrumb.help')}</Link>
                            <span>/</span>
                            <span className="text-slate-700 font-medium">{topic.title}</span>
                        </div>

                        <Link
                            href="/help"
                            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold mb-6 transition-colors"
                        >
                            <ArrowRight size={18} />
                            <span>{t('topic.backToAll')}</span>
                        </Link>

                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                                <GraduationCap size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-3">
                                    {t('topic.howToTeachTitle', { title: topic.title })}
                                </h1>
                                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
                                    {topic.shortDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="py-12">
                    <div className="container-custom max-w-4xl">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">
                            {/* Why it's important */}
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-sky-200">1</span>
                                    {t('topic.sections.whyImportant')}
                                </h2>
                                <p className="text-slate-600 text-lg leading-relaxed ps-13">
                                    {topic.importance}
                                </p>
                            </div>

                            {/* How to teach */}
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-500 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-violet-200">2</span>
                                    {t('topic.sections.howToTeach')}
                                </h2>
                                <ul className="space-y-3 ps-13">
                                    {topic.howToTeach.map((step, index) => (
                                        <li key={index} className="flex items-start gap-3 text-slate-600 bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                                            <CheckCircle size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Examples */}
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-orange-200">3</span>
                                    {t('topic.sections.examples')}
                                </h2>
                                <div className="space-y-6 ps-13">
                                    {topic.examples.map((example, index) => (
                                        <div key={index} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-2xl font-bold font-mono text-slate-800 bg-white px-4 py-2 rounded-lg shadow-sm">{example.problem}</span>
                                                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2 rounded-full font-bold shadow-md shadow-emerald-200">
                                                    {example.solution}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 bg-white p-4 rounded-xl border border-orange-100">
                                                <strong className="text-slate-800">{t('topic.explanation')}</strong> {example.explanation}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Common mistakes */}
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-amber-200">4</span>
                                    {t('topic.sections.commonMistakes')}
                                </h2>
                                <ul className="space-y-3 ps-13">
                                    {topic.commonMistakes.map((mistake, index) => (
                                        <li key={index} className="flex items-start gap-3 text-slate-600 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
                                            <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                            <span>{mistake}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Parent tips */}
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-emerald-200">5</span>
                                    {t('topic.sections.parentTips')}
                                </h2>
                                <ul className="space-y-3 ps-13">
                                    {topic.parentTips.map((tip, index) => (
                                        <li key={index} className="flex items-start gap-3 text-slate-600 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                                            <Lightbulb size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* CTA */}
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-8 rounded-2xl shadow-xl shadow-emerald-200">
                                <h3 className="text-2xl font-black mb-3">{t('topic.readyToPractice')}</h3>
                                <p className="text-emerald-100 mb-6 text-lg">
                                    {t('topic.readyToPracticeDesc', { title: topic.title })}
                                </p>
                                <Link
                                    href={topic.relatedGeneratorHref}
                                    className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <span>{topic.relatedGeneratorTitle}</span>
                                    <ExternalLink size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* Ad Slot */}
                        <div className="mt-8">
                            <AdSlot slotId="help-topic-bottom" format="horizontal" />
                        </div>
                    </div>
                </section>

                {/* Other topics */}
                <section className="py-16 bg-white">
                    <div className="container-custom max-w-4xl">
                        <h2 className="text-2xl font-black text-slate-800 mb-8 text-center">{t('topic.otherTopics')}</h2>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {allTopics.filter(tp => tp.slug !== topic.slug).slice(0, 6).map((otherTopic) => (
                                <Link
                                    key={otherTopic.slug}
                                    href={`/help/${otherTopic.slug}`}
                                    className="bg-[#fffbf5] p-5 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                            <BookOpen size={18} className="text-emerald-600" />
                                        </div>
                                        <span className="font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                                            {otherTopic.title}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <Link
                                href="/help"
                                className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
                            >
                                <span>{t('topic.allTopics')}</span>
                                <ArrowLeft size={18} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
