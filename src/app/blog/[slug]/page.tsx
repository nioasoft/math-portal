import { blogPosts } from '@/lib/blog-data';
import { HELP_TOPICS } from '@/lib/help-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, BookOpen, GraduationCap, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdSlot } from '@/components/AdSlot';
import { Metadata } from 'next';

// Map blog posts to related help topics by keywords
function getRelatedHelpTopics(tags: string[], content: string) {
    const tagMap: Record<string, string[]> = {
        'לוח הכפל': ['multiplication', 'division'],
        'כפל': ['multiplication'],
        'חילוק': ['division'],
        'שברים': ['fractions'],
        'אחוזים': ['percentage'],
        'הנדסה': ['geometry'],
        'גיאומטריה': ['geometry'],
        'מדידות': ['units'],
        'המרות': ['units'],
        'בעיות מילוליות': ['word-problems'],
        'סדרות': ['series'],
        'חיבור': ['addition'],
        'חיסור': ['subtraction'],
    };

    const relatedSlugs = new Set<string>();

    // Match by tags
    tags.forEach(tag => {
        const matches = tagMap[tag];
        if (matches) matches.forEach(slug => relatedSlugs.add(slug));
    });

    // Match by content keywords
    Object.entries(tagMap).forEach(([keyword, slugs]) => {
        if (content.includes(keyword)) {
            slugs.forEach(slug => relatedSlugs.add(slug));
        }
    });

    return HELP_TOPICS.filter(topic => relatedSlugs.has(topic.slug)).slice(0, 3);
}

type Props = {
    params: Promise<{ slug: string }>
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { slug } = await params
    const post = blogPosts.find((p) => p.slug === slug);
    if (!post) return {};
    return {
        title: `${post.title} | בלוג דפי עבודה חכמים`,
        description: post.excerpt,
    };
}

export async function generateStaticParams() {
    return blogPosts.map((post) => ({
        slug: post.slug,
    }))
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params
    const post = blogPosts.find((p) => p.slug === slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-50 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-10 right-[10%] w-48 h-48 bg-sky-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-[10%] w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"></div>

                    <div className="container-custom max-w-3xl relative z-10">
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-bold mb-6 transition-colors"
                        >
                            <ArrowRight size={18} />
                            <span>חזרה לבלוג</span>
                        </Link>
                    </div>
                </section>

                {/* Article Content */}
                <section className="pb-16">
                    <div className="container-custom max-w-3xl">
                        <article className="bg-white rounded-3xl shadow-sm p-8 md:p-12 border border-slate-100">
                            <header className="mb-8 border-b border-slate-100 pb-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 text-white text-xs font-bold shadow-sm">
                                        {post.categoryLabel}
                                    </span>
                                </div>

                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight mb-6">
                                    {post.title}
                                </h1>

                                <div className="flex items-center gap-6 text-sm text-slate-400">
                                    <span className="flex items-center gap-2"><Calendar size={16} /> {post.date}</span>
                                    <span className="flex items-center gap-2"><Clock size={16} /> {post.readTime} קריאה</span>
                                </div>
                            </header>

                            <div
                                className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-sky-600 prose-strong:text-slate-800"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />

                            {/* Tags */}
                            <div className="mt-10 pt-8 border-t border-slate-100">
                                <div className="flex flex-wrap gap-2">
                                    {post.tags.map(tag => (
                                        <span key={tag} className="text-sm bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Related Help Topics */}
                            {(() => {
                                const relatedTopics = getRelatedHelpTopics(post.tags, post.content);
                                if (relatedTopics.length === 0) return null;
                                return (
                                    <div className="mt-10 pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6">
                                            <GraduationCap size={20} className="text-emerald-600" />
                                            <h3 className="font-bold text-slate-800">הסברים להורים בנושא</h3>
                                        </div>
                                        <div className="grid sm:grid-cols-3 gap-3">
                                            {relatedTopics.map(topic => (
                                                <Link
                                                    key={topic.slug}
                                                    href={`/help/${topic.slug}`}
                                                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-xl p-4 transition-all border border-emerald-100 hover:border-emerald-200 group"
                                                >
                                                    <BookOpen size={18} className="text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                                                    <span className="font-bold text-emerald-800">{topic.title}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </article>

                        {/* Ad Slot - After Article */}
                        <div className="mt-8">
                            <AdSlot slotId="blog-post-bottom" format="horizontal" />
                        </div>

                        {/* CTA */}
                        <div className="mt-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white p-8 rounded-3xl shadow-xl shadow-orange-200/50">
                            <h3 className="text-2xl font-black mb-3">מוכנים לתרגל?</h3>
                            <p className="text-orange-100 mb-6 text-lg">
                                עברו למחוללים שלנו וצרו דפי עבודה מותאמים אישית
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <span>לכל המחוללים</span>
                                <ArrowLeft size={18} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
