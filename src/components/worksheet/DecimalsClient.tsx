'use client';

// Similar to math worksheet but generates floats
import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useWorksheetProblems } from '@/lib/useWorksheetProblems';
import { useWorksheetPrint } from '@/lib/useWorksheetPrint';
import { WorksheetDocument } from './WorksheetDocument';
import { WorksheetActionBar } from '@/components/worksheet/WorksheetActionBar';
import ContentSection from '@/components/ContentSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useTranslations, useLocale } from 'next-intl';
import { getMathNotation } from '@/lib/math-notation';
import type { Locale } from '@/i18n/config';

interface MathProblem {
    id: string;
    num1: number;
    num2: number;
    op: '+' | '-';
}

function createProblems(): MathProblem[] {
    const newProblems: MathProblem[] = [];
    const generated = new Set<string>();
    const maxAttempts = 150;
    let attempts = 0;

    while (newProblems.length < 15 && attempts < maxAttempts) {
        attempts++;
        let num1 = parseFloat((Math.random() * 100).toFixed(2));
        let num2 = parseFloat((Math.random() * 50).toFixed(2));
        const op: '+' | '-' = Math.random() > 0.5 ? '+' : '-';

        // Fix: Ensure num1 >= num2 for subtraction to avoid negative results
        if (op === '-' && num2 > num1) {
            [num1, num2] = [num2, num1];
        }

        const key = `${num1}-${op}-${num2}`;
        if (!generated.has(key)) {
            generated.add(key);
            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                num1,
                num2,
                op
            });
        }
    }
    return newProblems;
}

export default function DecimalsClient() {
    const t = useTranslations('worksheet');
    const locale = useLocale() as Locale;
    const decimal = (value: number) => value.toFixed(2).replace('.', getMathNotation(locale).decimal);
    const metaT = useTranslations('meta');
    const [problems, setProblems] = useWorksheetProblems(() => createProblems());
    const [showAnswers, setShowAnswers] = useState(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const { onPrint, printing, printError } = useWorksheetPrint({ worksheet_type: 'decimals' });

    return (
        <div className="worksheet-workspace min-h-screen bg-slate-100 text-slate-900 pb-20 print:bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/worksheet" aria-label={metaT('breadcrumb.worksheets')} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} className="rtl:rotate-180" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('decimals.title')}</h1>
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
                        href="/help/decimals"
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
                        { label: metaT('breadcrumb.decimals') },
                    ]}
                />
            </div>

            {/* A4 Paper Preview */}
            <WorksheetActionBar count={problems.length} onRefresh={regenerateProblems} />

            <WorksheetDocument title={t('decimals.worksheetTitle')}
                items={problems} perPage={12} variant="decimals" includeAnswers={showAnswers}
                renderPage={(pageItems, showAnswers, offset) => (
                    <div className="worksheet-grid">
                        {pageItems.map((prob, index) => {
                            const result = prob.op === '+' ? prob.num1 + prob.num2 : prob.num1 - prob.num2;
                            return (
                                <div key={prob.id} dir="ltr" className="worksheet-problem">
                                    <span className="worksheet-number">{offset + index + 1}</span>
                                    <div className="inline-grid grid-cols-[auto_1fr] text-3xl font-medium font-mono leading-none me-auto content-end w-fit">
                                        {/* Row 1 */}
                                        <div></div>
                                        <div className="text-right pb-1">{decimal(prob.num1)}</div>

                                        {/* Row 2 */}
                                        <div className="text-2xl pt-1 pe-3 border-b-2 border-slate-900 pb-2">{prob.op}</div>
                                        <div className="text-right border-b-2 border-slate-900 pb-2">{decimal(prob.num2)}</div>

                                        {/* Result Row - Answer Key - always rendered to prevent CLS */}
                                        <div></div>
                                        <div className={`text-right pt-2 text-red-600 font-bold min-h-[1.5em] ${showAnswers ? 'visible' : 'invisible'}`}>
                                            {decimal(result)}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            />

            <ContentSection
                title={t('decimals.content.title')}
                description={t('decimals.content.description')}
                features={t.raw('decimals.content.features') as string[]}
                benefits={[
                    {
                        title: t('decimals.content.benefits.decimalPoint.title'),
                        text: t('decimals.content.benefits.decimalPoint.text')
                    },
                    {
                        title: t('decimals.content.benefits.realLife.title'),
                        text: t('decimals.content.benefits.realLife.text')
                    },
                    {
                        title: t('decimals.content.benefits.independence.title'),
                        text: t('decimals.content.benefits.independence.text')
                    }
                ]}
                tips={t.raw('decimals.content.tips') as string[]}
            />
        </div>
    );
}
