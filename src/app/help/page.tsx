import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HELP_TOPICS } from '@/lib/help-data';
import Link from 'next/link';
import { BookOpen, ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { AdSlot } from '@/components/AdSlot';

export const metadata = {
    title: 'הסברים להורים - דפי עבודה חכמים',
    description: 'מדריכים מפורטים להורים: איך ללמד חשבון, טיפים, דוגמאות ושיטות לימוד יעילות לכל נושא במתמטיקה.',
};

export default function HelpIndexPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-20 right-[10%] w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-[10%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl"></div>

                    <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full px-5 py-2.5 shadow-sm mb-6">
                            <Sparkles size={16} className="text-emerald-500" />
                            <span className="text-sm font-bold text-slate-700">מדריכים מפורטים להורים</span>
                        </div>

                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl mb-6 shadow-lg shadow-emerald-200">
                            <GraduationCap size={40} className="text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6">
                            הסברים להורים
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                            מדריכים מפורטים שיעזרו לכם ללמד את הילד כל נושא במתמטיקה.
                            <br className="hidden sm:block" />
                            כולל דוגמאות, טעויות נפוצות וטיפים מעשיים.
                        </p>
                    </div>
                </section>

                {/* Topics Grid */}
                <section className="py-16">
                    <div className="container-custom">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {HELP_TOPICS.map((topic, index) => (
                                <Link
                                    key={topic.slug}
                                    href={`/help/${topic.slug}`}
                                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all card-lift"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                                                {topic.title}
                                            </h3>
                                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                                                {topic.shortDescription}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-emerald-600 font-bold text-sm">
                                        <span>קראו עוד</span>
                                        <ArrowLeft size={16} className="mr-2 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Ad Slot */}
                <div className="container-custom py-8">
                    <AdSlot slotId="help-bottom" format="horizontal" className="mx-auto max-w-3xl" />
                </div>

                {/* CTA */}
                <section className="py-16 bg-white">
                    <div className="container-custom text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">מוכנים להתחיל לתרגל?</h2>
                        <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                            אחרי שקראתם את ההסברים, עברו למחוללים שלנו וצרו דפי עבודה מותאמים אישית
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
                        >
                            <span>לכל המחוללים</span>
                            <ArrowLeft size={20} />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
