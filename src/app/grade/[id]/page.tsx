import type { Metadata } from 'next';
import { CURRICULUM } from '@/lib/curriculum';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdSlot } from '@/components/AdSlot';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';

const gradeNames: Record<string, string> = {
  '1': "כיתה א'",
  '2': "כיתה ב'",
  '3': "כיתה ג'",
  '4': "כיתה ד'",
  '5': "כיתה ה'",
  '6': "כיתה ו'",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const grade = CURRICULUM[id];
  if (!grade) return {};

  const topicNames = grade.topics.slice(0, 3).map(t => t.title).join(', ');

  return {
    title: `דפי עבודה ל${gradeNames[id]} - תרגילי חשבון להדפסה`,
    description: `${grade.description} דפי עבודה בחשבון מותאמים ל${gradeNames[id]} - ${grade.topics.length} נושאים לתרגול: ${topicNames} ועוד.`,
    keywords: [`דפי עבודה ${gradeNames[id]}`, `חשבון ${gradeNames[id]}`, 'דפי עבודה להדפסה', 'תרגילי חשבון'],
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
    return Object.keys(CURRICULUM).map((id) => ({
        id: id,
    }));
}

export default async function GradePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const grade = CURRICULUM[id];

    if (!grade) {
        notFound();
    }

    const colors = gradeColors[id] || gradeColors['1'];

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "ראשי",
                "item": "https://www.smart-worksheets.co.il"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": grade.title,
                "item": `https://www.smart-worksheets.co.il/grade/${id}`
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
                            <span className="text-slate-800 font-medium">{grade.title}</span>
                        </div>

                        <div className="flex items-start gap-5">
                            <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center shadow-lg ${colors.shadow} flex-shrink-0`}>
                                <GraduationCap size={32} className="text-white" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm mb-3">
                                    <Sparkles size={14} className="text-orange-500" />
                                    <span className="text-xs font-bold text-slate-600">{grade.topics.length} נושאים לתרגול</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">{grade.title}</h1>
                                <p className="text-lg text-slate-600">{grade.description}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Topics Grid */}
                <section className="py-12">
                    <div className="container-custom">
                        <h2 className="text-2xl font-black text-slate-800 mb-8">נושאי לימוד</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {grade.topics.map((topic, index) => (
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
                            {Object.entries(CURRICULUM).filter(([key]) => key !== id).map(([key, gradeData]) => (
                                <Link
                                    key={key}
                                    href={`/grade/${key}`}
                                    className="px-5 py-2.5 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-bold hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all"
                                >
                                    {gradeData.title}
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
