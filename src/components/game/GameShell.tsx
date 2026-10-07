'use client';

import { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface GameShellProps {
    title: string;
    children: ReactNode;
    topBar?: ReactNode;
    onExit?: () => void;
    breadcrumbItems?: BreadcrumbItem[];
}

export default function GameShell({ title, children, topBar, onExit, breadcrumbItems }: GameShellProps) {
    const t = useTranslations('games');

    return (
        <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
            {/* Breadcrumbs */}
            {breadcrumbItems && (
                <div className="container-custom py-3 bg-slate-800/30 shrink-0">
                    <Breadcrumb items={breadcrumbItems} className="text-slate-400 [&_a]:hover:text-white [&_span:last-child]:text-slate-200" />
                </div>
            )}

            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 shrink-0 z-50">
                <div className="container-custom py-2 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onExit ? (
                            <button
                                onClick={onExit}
                                className="flex h-11 w-11 items-center justify-center bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                                aria-label={t('shell.backToGames')}
                            >
                                <ArrowLeft className="h-6 w-6 rtl:-scale-x-100" aria-hidden="true" />
                            </button>
                        ) : (
                            <Link
                                href="/play"
                                className="flex h-11 w-11 items-center justify-center bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                                aria-label={t('shell.backToGames')}
                            >
                                <ArrowLeft className="h-6 w-6 rtl:-scale-x-100" aria-hidden="true" />
                            </Link>
                        )}
                        <h1 className="text-lg font-bold">{title}</h1>
                    </div>

                    {topBar}

                    <Link
                        href="/"
                        className="flex h-11 w-11 items-center justify-center bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                        aria-label={t('shell.home')}
                    >
                        <Home className="h-6 w-6" aria-hidden="true" />
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
