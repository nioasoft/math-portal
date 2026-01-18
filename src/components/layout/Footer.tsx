'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, BookOpen, Newspaper, GraduationCap, MessageSquare } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';

export function Footer() {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const grades = [
        { label: "כיתה א'", href: '/grade/1' },
        { label: "כיתה ב'", href: '/grade/2' },
        { label: "כיתה ג'", href: '/grade/3' },
        { label: "כיתה ד'", href: '/grade/4' },
        { label: "כיתה ה'", href: '/grade/5' },
        { label: "כיתה ו'", href: '/grade/6' },
    ];

    const topics = [
        { label: 'חיבור וחיסור', href: '/worksheet/math?op=add' },
        { label: 'כפל וחילוק', href: '/worksheet/math?op=mul' },
        { label: 'שברים', href: '/fractions' },
        { label: 'אחוזים', href: '/percentage' },
        { label: 'הנדסה', href: '/geometry' },
        { label: 'המרת מידות', href: '/units' },
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
                                דפי עבודה חכמים
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-slate-400">
                            מחולל דפי עבודה בחשבון לכיתות א&apos;-ו&apos;.
                            הדפיסו דפי עבודה בחינם וללא הרשמה.
                        </p>
                        <div className="mt-6 space-y-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>מכסה נושאי לימוד לכיתות א&apos;-ו&apos;</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>התאמה אישית של רמת הקושי</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>חינם לחלוטין ללא הרשמה</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <BookOpen size={16} className="text-orange-400" />
                            ניווט מהיר
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link href="/" className="hover:text-orange-400 transition-colors">
                                    דף הבית
                                </Link>
                            </li>
                            <li>
                                <Link href="/help" className="hover:text-emerald-400 transition-colors">
                                    הסברים להורים
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="hover:text-sky-400 transition-colors">
                                    בלוג
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-orange-400 transition-colors">
                                    אודות
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-orange-400 transition-colors">
                                    מדיניות פרטיות
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-orange-400 transition-colors">
                                    צור קשר
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Grades */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <GraduationCap size={16} className="text-orange-400" />
                            לפי כיתה
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
                            נושאים
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
                        <p className="text-sm text-slate-400 leading-relaxed">
                            <strong className="text-slate-300">על האתר:</strong> התרגילים ודפי העבודה באתר נבנו בהשראת נושאי הלימוד בחשבון לבית הספר היסודי, ומיועדים לסייע בתרגול עצמאי להורים, מורים ותלמידים.
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>© 2026 דפי עבודה חכמים. כל הזכויות שמורות.</p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="flex items-center gap-2 text-slate-400 hover:text-orange-400 transition-colors"
                        >
                            <MessageSquare size={16} />
                            שלח משוב
                        </button>
                        <span className="text-slate-700">|</span>
                        <p className="text-slate-600">נבנה עם ❤️ עבור למידה מצוינת</p>
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
