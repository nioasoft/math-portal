'use client';

// Similar to math worksheet but generates floats
import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';
import { trackPrintEvent } from '@/lib/analytics';
import { useTranslations } from 'next-intl';

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
    const [problems, setProblems] = useState<MathProblem[]>(() => createProblems());
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'decimals' });
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
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span className="hidden sm:inline">{showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}</span>
                        </button>
                    </div>
                    <Link
                        href="/help/decimals"
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

            {/* A4 Paper Preview */}
            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">{t('decimals.worksheetTitle')}</h2>
                        <div className="flex justify-between mt-8 text-lg print:hidden">
                            <div className="text-slate-400 text-sm">tirgul.net</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-y-16 gap-x-12" dir="ltr">
                        {problems.map((prob) => {
                            const result = prob.op === '+' ? prob.num1 + prob.num2 : prob.num1 - prob.num2;
                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid">
                                    <div className="inline-grid grid-cols-[auto_1fr] text-3xl font-medium font-mono leading-none ml-auto content-end w-fit">
                                        {/* Row 1 */}
                                        <div></div>
                                        <div className="text-right pb-1">{prob.num1.toFixed(2)}</div>

                                        {/* Row 2 */}
                                        <div className="text-2xl pt-1 pr-3 border-b-2 border-slate-900 pb-2">{prob.op}</div>
                                        <div className="text-right border-b-2 border-slate-900 pb-2">{prob.num2.toFixed(2)}</div>

                                        {/* Result Row - Answer Key */}
                                        {showAnswers && (
                                            <>
                                                <div></div>
                                                <div className="text-right pt-2 text-red-600 font-bold">{result.toFixed(2)}</div>
                                            </>
                                        )}
                                    </div>
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
