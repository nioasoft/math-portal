'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Calculator, BookOpen, Newspaper, GraduationCap, MessageSquare, Quote } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';
import { useTranslations } from 'next-intl';

interface Testimonial {
    quote: string;
    author: string;
    role: string;
}

export function Footer() {
    const t = useTranslations('common');
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    const testimonials: Testimonial[] = [
        {
            quote: t('testimonials.items.0.quote'),
            author: t('testimonials.items.0.author'),
            role: t('testimonials.items.0.role'),
        },
        {
            quote: t('testimonials.items.1.quote'),
            author: t('testimonials.items.1.author'),
            role: t('testimonials.items.1.role'),
        },
        {
            quote: t('testimonials.items.2.quote'),
            author: t('testimonials.items.2.author'),
            role: t('testimonials.items.2.role'),
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    const grades = [
        { label: t('grades.grade1'), href: '/grade/1' },
        { label: t('grades.grade2'), href: '/grade/2' },
        { label: t('grades.grade3'), href: '/grade/3' },
        { label: t('grades.grade4'), href: '/grade/4' },
        { label: t('grades.grade5'), href: '/grade/5' },
        { label: t('grades.grade6'), href: '/grade/6' },
    ];

    const topics = [
        { label: t('footer.addSubtract'), href: '/worksheet/math?op=add' },
        { label: t('footer.mulDiv'), href: '/worksheet/math?op=mul' },
        { label: t('footer.fractions'), href: '/fractions' },
        { label: t('footer.percentage'), href: '/percentage' },
        { label: t('footer.geometry'), href: '/geometry' },
        { label: t('footer.units'), href: '/units' },
    ];

    return (
        <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 mt-auto print:hidden">
            <div className="container-custom">
                {/* Main footer content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-xl text-white">
                                <Calculator size={20} />
                            </div>
                            <span className="text-lg font-black text-white">
                                {t('siteName')}
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-slate-300">
                            {t('footer.description')}
                        </p>
                        <div className="mt-6 space-y-2 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>{t('footer.feature1')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>{t('footer.feature2')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>{t('footer.feature3')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <BookOpen size={16} className="text-orange-400" />
                            {t('footer.quickNav')}
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link href="/" className="hover:text-orange-400 transition-colors">
                                    {t('footer.home')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/help" className="hover:text-emerald-400 transition-colors">
                                    {t('nav.help')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="hover:text-sky-400 transition-colors">
                                    {t('nav.blog')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-orange-400 transition-colors">
                                    {t('nav.about')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-orange-400 transition-colors">
                                    {t('nav.privacy')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-orange-400 transition-colors">
                                    {t('nav.contact')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/editorial-guidelines" className="hover:text-emerald-400 transition-colors">
                                    {t('nav.editorial')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Grades */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <GraduationCap size={16} className="text-orange-400" />
                            {t('footer.byGrade')}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {grades.map((grade) => (
                                <Link
                                    key={grade.href}
                                    href={grade.href}
                                    className="hover:text-orange-400 transition-colors"
                                >
                                    {grade.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Topics */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Newspaper size={16} className="text-orange-400" />
                            {t('footer.topics')}
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {topics.map((topic) => (
                                <li key={topic.href}>
                                    <Link href={topic.href} className="hover:text-orange-400 transition-colors">
                                        {topic.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Trust Signals */}
                <div className="border-t border-slate-800 pt-8 pb-8">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-sm text-slate-300 leading-relaxed">
                            <strong className="text-slate-300">{t('footer.aboutSite')}</strong> {t('footer.aboutDescription')}
                        </p>
                    </div>

                    {/* Testimonials */}
                    <div className="mt-8 max-w-xl mx-auto">
                        <div className="relative bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                            <Quote size={16} className="absolute top-3 start-3 text-orange-500/40" />
                            <div className="text-center">
                                <p className="text-sm text-slate-300 italic mb-3 px-4">
                                    &ldquo;{testimonials[currentTestimonial].quote}&rdquo;
                                </p>
                                <div className="text-xs text-slate-400">
                                    <span className="font-medium text-slate-300">{testimonials[currentTestimonial].author}</span>
                                    <span className="mx-1.5">·</span>
                                    <span>{testimonials[currentTestimonial].role}</span>
                                </div>
                            </div>
                            {/* Dots indicator */}
                            <div className="flex justify-center gap-1.5 mt-4">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentTestimonial(index)}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                            index === currentTestimonial ? 'bg-orange-500' : 'bg-slate-600 hover:bg-slate-500'
                                        }`}
                                        aria-label={`Testimonial ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
                    <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="flex items-center gap-2 text-slate-400 hover:text-orange-400 transition-colors"
                        >
                            <MessageSquare size={16} />
                            {t('footer.sendFeedback')}
                        </button>
                        <span className="text-slate-700">|</span>
                        <p className="text-slate-400">{t('footer.madeWith')}</p>
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />
        </footer>
    );
}
