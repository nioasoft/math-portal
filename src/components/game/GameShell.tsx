'use client';

import { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GameShellProps {
    title: string;
    children: ReactNode;
    topBar?: ReactNode;
    onExit?: () => void;
}

export default function GameShell({ title, children, topBar, onExit }: GameShellProps) {
    const t = useTranslations('games');

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
                <div className="container-custom py-2 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onExit ? (
                            <button
                                onClick={onExit}
                                className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                                aria-label={t('shell.backToGames')}
                            >
                                <ArrowRight className="w-5 h-5" aria-hidden="true" />
                            </button>
                        ) : (
                            <Link
                                href="/play"
                                className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                                aria-label={t('shell.backToGames')}
                            >
                                <ArrowRight className="w-5 h-5" aria-hidden="true" />
                            </Link>
                        )}
                        <h1 className="text-lg font-bold">{title}</h1>
                    </div>

                    {topBar}

                    <Link
                        href="/"
                        className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                        aria-label={t('shell.home')}
                    >
                        <Home className="w-5 h-5" aria-hidden="true" />
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {children}
            </main>
        </div>
    );
}
