'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useWorksheetProblems } from '@/lib/useWorksheetProblems';
import { useWorksheetPrint } from '@/lib/useWorksheetPrint';
import { WorksheetDocument } from './WorksheetDocument';
import { WorksheetActionBar } from '@/components/worksheet/WorksheetActionBar';
import ContentSection from '@/components/ContentSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useTranslations } from 'next-intl';

interface SeriesProblem {
    id: string;
    sequence: (number | null)[]; // null represents the missing number
    answer: number;
    rule: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';

function createProblems(difficulty: Difficulty): SeriesProblem[] {
    const newProblems: SeriesProblem[] = [];
    const generated = new Set<string>();
    const maxAttempts = 150;
    let attempts = 0;

    while (newProblems.length < 15 && attempts < maxAttempts) {
        attempts++;
        let start = Math.floor(Math.random() * 20) + 1;
        let diff = Math.floor(Math.random() * 5) + 1;
        const length = 5;
        const sequence: (number | null)[] = [];
        let rule = '';

        // Generate Logic based on difficulty
        if (difficulty === 'easy') {
            // Arithmetic progression: +diff
            rule = `+${diff}`;
            for (let j = 0; j < length; j++) {
                sequence.push(start + (j * diff));
            }
        } else if (difficulty === 'medium') {
            // Arithmetic with larger numbers or substraction
            if (Math.random() > 0.5) {
                start = Math.floor(Math.random() * 50) + 20;
                diff = Math.floor(Math.random() * 10) + 2;
                start = Math.max(start, diff * (length - 1));
                rule = `-${diff}`;
                for (let j = 0; j < length; j++) {
                    sequence.push(start - (j * diff));
                }
            } else {
                start = Math.floor(Math.random() * 50) + 1;
                diff = Math.floor(Math.random() * 10) + 5;
                rule = `+${diff}`;
                for (let j = 0; j < length; j++) {
                    sequence.push(start + (j * diff));
                }
            }
        } else {
            // Hard: Multiplication or Alternating? Let's stick to multiplication x2, x3 for small numbers
            const multiplier = Math.floor(Math.random() * 2) + 2; // 2 or 3
            start = Math.floor(Math.random() * 5) + 1;
            rule = `x${multiplier}`;
            let curr = start;
            for (let j = 0; j < length; j++) {
                sequence.push(curr);
                curr *= multiplier;
            }
        }

        // Hide one number (not the first one usually, to be fair)
        const hideIdx = Math.floor(Math.random() * (length - 1)) + 1;
        const answer = sequence[hideIdx] as number;

        // Create unique key based on the sequence (before hiding)
        const key = sequence.join('-');
        if (!generated.has(key)) {
            generated.add(key);
            sequence[hideIdx] = null;

            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                sequence,
                answer,
                rule
            });
        }
    }
    return newProblems;
}

export default function SeriesClient() {
    const t = useTranslations('worksheet');
    const metaT = useTranslations('meta');
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [problems, setProblems] = useWorksheetProblems(() => createProblems('easy'));
    const [showAnswers, setShowAnswers] = useState(false);

    const regenerateProblems = () => {
        setProblems(createProblems(difficulty));
    };

    const handleDifficultyChange = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        setProblems(createProblems(newDifficulty));
    };

    const { onPrint, printing, printError } = useWorksheetPrint({ worksheet_type: 'series', difficulty });

    return (
        <div className="worksheet-workspace min-h-screen bg-slate-100 text-slate-900 pb-20 print:bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/worksheet" aria-label={metaT('breadcrumb.worksheets')} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} className="rtl:rotate-180" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('series.title')}</h1>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg" role="tablist" aria-label={t('series.difficultyLabel')}>
                        <button onClick={() => handleDifficultyChange('easy')} role="tab" aria-selected={difficulty === 'easy'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'easy' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            {t('series.difficulties.easy')}
                        </button>
                        <button onClick={() => handleDifficultyChange('medium')} role="tab" aria-selected={difficulty === 'medium'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'medium' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            {t('series.difficulties.medium')}
                        </button>
                        <button onClick={() => handleDifficultyChange('hard')} role="tab" aria-selected={difficulty === 'hard'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'hard' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            {t('series.difficulties.hard')}
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold text-sm">
                            <RefreshCw size={16} /> <span>{t('controls.refresh')}</span>
                        </button>
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                            aria-label={showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span>{showAnswers ? t('series.showHide.hide') : t('series.showHide.show')}</span>
                        </button>
                        <Link
                            href="/help/series"
                            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                        >
                            <HelpCircle size={16} />
                            <span>{t('series.help')}</span>
                        </Link>
                        <button onClick={onPrint} disabled={printing || problems.length === 0} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold text-sm">
                            <Printer size={16} /> <span>{t('controls.print')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {printError && <p role="alert" className="container-custom py-3 text-red-700 print:hidden">{t('document.printError')}</p>}
            {/* Breadcrumbs */}
            <div className="container-custom py-3 print:hidden">
                <Breadcrumb
                    items={[
                        { label: metaT('breadcrumb.home'), href: '/' },
                        { label: metaT('breadcrumb.worksheets'), href: '/worksheet' },
                        { label: metaT('breadcrumb.series') },
                    ]}
                />
            </div>

            <WorksheetActionBar count={problems.length} onRefresh={regenerateProblems} />

            <WorksheetDocument title={t('series.worksheetTitle')} instruction={t('series.instruction')}
                items={problems} perPage={8} variant="series" includeAnswers={showAnswers}
                renderPage={(pageItems, showAnswers, offset) => (
                    <div className="worksheet-grid">
                        {pageItems.map((prob, index) => (
                            <div key={prob.id} dir="ltr" className="worksheet-problem border-b border-slate-100 pb-4">
                                    <span className="worksheet-number">{offset + index + 1}</span>
                                <div className="flex items-center justify-between text-2xl font-bold font-mono text-slate-800">
                                    {prob.sequence.map((num, idx) => (
                                        <div key={idx} className="relative w-16 text-center">
                                            {num === null ? (
                                                <div className="flex justify-center">
                                                    {showAnswers ? (
                                                        <span className="text-red-600">{prob.answer}</span>
                                                    ) : (
                                                        <div className="w-12 h-8 border-b-2 border-slate-300 border-dashed"></div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>{num}</span>
                                            )}
                                            {idx < prob.sequence.length - 1 && (
                                                <span className="absolute -right-4 top-0 text-slate-300 pointer-events-none">,</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className={`text-xs text-center mt-2 text-slate-400 min-h-[1.25em] ${showAnswers ? 'visible' : 'invisible'}`}>{t('series.rule')} <bdi>{prob.rule}</bdi></div>
                            </div>
                        ))}
                    </div>
                )}
            />

            <ContentSection
                title={t('series.content.title')}
                description={t('series.content.description')}
                features={t.raw('series.content.features') as string[]}
                benefits={[
                    {
                        title: t('series.content.benefits.patterns.title'),
                        text: t('series.content.benefits.patterns.text')
                    },
                    {
                        title: t('series.content.benefits.flexibility.title'),
                        text: t('series.content.benefits.flexibility.text')
                    },
                    {
                        title: t('series.content.benefits.arithmetic.title'),
                        text: t('series.content.benefits.arithmetic.text')
                    }
                ]}
                tips={t.raw('series.content.tips') as string[]}
            />
        </div>
    );
}
