'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations('common.error');

    useEffect(() => {
        console.error('[App Error]', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">
                    {t('title')}
                </h1>
                <p className="text-slate-600 mb-8">
                    {t('description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                        <RefreshCw className="w-5 h-5" />
                        {t('tryAgain')}
                    </button>
                    <Link
                        href="/"
                        className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                        <Home className="w-5 h-5" />
                        {t('goHome')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
