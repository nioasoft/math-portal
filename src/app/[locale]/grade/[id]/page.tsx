import type { Metadata } from 'next';
import { GRADE_TOPICS, GRADE_IDS, TOPIC_ICONS, TOPIC_HREFS } from '@/lib/curriculum';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdSlot } from '@/components/AdSlot';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
    const { id, locale } = await params;
    const t = await getTranslations({ locale, namespace: 'curriculum' });

    const gradeData = GRADE_TOPICS[id];
    if (!gradeData) return {};

    const gradeTitle = t(`grades.${id}.title`);
    const gradeDescription = t(`grades.${id}.description`);
    const topicNames = gradeData.slice(0, 3).map(topicId => t(`grades.${id}.topics.${topicId}.title`)).join(', ');

    return {
        title: `דפי עבודה ל${gradeTitle} - תרגילי חשבון להדפסה`,
        description: `${gradeDescription} דפי עבודה בחשבון מותאמים ל${gradeTitle} - ${gradeData.length} נושאים לתרגול: ${topicNames} ועוד.`,
        keywords: [`דפי עבודה ${gradeTitle}`, `חשבון ${gradeTitle}`, 'דפי עבודה להדפסה', 'תרגילי חשבון'],
    };
}

const gradeColors: Record<string, { gradient: string; bg: string; iconBg: string; shadow: string }> = {
    '1': { gradient: 'from-sky-500 to-sky-600', bg: 'bg-sky-50', iconBg: 'bg-sky-100', shadow: 'shadow-sky-200' },
    '2': { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', shadow: 'shadow-emerald-200' },
    '3': { gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', iconBg: 'bg-violet-100', shadow: 'shadow-violet-200' },
    '4': { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100', shadow: 'shadow-amber-200' },
    '5': { gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', iconBg: 'bg-rose-100', shadow: 'shadow-rose-200' },
    '6': { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', shadow: 'shadow-indigo-200' },
};

export function generateStaticParams() {
    return GRADE_IDS.map((id) => ({
        id: id,
    }));
}

export default async function GradePage({ params }: { params: Promise<{ id: string; locale: string }> }) {
    const { id, locale } = await params;
    const t = await getTranslations({ locale, namespace: 'curriculum' });

    const topicIds = GRADE_TOPICS[id];

    if (!topicIds) {
        notFound();
    }

    const gradeTitle = t(`grades.${id}.title`);
    const gradeDescription = t(`grades.${id}.description`);

    // Build topics with translated content
    const topics = topicIds.map(topicId => ({
        id: topicId,
        title: t(`grades.${id}.topics.${topicId}.title`),
        description: t(`grades.${id}.topics.${topicId}.description`),
        icon: TOPIC_ICONS[topicId],
        href: TOPIC_HREFS[topicId],
    }));

    const colors = gradeColors[id] || gradeColors['1'];

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "ראשי",
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": gradeTitle,
                "item": `https://www.tirgul.net/grade/${id}`
            }
        ]
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema)
                }}
            />
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-16 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-b ${colors.bg} to-[#fffbf5]`}></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className={`absolute top-10 right-[10%] w-64 h-64 ${colors.bg} rounded-full blur-3xl opacity-60`}></div>
                    <div className="absolute bottom-0 left-[10%] w-48 h-48 bg-orange-200/20 rounded-full blur-2xl"></div>

                    <div className="container-custom relative z-10">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                            <Link href="/" className="hover:text-orange-600 transition-colors">ראשי</Link>
                            <span>/</span>
                            <span className="text-slate-800 font-medium">{gradeTitle}</span>
                        </div>

                        <div className="flex items-start gap-5">
                            <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center shadow-lg ${colors.shadow} flex-shrink-0`}>
                                <GraduationCap size={32} className="text-white" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm mb-3">
                                    <Sparkles size={14} className="text-orange-500" />
                                    <span className="text-xs font-bold text-slate-600">{topics.length} נושאים לתרגול</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">{gradeTitle}</h1>
                                <p className="text-lg text-slate-600">{gradeDescription}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Topics Grid */}
                <section className="py-12">
                    <div className="container-custom">
                        <h2 className="text-2xl font-black text-slate-800 mb-8">נושאי לימוד</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {topics.map((topic, index) => (
                                <Link
                                    key={topic.id}
                                    href={topic.href}
                                    className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-orange-200 hover:shadow-xl transition-all group card-lift"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`${colors.iconBg} p-3 rounded-xl group-hover:bg-gradient-to-br group-hover:${colors.gradient} transition-all`}>
                                            <topic.icon size={24} className={`text-slate-600 group-hover:text-white transition-colors`} />
                                        </div>
                                        <ArrowLeft size={20} className="text-slate-300 group-hover:text-orange-500 transform group-hover:-translate-x-1 transition-all" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-orange-600 transition-colors">{topic.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{topic.description}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Ad Slot */}
                <div className="container-custom py-8">
                    <AdSlot slotId={`grade-${id}-bottom`} format="horizontal" className="mx-auto max-w-3xl" />
                </div>

                {/* Other Grades */}
                <section className="py-12 bg-white">
                    <div className="container-custom">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">כיתות נוספות</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                            {GRADE_IDS.filter((gradeId) => gradeId !== id).map((gradeId) => (
                                <Link
                                    key={gradeId}
                                    href={`/grade/${gradeId}`}
                                    className="px-5 py-2.5 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-bold hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all"
                                >
                                    {t(`grades.${gradeId}.title`)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
