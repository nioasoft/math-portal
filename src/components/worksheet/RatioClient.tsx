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

interface RatioProblem {
    id: string;
    a: number;
    b: number;
    factor: number;
    missingIndex: number; // 0=a, 1=b, 2=c, 3=d in a:b = c:d
}

function createProblems(): RatioProblem[] {
    const newProblems: RatioProblem[] = [];
    const generated = new Set<string>();
    const maxAttempts = 150;
    let attempts = 0;

    while (newProblems.length < 15 && attempts < maxAttempts) {
        attempts++;
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const factor = Math.floor(Math.random() * 5) + 2;
        const missingIndex = Math.floor(Math.random() * 4);

        const key = `${a}-${b}-${factor}-${missingIndex}`;
        if (!generated.has(key)) {
            generated.add(key);
            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                a,
                b,
                factor,
                missingIndex
            });
        }
    }
    return newProblems;
}

export default function RatioClient() {
    const t = useTranslations('worksheet');
    const metaT = useTranslations('meta');
    const [problems, setProblems] = useWorksheetProblems(() => createProblems());
    const [showAnswers, setShowAnswers] = useState(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const { onPrint, printing, printError } = useWorksheetPrint({ worksheet_type: 'ratio' });

    return (
        <div className="worksheet-workspace min-h-screen bg-slate-100 text-slate-900 pb-20 print:bg-white">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    {/* Header similar to others */}
                    <div className="flex items-center gap-4">
                        <Link href="/worksheet" aria-label={metaT('breadcrumb.worksheets')} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition text-slate-900">
                            <ArrowLeft size={20} className="rtl:rotate-180" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('ratio.title')}</h1>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold">
                            <RefreshCw size={16} aria-hidden="true" /> <span>{t('controls.refresh')}</span>
                        </button>

                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                            aria-label={showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span>{showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}</span>
                        </button>
                    </div>
                    <Link
                        href="/help/ratio"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} aria-hidden="true" />
                        <span>{t('controls.helpForParents')}</span>
                    </Link>
                    <button onClick={onPrint} disabled={printing || problems.length === 0} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold">
                        <Printer size={16} aria-hidden="true" /> <span>{t('controls.print')}</span>
                    </button>
                </div>
            </div>

            {printError && <p role="alert" className="container-custom py-3 text-red-700 print:hidden">{t('document.printError')}</p>}
            {/* Breadcrumbs */}
            <div className="container-custom py-3 print:hidden">
                <Breadcrumb
                    items={[
                        { label: metaT('breadcrumb.home'), href: '/' },
                        { label: metaT('breadcrumb.worksheets'), href: '/worksheet' },
                        { label: metaT('breadcrumb.ratio') },
                    ]}
                />
            </div>

            <WorksheetActionBar count={problems.length} onRefresh={regenerateProblems} />

            <WorksheetDocument title={t('ratio.worksheetTitle')} instruction={t('ratio.instruction')}
                items={problems} perPage={10} variant="ratio" includeAnswers={showAnswers}
                renderPage={(pageItems, showAnswers, offset) => (
                    <div className="worksheet-grid">
                        {pageItems.map((prob, index) => {
                            const c = prob.a * prob.factor;
                            const d = prob.b * prob.factor;
                            // numbers array: [a, b, c, d] for a:b = c:d
                            const nums = [prob.a, prob.b, c, d];
                            return (
                                <div key={prob.id} dir="ltr" className="worksheet-problem flex items-center justify-center text-3xl font-bold font-mono">
                                    <span className="worksheet-number">{offset + index + 1}</span>
                                    {/* a : b = c : d */}
                                    <span className={prob.missingIndex === 0 && showAnswers ? 'text-red-600' : ''}>
                                        {prob.missingIndex === 0 ? (showAnswers ? nums[0] : '___') : nums[0]}
                                    </span>
                                    <span className="mx-3">:</span>
                                    <span className={prob.missingIndex === 1 && showAnswers ? 'text-red-600' : ''}>
                                        {prob.missingIndex === 1 ? (showAnswers ? nums[1] : '___') : nums[1]}
                                    </span>

                                    <span className="mx-6 text-slate-400">=</span>

                                    <span className={prob.missingIndex === 2 && showAnswers ? 'text-red-600' : ''}>
                                        {prob.missingIndex === 2 ? (showAnswers ? nums[2] : '___') : nums[2]}
                                    </span>
                                    <span className="mx-3">:</span>
                                    <span className={prob.missingIndex === 3 && showAnswers ? 'text-red-600' : ''}>
                                        {prob.missingIndex === 3 ? (showAnswers ? nums[3] : '___') : nums[3]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            />

            <ContentSection
                title={t('ratio.content.title')}
                description={t('ratio.content.description')}
                features={t.raw('ratio.content.features') as string[]}
                benefits={[
                    {
                        title: t('ratio.content.benefits.logicalThinking.title'),
                        text: t('ratio.content.benefits.logicalThinking.text')
                    },
                    {
                        title: t('ratio.content.benefits.practicalUse.title'),
                        text: t('ratio.content.benefits.practicalUse.text')
                    },
                    {
                        title: t('ratio.content.benefits.algebraPrep.title'),
                        text: t('ratio.content.benefits.algebraPrep.text')
                    }
                ]}
                tips={t.raw('ratio.content.tips') as string[]}
            />
        </div>
    );
}
