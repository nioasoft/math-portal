'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, BookOpen, Gamepad2 } from 'lucide-react';

export function NotFoundContent() {
    const t = useTranslations('common.notFound');

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
                <div className="text-8xl font-black text-orange-200 mb-4">404</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">
                    {t('title')}
                </h1>
                <p className="text-slate-600 mb-8">
                    {t('description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                        <Home className="w-5 h-5" />
                        {t('goHome')}
                    </Link>
                    <Link
                        href="/worksheet"
                        className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                        <BookOpen className="w-5 h-5" />
                        {t('worksheets')}
                    </Link>
                    <Link
                        href="/play"
                        className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                        <Gamepad2 className="w-5 h-5" />
                        {t('games')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
