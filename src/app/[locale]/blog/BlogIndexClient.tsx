'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, Newspaper } from 'lucide-react';
import type { BlogPostJSON, BlogCategory } from '@/lib/content';
import { useTranslations } from 'next-intl';

interface Props {
    posts: BlogPostJSON[];
    categories: { id: BlogCategory; label: string }[];
}

export function BlogIndexClient({ posts, categories }: Props) {
    const t = useTranslations('blog');
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');

    // Derive initial category from URL param
    const initialCategory = useMemo(() => {
        if (categoryParam && categories.some(c => c.id === categoryParam)) {
            return categoryParam as BlogCategory;
        }
        return 'all' as const;
    }, [categoryParam, categories]);

    const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>(initialCategory);

    const filteredPosts = selectedCategory === 'all'
        ? posts
        : posts.filter(post => post.category === selectedCategory);

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
                            {t('allCategories')}
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${selectedCategory === cat.id
                                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200 scale-105'
                                    : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'
                                    }`}
                            >
                                {t(`categories.${cat.id}`)}
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
                                </div>

                                <div className="p-6 flex flex-col flex-1">
                                    <header className="mb-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-xs font-bold border border-sky-100">
                                                {post.categoryLabel}
                                            </span>
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                                                <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
                                            </div>
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
                                            {t('readArticle')}
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
                            <p className="text-slate-500 text-lg mb-4">{t('noArticlesFound')}</p>
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className="text-sky-600 font-bold hover:underline"
                            >
                                {t('backToAll')}
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
