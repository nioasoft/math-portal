'use client';

import { Link } from '@/i18n/navigation';
import { Calculator, Menu, X, ChevronDown, GraduationCap, BookOpen, Newspaper, Gamepad2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
    const t = useTranslations('common');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isGradesOpen, setIsGradesOpen] = useState(false);
    const gradesRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

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
        { label: t('grades.grade1'), href: '/grade/1' },
        { label: t('grades.grade2'), href: '/grade/2' },
        { label: t('grades.grade3'), href: '/grade/3' },
        { label: t('grades.grade4'), href: '/grade/4' },
        { label: t('grades.grade5'), href: '/grade/5' },
        { label: t('grades.grade6'), href: '/grade/6' },
    ];

    return (
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm">
            <div className="container-custom h-16 flex items-center justify-between">
                {/* Mobile Menu Button - First for RTL (appears on right) */}
                <button
                    className="lg:hidden p-2 text-slate-600 z-50 relative hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={toggleMenu}
                    aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                    aria-expanded={isMenuOpen}
                >
                    {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    <Link
                        href="/"
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    >
                        {t('nav.home')}
                    </Link>

                    {/* Grades Dropdown */}
                    <div className="relative" ref={gradesRef}>
                        <button
                            onClick={() => setIsGradesOpen(!isGradesOpen)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isGradesOpen ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'}`}
                        >
                            <GraduationCap size={16} />
                            {t('nav.byGrade')}
                            <ChevronDown size={14} className={`transition-transform ${isGradesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`absolute top-full end-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[140px] transition-all ${isGradesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
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
                        {t('nav.games')}
                    </Link>

                    <Link
                        href="/help"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                        <BookOpen size={16} />
                        {t('nav.help')}
                    </Link>

                    <Link
                        href="/blog"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                        <Newspaper size={16} />
                        {t('nav.blog')}
                    </Link>

                    <Link
                        href="/about"
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    >
                        {t('nav.about')}
                    </Link>

                    {/* Language Switcher */}
                    <div className="ms-2 border-s border-slate-200 ps-2">
                        <LanguageSwitcher />
                    </div>
                </nav>

                {/* Logo - Last for RTL (appears on left in desktop, but always visible) */}
                <Link href="/" className="flex items-center gap-2.5 z-50 relative" onClick={() => setIsMenuOpen(false)}>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-xl text-white shadow-md shadow-orange-200">
                        <Calculator size={22} />
                    </div>
                    <span className="text-lg font-black text-slate-800 hidden sm:block">
                        {t('siteName')}
                    </span>
                </Link>

                {/* Mobile Nav - Slide from Right */}
                <div
                    className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    onClick={() => setIsMenuOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                </div>
                <div
                    className={`lg:hidden fixed top-0 start-0 h-screen w-[280px] max-w-[85vw] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}
                >
                    {/* Menu Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <span className="text-lg font-black text-slate-800">{t('nav.menu')}</span>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label={t('nav.closeMenu')}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Menu Content */}
                    <nav className="flex flex-col p-4 overflow-y-auto h-[calc(100%-65px)]">
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-lg font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                        >
                            {t('nav.home')}
                        </Link>

                        {/* Games Link - Prominent - Points to interactive games */}
                        <Link
                            href="/play"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-lg font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors mt-2"
                        >
                            <Gamepad2 size={22} />
                            {t('nav.interactiveGames')}
                        </Link>

                        {/* Grades Section */}
                        <div className="mt-4 mb-2">
                            <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('nav.byGrade')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 px-2">
                            {grades.map((grade) => (
                                <Link
                                    key={grade.href}
                                    href={grade.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-2.5 bg-slate-50 rounded-xl text-center font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                >
                                    {grade.label}
                                </Link>
                            ))}
                        </div>

                        {/* Other Links */}
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <Link
                                href="/help"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-base font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                            >
                                <BookOpen size={20} />
                                {t('nav.help')}
                            </Link>

                            <Link
                                href="/blog"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-base font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors"
                            >
                                <Newspaper size={20} />
                                {t('nav.blog')}
                            </Link>

                            <Link
                                href="/about"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-base font-semibold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                            >
                                {t('nav.about')}
                            </Link>
                        </div>

                        {/* Language Switcher in Mobile Menu */}
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <LanguageSwitcher />
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}
