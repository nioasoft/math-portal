'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';
import { trackPrintEvent } from '@/lib/analytics';
import { useTranslations } from 'next-intl';

interface PercentProblem {
    id: string;
    percent: number;
    total: number;
}

function createProblems(): PercentProblem[] {
    const newProblems: PercentProblem[] = [];
    const generated = new Set<string>();
    const easyPercents = [10, 20, 25, 50, 75];
    const maxAttempts = 200;
    let attempts = 0;

    while (newProblems.length < 20 && attempts < maxAttempts) {
        attempts++;
        // Mix of easy percents and multiples of 10
        const isEasy = Math.random() > 0.4;
        const percent = isEasy
            ? easyPercents[Math.floor(Math.random() * easyPercents.length)]
            : (Math.floor(Math.random() * 9) + 1) * 10;

        const total = (Math.floor(Math.random() * 20) + 1) * 10; // Multiples of 10

        const key = `${percent}-${total}`;
        if (!generated.has(key)) {
            generated.add(key);
            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                percent,
                total
            });
        }
    }
    return newProblems;
}

export default function PercentageClient() {
    const t = useTranslations('worksheet');
    const [problems, setProblems] = useState<PercentProblem[]>(() => createProblems());
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'percentage' });
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20 print:bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('percentage.title')}</h1>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold">
                            <RefreshCw size={16} aria-hidden="true" /> <span>{t('controls.refresh')}</span>
                        </button>

                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span className="hidden sm:inline">{showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}</span>
                        </button>
                    </div>
                    <Link
                        href="/help/percentage"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">{t('controls.helpForParents')}</span>
                    </Link>
                    <button onClick={onPrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold">
                        <Printer size={16} aria-hidden="true" /> <span>{t('controls.print')}</span>
                    </button>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">{t('percentage.worksheetTitle')}</h2>
                        <p className="text-slate-500 print:hidden">{t('percentage.instruction')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-12 gap-x-20" dir="rtl">
                        {problems.map((prob) => {
                            const result = (prob.percent / 100) * prob.total;
                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex flex-col gap-8 border-b border-slate-100 pb-6">
                                    <div className="text-2xl font-bold text-slate-800 font-mono whitespace-nowrap">
                                        {prob.percent}% <span className="text-slate-400 font-sans text-xl mx-2">{t('percentage.of')}</span> {prob.total} =
                                        {showAnswers ? <span className="text-red-600 mr-2">{result}</span> : ''}
                                    </div>
                                    <div className="w-full h-px border-b border-slate-300 border-dashed"></div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white print:text-slate-400">
                        {t('print.copyright')}
                    </div>
                </div>
            </div>

            <ContentSection
                title={t('percentage.content.title')}
                description={t('percentage.content.description')}
                features={t.raw('percentage.content.features') as string[]}
                benefits={[
                    {
                        title: t('percentage.content.benefits.realLife.title'),
                        text: t('percentage.content.benefits.realLife.text')
                    },
                    {
                        title: t('percentage.content.benefits.fractionConnection.title'),
                        text: t('percentage.content.benefits.fractionConnection.text')
                    },
                    {
                        title: t('percentage.content.benefits.quickThinking.title'),
                        text: t('percentage.content.benefits.quickThinking.text')
                    }
                ]}
                tips={t.raw('percentage.content.tips') as string[]}
            />
        </div>
    );
}
