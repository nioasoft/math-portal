'use client';

import Link from 'next/link';
import { Calculator, Menu, X, ChevronDown, GraduationCap, BookOpen, Newspaper, Gamepad2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isGradesOpen, setIsGradesOpen] = useState(false);
    const gradesRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (gradesRef.current && !gradesRef.current.contains(event.target as Node)) {
                setIsGradesOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const grades = [
        { label: "כיתה א'", href: '/grade/1' },
        { label: "כיתה ב'", href: '/grade/2' },
        { label: "כיתה ג'", href: '/grade/3' },
        { label: "כיתה ד'", href: '/grade/4' },
        { label: "כיתה ה'", href: '/grade/5' },
        { label: "כיתה ו'", href: '/grade/6' },
    ];

    return (
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm">
            <div className="container-custom h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 z-50 relative" onClick={() => setIsMenuOpen(false)}>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-xl text-white shadow-md shadow-orange-200">
                        <Calculator size={22} />
                    </div>
                    <span className="text-lg font-black text-slate-800 hidden sm:block">
                        דפי עבודה חכמים
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    <Link
                        href="/"
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    >
                        ראשי
                    </Link>

                    {/* Grades Dropdown */}
                    <div className="relative" ref={gradesRef}>
                        <button
                            onClick={() => setIsGradesOpen(!isGradesOpen)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isGradesOpen ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'}`}
                        >
                            <GraduationCap size={16} />
                            לפי כיתה
                            <ChevronDown size={14} className={`transition-transform ${isGradesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[140px] transition-all ${isGradesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                            {grades.map((grade) => (
                                <Link
                                    key={grade.href}
                                    href={grade.href}
                                    onClick={() => setIsGradesOpen(false)}
                                    className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                >
                                    {grade.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Link
                        href="/play"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg transition-all shadow-sm"
                    >
                        <Gamepad2 size={16} />
                        משחקים
                    </Link>

                    <Link
                        href="/help"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                        <BookOpen size={16} />
                        הסברים להורים
                    </Link>

                    <Link
                        href="/blog"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                        <Newspaper size={16} />
                        בלוג
                    </Link>

                    <Link
                        href="/about"
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    >
                        אודות
                    </Link>
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="lg:hidden p-2 text-slate-600 z-50 relative hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={toggleMenu}
                    aria-label="תפריט"
                >
                    {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>

                {/* Mobile Nav Overlay */}
                <div className={`fixed inset-0 bg-white/98 backdrop-blur-md z-40 flex flex-col items-center justify-center transition-all duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                    <nav className="flex flex-col items-center gap-6 text-xl font-bold text-slate-800">
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="hover:text-orange-600 transition-colors"
                        >
                            ראשי
                        </Link>

                        {/* Mobile Grades */}
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">לפי כיתה</span>
                            <div className="flex flex-wrap justify-center gap-2">
                                {grades.map((grade) => (
                                    <Link
                                        key={grade.href}
                                        href={grade.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="px-4 py-2 bg-slate-100 rounded-full text-base font-bold text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                    >
                                        {grade.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <Link
                            href="/play"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
                        >
                            <Gamepad2 size={20} />
                            משחקים
                        </Link>

                        <Link
                            href="/help"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
                        >
                            <BookOpen size={20} />
                            הסברים להורים
                        </Link>

                        <Link
                            href="/blog"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 hover:text-sky-600 transition-colors"
                        >
                            <Newspaper size={20} />
                            בלוג
                        </Link>

                        <Link
                            href="/about"
                            onClick={() => setIsMenuOpen(false)}
                            className="hover:text-orange-600 transition-colors"
                        >
                            אודות
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}
