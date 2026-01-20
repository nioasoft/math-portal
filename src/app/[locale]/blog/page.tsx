import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BlogIndexClient } from './BlogIndexClient';
import { getBlogPosts, blogCategories } from '@/lib/content';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Newspaper, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Locale } from '@/i18n/config';

type Props = {
    params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.blog.title'),
        description: t('pages.blog.description'),
    };
}

function BlogContentFallback() {
    return (
        <>
            {/* Category Filter Skeleton */}
            <section className="py-8">
                <div className="container-custom">
                    <div className="flex flex-wrap justify-center gap-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-10 w-24 bg-slate-100 rounded-full animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>

            {/* Posts Grid Skeleton */}
            <section className="py-12">
                <div className="container-custom">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="h-48 bg-slate-100 animate-pulse" />
                                <div className="p-6">
                                    <div className="h-4 bg-slate-100 rounded w-1/2 mb-3 animate-pulse" />
                                    <div className="h-6 bg-slate-100 rounded w-3/4 mb-4 animate-pulse" />
                                    <div className="h-4 bg-slate-100 rounded w-full mb-2 animate-pulse" />
                                    <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

export default async function BlogIndexPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    // Fetch blog posts for the current locale
    const posts = await getBlogPosts(locale as Locale);
    const t = await getTranslations('blog');

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-10 right-[10%] w-64 h-64 bg-sky-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-[10%] w-48 h-48 bg-orange-200/20 rounded-full blur-2xl"></div>

                    <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white border border-sky-200 rounded-full px-5 py-2.5 shadow-sm mb-6">
                            <Sparkles size={16} className="text-sky-500" />
                            <span className="text-sm font-bold text-slate-700">{t('badge')}</span>
                        </div>

                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl mb-6 shadow-lg shadow-sky-200">
                            <Newspaper size={40} className="text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6">
                            {t('title')}
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                            {t('subtitle')}
                        </p>
                    </div>
                </section>

                <Suspense fallback={<BlogContentFallback />}>
                    <BlogIndexClient posts={posts} categories={blogCategories} />
                </Suspense>

                {/* CTA Section */}
                <section className="py-16 bg-white">
                    <div className="container-custom text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">{t('ctaTitle')}</h2>
                        <p className="text-slate-500 mb-8 max-w-xl mx-auto">
                            {t('ctaDescription')}
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
                        >
                            <span>{t('ctaButton')}</span>
                            <ArrowLeft size={20} />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
