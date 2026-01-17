'use client';

import { useState, useEffect } from 'react';
import { BlogPost, blogPosts } from '@/lib/blog-data';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar } from 'lucide-react';

// Fisher-Yates shuffle
function shuffleArray(array: BlogPost[]): BlogPost[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function FeaturedPosts() {
    // Start with first 3 posts for SSR (deterministic)
    const [posts, setPosts] = useState<BlogPost[]>(() => blogPosts.slice(0, 3));

    // Shuffle on client only after hydration
    useEffect(() => {
        setPosts(shuffleArray(blogPosts).slice(0, 3));
    }, []);

    if (posts.length === 0) return null;

    return (
        <section className="py-20 bg-slate-50">
            <div className="container-custom">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">מגזין ההורים</h2>
                        <p className="text-slate-600">טיפים, מאמרים ושיטות לימוד שיעזרו לילדכם להצליח</p>
                    </div>
                    <Link href="/blog" className="hidden sm:flex items-center gap-1 font-bold text-blue-600 hover:gap-2 transition-all">
                        לכל הכתבות <ArrowLeft size={16} />
                    </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                            <div className="h-48 bg-slate-100 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                                <Image
                                    src={post.image}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm border border-indigo-100">
                                    {post.categoryLabel}
                                </div>
                            </div>

                            <div className="p-6 flex flex-col flex-1">
                                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {post.title}
                                </h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3">
                                    {post.excerpt}
                                </p>
                                <div className="mt-auto flex items-center text-xs text-slate-400 gap-4 pt-4 border-t border-slate-50">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {post.date}</span>
                                    <span className="text-blue-600 font-bold mr-auto">קרא עוד</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 text-center sm:hidden">
                    <Link href="/blog" className="inline-flex items-center gap-2 font-bold text-blue-600">
                        לכל הכתבות <ArrowLeft size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
