import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getHelpTopics } from '@/lib/content';
import { Locale } from '@/i18n/config';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { HelpIndexClient } from './HelpIndexClient';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta.pages.help' });

    const title = t('title');
    const description = t('description');

    return {
        title,
        description,
        alternates: generateAlternates('/help', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/help'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function HelpIndexPage({ params }: PageProps) {
    const { locale } = await params;
    const topics = await getHelpTopics(locale as Locale);
    const t = await getTranslations({ locale, namespace: 'help' });
    const metaT = await getTranslations({ locale, namespace: 'meta' });

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": metaT('breadcrumb.home'),
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": metaT('pages.help.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/help`
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
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-20 right-[10%] w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-[10%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl"></div>

                    <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full px-5 py-2.5 shadow-sm mb-6">
                            <Sparkles size={16} className="text-emerald-500" />
                            <span className="text-sm font-bold text-slate-700">{t('hero.badge')}</span>
                        </div>

                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl mb-6 shadow-lg shadow-emerald-200">
                            <GraduationCap size={40} className="text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6">
                            {t('hero.title')}
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                            {t('hero.description')}
                            <br className="hidden sm:block" />
                            {t('hero.descriptionExtra')}
                        </p>
                    </div>
                </section>

                {/* Topics Grid */}
                <section className="py-16">
                    <div className="container-custom">
                        <HelpIndexClient topics={topics} />
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 bg-white">
                    <div className="container-custom text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">{t('cta.title')}</h2>
                        <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                            {t('cta.description')}
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
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
