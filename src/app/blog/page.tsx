'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { blogPosts, blogCategories, BlogCategory } from '@/lib/blog-data';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, Newspaper, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdSlot } from '@/components/AdSlot';

function BlogContent() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');
    const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');

    // Sync with URL param on mount and changes
    useEffect(() => {
        if (categoryParam && blogCategories.some(c => c.id === categoryParam)) {
            setSelectedCategory(categoryParam as BlogCategory);
        } else {
            setSelectedCategory('all');
        }
    }, [categoryParam]);

    const filteredPosts = selectedCategory === 'all'
        ? blogPosts
        : blogPosts.filter(post => post.category === selectedCategory);

    return (
        <>
            {/* Category Filter */}
            <section className="py-8">
                <div className="container-custom">
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${selectedCategory === 'all'
                                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200 scale-105'
                                : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'
                                }`}
                        >
                            הכל
                        </button>
                        {blogCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${selectedCategory === cat.id
                                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200 scale-105'
                                    : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="py-12">
                <div className="container-custom">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map((post, index) => (
                            <article
                                key={post.slug}
                                className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden group flex flex-col h-full card-lift"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Image */}
                                <div className="h-48 bg-slate-100 relative overflow-hidden">
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-sky-600 shadow-sm border border-sky-100">
                                        {post.categoryLabel}
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-1">
                                    <header className="mb-4">
                                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                                            <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800 group-hover:text-sky-600 transition-colors line-clamp-2">
                                            <Link href={`/blog/${post.slug}`}>
                                                {post.title}
                                            </Link>
                                        </h2>
                                    </header>

                                    <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                        {post.excerpt}
                                    </p>

                                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <Link href={`/blog/${post.slug}`} className="text-sky-600 font-bold text-sm flex items-center gap-1 group/btn hover:gap-2 transition-all">
                                            קרא עוד
                                            <ArrowLeft size={16} className="transition-transform" />
                                        </Link>
                                        <div className="flex gap-2">
                                            {post.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {filteredPosts.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Newspaper size={32} className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-lg mb-4">לא נמצאו כתבות בקטגוריה זו.</p>
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className="text-sky-600 font-bold hover:underline"
                            >
                                חזור לכל הכתבות
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
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

export default function BlogIndexPage() {
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
                            <span className="text-sm font-bold text-slate-700">מאמרים וטיפים</span>
                        </div>

                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl mb-6 shadow-lg shadow-sky-200">
                            <Newspaper size={40} className="text-white" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6">
                            הבלוג שלנו
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                            מאמרים, טיפים וכלים להורים ולמורים ללימוד חשבון חוויתי ומוצלח
                        </p>
                    </div>
                </section>

                <Suspense fallback={<BlogContentFallback />}>
                    <BlogContent />
                </Suspense>

                {/* Ad Slot */}
                <div className="container-custom py-8">
                    <AdSlot slotId="blog-index-bottom" format="horizontal" className="mx-auto max-w-3xl" />
                </div>

                {/* CTA Section */}
                <section className="py-16 bg-white">
                    <div className="container-custom text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">רוצים לתרגל?</h2>
                        <p className="text-slate-500 mb-8 max-w-xl mx-auto">
                            אחרי שקראתם את המאמרים, עברו למחוללים שלנו וצרו דפי עבודה מותאמים אישית
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
