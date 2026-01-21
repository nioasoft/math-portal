import { getBlogPost, getBlogSlugs } from '@/lib/content';
import { HELP_TOPICS } from '@/lib/help-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, BookOpen, GraduationCap, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';
import { generateAlternates } from '@/lib/seo';

// Map blog post tags to related help topics
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
        // English tags
        'multiplication': ['multiplication'],
        'division': ['division'],
        'fractions': ['fractions'],
        'percentage': ['percentage'],
        'geometry': ['geometry'],
        'units': ['units'],
        'word-problems': ['word-problems'],
        'series': ['series'],
        'addition': ['addition'],
        'subtraction': ['subtraction'],
    };

    const relatedSlugs = new Set<string>();

    // Match by tags
    tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        const matches = tagMap[tag] || tagMap[tagLower];
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

// Map blog post tags to related generator paths for SEO hints
function getRelatedGeneratorPath(tags: string[]): string | null {
    const tagToGenerator: Record<string, string> = {
        'fractions': '/fractions',
        'שברים': '/fractions',
        'percentage': '/percentage',
        'אחוזים': '/percentage',
        'geometry': '/geometry',
        'גיאומטריה': '/geometry',
        'הנדסה': '/geometry',
        'decimals': '/decimals',
        'עשרוניים': '/decimals',
        'units': '/units',
        'מדידות': '/units',
        'המרות': '/units',
        'series': '/series',
        'סדרות': '/series',
        'ratio': '/ratio',
        'יחס': '/ratio',
        'word-problems': '/word-problems',
        'בעיות מילוליות': '/word-problems',
        'multiplication': '/worksheet/math?op=mul',
        'כפל': '/worksheet/math?op=mul',
        'לוח הכפל': '/worksheet/math?op=mul',
        'division': '/worksheet/math?op=div',
        'חילוק': '/worksheet/math?op=div',
        'addition': '/worksheet/math?op=add',
        'חיבור': '/worksheet/math?op=add',
        'subtraction': '/worksheet/math?op=sub',
        'חיסור': '/worksheet/math?op=sub',
    };

    for (const tag of tags) {
        const tagLower = tag.toLowerCase();
        if (tagToGenerator[tag]) return tagToGenerator[tag];
        if (tagToGenerator[tagLower]) return tagToGenerator[tagLower];
    }
    return null;
}

type Props = {
    params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { locale, slug } = await params;
    const post = await getBlogPost(slug, locale as Locale);
    if (!post) return {};

    const baseUrl = 'https://www.tirgul.net';
    const localePath = locale !== 'he' ? `/${locale}` : '';

    // Find related generator for SEO hint to avoid cannibalization
    // Blog posts target informational/long-tail intent
    // while generators target transactional intent
    const relatedGenerator = getRelatedGeneratorPath(post.tags);

    // Build the metadata object
    const metadata: Metadata = {
        title: locale === 'he'
            ? `${post.title} | בלוג דפי עבודה חכמים`
            : `${post.title} | Smart Worksheets Blog`,
        description: post.excerpt,
        alternates: generateAlternates(`/blog/${slug}`, locale as Locale),
    };

    // Add related generator hint if found
    if (relatedGenerator) {
        metadata.other = {
            'x-related-generator': `${baseUrl}${localePath}${relatedGenerator}`,
        };
    }

    return metadata;
}

export async function generateStaticParams() {
    const slugs = await getBlogSlugs();
    const params = [];

    // Generate params for all locales
    for (const locale of locales) {
        for (const slug of slugs) {
            params.push({ locale, slug });
        }
    }

    return params;
}

export default async function BlogPostPage({ params }: Props) {
    const { locale, slug } = await params;
    setRequestLocale(locale);

    const post = await getBlogPost(slug, locale as Locale);

    if (!post) {
        notFound();
    }

    // Handle date format - support both DD/MM/YYYY and YYYY-MM-DD formats
    let isoDate: string;
    if (post.date.includes('/')) {
        const [day, month, year] = post.date.split('/');
        isoDate = `${year}-${month}-${day}`;
    } else {
        isoDate = post.date;
    }

    // Convert lastModified to ISO format if available
    let isoModifiedDate: string;
    if (post.lastModified) {
        if (post.lastModified.includes('/')) {
            const [modDay, modMonth, modYear] = post.lastModified.split('/');
            isoModifiedDate = `${modYear}-${modMonth}-${modDay}`;
        } else {
            isoModifiedDate = post.lastModified;
        }
    } else {
        isoModifiedDate = isoDate;
    }

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "datePublished": isoDate,
        "dateModified": isoModifiedDate,
        "author": post.author ? {
            "@type": "Person",
            "name": post.author
        } : {
            "@type": "Organization",
            "name": "דפי עבודה חכמים",
            "url": "https://www.tirgul.net"
        },
        "publisher": {
            "@type": "Organization",
            "name": "דפי עבודה חכמים",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.tirgul.net/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://www.tirgul.net/blog/${slug}`
        },
        "keywords": post.tags.join(', '),
        "articleSection": post.categoryLabel,
        "inLanguage": locale
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "ראשי",
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "בלוג",
                "item": "https://www.tirgul.net/blog"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": `https://www.tirgul.net/blog/${slug}`
            }
        ]
    };

    // Note: Content is trusted as it comes from our own JSON files in /content/blog/
    // which are created and maintained by the development team

    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(articleSchema)
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema)
                }}
            />
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
