'use client';

import { RefreshCw, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WorksheetActionBarProps {
    /** Number of problems currently rendered. 0 → show the empty-state fallback. */
    count: number;
    /** Regenerate a fresh set of problems. */
    onRefresh: () => void;
}

/**
 * Thin `print:hidden` strip shown just above the A4 sheet on every generator.
 * Tells the user the worksheet is ready (so people below the fold know it
 * generated), and falls back to an empty state + refresh if generation yields
 * nothing. Shared so all generators behave identically.
 */
export function WorksheetActionBar({ count, onRefresh }: WorksheetActionBarProps): React.ReactElement {
    const t = useTranslations('worksheet');

    if (count === 0) {
        return (
            <div className="container-custom mt-4 print:hidden">
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-800 sm:flex-row">
                    <span>{t('empty.message')}</span>
                    <button
                        onClick={onRefresh}
                        title={t('controls.refreshTooltip')}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        {t('controls.refresh')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-custom mt-4 print:hidden">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-800">
                <ArrowDown size={16} aria-hidden="true" />
                <span>{t('ready.hint')}</span>
            </div>
        </div>
    );
}
