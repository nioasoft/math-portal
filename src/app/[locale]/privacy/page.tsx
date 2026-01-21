import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Shield, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta.pages.privacy' });

    return {
        title: t('title'),
        description: t('description'),
        alternates: generateAlternates('/privacy', locale as Locale),
    };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations('privacy');
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
                "name": metaT('pages.privacy.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/privacy`
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
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 flex-shrink-0">
                                <Shield size={28} className="text-white" />
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
                                <h2>{t('intro.heading')}</h2>
                                <p>{t('intro.text')}</p>

                                <h2>{t('collection.heading')}</h2>
                                <p>{t('collection.intro')}</p>
                                <ul>
                                    <li><strong>{t('collection.technical')}</strong> {t('collection.technicalDesc')}</li>
                                    <li><strong>{t('collection.cookies')}</strong> {t('collection.cookiesDesc')}</li>
                                    <li><strong>{t('collection.analytics')}</strong> {t('collection.analyticsDesc')}</li>
                                </ul>

                                <h2>{t('usage.heading')}</h2>
                                <p>{t('usage.intro')}</p>
                                <ul>
                                    <li>{t('usage.improve')}</li>
                                    <li>{t('usage.analyze')}</li>
                                    <li>{t('usage.ads')}</li>
                                    <li>{t('usage.legal')}</li>
                                </ul>

                                <h2>{t('advertising.heading')}</h2>
                                <p>{t('advertising.para1')}</p>
                                <p>
                                    {t('advertising.para2')}{' '}
                                    <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                                        {t('advertising.googleAdsSettings')}
                                    </a>.
                                </p>

                                <h2>{t('cookiesSection.heading')}</h2>
                                <p>{t('cookiesSection.intro')}</p>
                                <ul>
                                    <li><strong>{t('cookiesSection.essential')}</strong> {t('cookiesSection.essentialDesc')}</li>
                                    <li><strong>{t('cookiesSection.functional')}</strong> {t('cookiesSection.functionalDesc')}</li>
                                    <li><strong>{t('cookiesSection.analytics')}</strong> {t('cookiesSection.analyticsDesc')}</li>
                                    <li><strong>{t('cookiesSection.advertising')}</strong> {t('cookiesSection.advertisingDesc')}</li>
                                </ul>

                                <h3>{t('cookiesSection.consent')}</h3>
                                <p>{t('cookiesSection.consentIntro')}</p>
                                <ul>
                                    <li>{t('cookiesSection.consentAcceptAll')}</li>
                                    <li>{t('cookiesSection.consentNecessary')}</li>
                                    <li>{t('cookiesSection.consentCustom')}</li>
                                </ul>
                                <p>{t('cookiesSection.consentChange')}</p>

                                <h2>{t('sharing.heading')}</h2>
                                <p>{t('sharing.text')}</p>

                                <h2>{t('security.heading')}</h2>
                                <p>{t('security.text')}</p>

                                <h2>{t('userRights.heading')}</h2>
                                <p>{t('userRights.intro')}</p>
                                <ul>
                                    <li>{t('userRights.request')}</li>
                                    <li>{t('userRights.correction')}</li>
                                    <li>{t('userRights.object')}</li>
                                </ul>

                                <h2>{t('changes.heading')}</h2>
                                <p>{t('changes.text')}</p>

                                <h2>{t('contact.heading')}</h2>
                                <p>
                                    {t('contact.text')} <Link href="/contact">{t('contact.contactLink')}</Link>.
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
