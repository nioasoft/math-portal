import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FileText, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta.pages.editorial' });

    const title = t('title');
    const description = t('description');

    return {
        title,
        description,
        alternates: generateAlternates('/editorial-guidelines', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/editorial-guidelines'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function EditorialGuidelinesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'editorial' });
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
                "name": metaT('pages.editorial.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/editorial-guidelines`
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
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    <div className="container-custom max-w-3xl relative z-10">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 font-medium mb-6 transition-colors"
                        >
                            <ArrowRight size={18} />
                            <span>{t('backHome')}</span>
                        </Link>

                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                                <FileText size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">{t('title')}</h1>
                                <p className="text-slate-500">{t('lastUpdated')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="pb-16">
                    <div className="container-custom max-w-3xl">
                        <article className="bg-white rounded-3xl shadow-sm p-8 md:p-12 border border-slate-100">
                            <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-orange-600 prose-strong:text-slate-800">
                                <p className="text-lg text-slate-600 mb-8">{t('subtitle')}</p>

                                <h2>{t('contentCreation.heading')}</h2>
                                <p>{t('contentCreation.intro')}</p>
                                <ul>
                                    <li>{t('contentCreation.item1')}</li>
                                    <li>{t('contentCreation.item2')}</li>
                                    <li>{t('contentCreation.item3')}</li>
                                    <li>{t('contentCreation.item4')}</li>
                                </ul>

                                <h2>{t('sources.heading')}</h2>
                                <p>{t('sources.intro')}</p>
                                <ul>
                                    <li>{t('sources.item1')}</li>
                                    <li>{t('sources.item2')}</li>
                                    <li>{t('sources.item3')}</li>
                                    <li>{t('sources.item4')}</li>
                                </ul>

                                <h2>{t('corrections.heading')}</h2>
                                <p>{t('corrections.intro')}</p>
                                <ul>
                                    <li>{t('corrections.item1')}</li>
                                    <li>{t('corrections.item2')}</li>
                                    <li>{t('corrections.item3')}</li>
                                    <li>{t('corrections.item4')}</li>
                                </ul>

                                <h2>{t('curriculum.heading')}</h2>
                                <p>{t('curriculum.intro')}</p>
                                <ul>
                                    <li>{t('curriculum.item1')}</li>
                                    <li>{t('curriculum.item2')}</li>
                                    <li>{t('curriculum.item3')}</li>
                                    <li>{t('curriculum.item4')}</li>
                                    <li>{t('curriculum.item5')}</li>
                                    <li>{t('curriculum.item6')}</li>
                                </ul>

                                <h2>{t('contact.heading')}</h2>
                                <p>
                                    {t('contact.text')} <Link href="/contact">{t('contact.link')}</Link>
                                </p>
                            </div>
                        </article>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
