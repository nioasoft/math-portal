'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { MathEngine, MathOperation, MathProblem } from '@/lib/math-engine';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import ContentSection from '@/components/ContentSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { trackGenerateEvent } from '@/lib/analytics';
import { useWorksheetPrint } from '@/lib/useWorksheetPrint';
import { WorksheetDocument } from './WorksheetDocument';
import { useTranslations, useLocale } from 'next-intl';
import { getDivisionSymbol, formatNumber } from '@/lib/math-notation';
import type { Locale } from '@/i18n/config';
import { WorksheetActionBar } from './WorksheetActionBar';

export default function WorksheetClient() {
    const t = useTranslations('worksheet');
    const locale = useLocale() as Locale;
    const metaT = useTranslations('meta');
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // State
    const [problems, setProblems] = useState<MathProblem[]>([]);
    const [operation, setOperation] = useState<MathOperation>('+');
    const [range, setRange] = useState<number>(10);
    const [count] = useState<number>(20); // Problems per page
    const [title, setTitle] = useState<string>(t('generator.defaultWorksheetTitle'));
    const [showAnswers, setShowAnswers] = useState(false);

    const updateUrl = (newOp: MathOperation, newRange: number) => {
        const params = new URLSearchParams(searchParams);
        let opStr = 'add';
        if (newOp === '-') opStr = 'sub';
        if (newOp === '*') opStr = 'mul';
        if (newOp === ':') opStr = 'div';

        params.set('op', opStr);
        params.set('range', newRange.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const getOperationText = (op: MathOperation): string => {
        switch (op) {
            case '+': return t('operations.addition');
            case '-': return t('operations.subtraction');
            case '*': return t('operations.multiplication');
            case ':': return t('operations.division');
            default: return t('operations.addition');
        }
    };

    const updateTitle = (op: MathOperation, r: number) => {
        const opText = getOperationText(op);
        setTitle(t('generator.titleFormat', { operation: opText, range: formatNumber(r, locale) }));
    };

    const handleGenerate = (op: MathOperation, r: number, c: number, trackEvent = false) => {
        const newProblems = MathEngine.generateProblems(c, op, r);
        setProblems(newProblems);
        updateTitle(op, r);
        if (trackEvent) {
            // ponytail: only the manual refresh passes trackEvent=true; auto-load never fires this.
            trackGenerateEvent({
                worksheet_type: 'math',
                operation: op,
                range: r,
                trigger: 'manual',
            });
        }
    };

    // Effect to parse params on load
    useEffect(() => {
        const opParam = searchParams.get('op');
        const rangeParam = searchParams.get('range');

        let initialOp: MathOperation = '+';
        if (opParam === 'sub') initialOp = '-';
        if (opParam === 'mul') initialOp = '*';
        if (opParam === 'div') initialOp = ':';

        const parsedRange = Number(rangeParam);
        const initialRange = [10, 20, 100, 1000, 10000, 100000, 1000000].includes(parsedRange) ? parsedRange : 10;

        setOperation(initialOp);
        setRange(initialRange);

        // Auto generate on load
        handleGenerate(initialOp, initialRange, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, count]);

    const { onPrint, printing, printError } = useWorksheetPrint({
            worksheet_type: 'math',
            operation: operation,
            range: range,
        });

    return (
        <div className="worksheet-workspace min-h-screen bg-slate-100 text-slate-900 pb-20 print:bg-white">

            {/* Configure Toolbar (Hidden on Print) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/worksheet" aria-label={metaT('breadcrumb.worksheets')} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} className="rtl:rotate-180" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800 hidden sm:block">{t('generator.title')}</h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-center">
                        {/* Controls */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={operation}
                                onChange={(e) => {
                                    const newOp = e.target.value as MathOperation;
                                    setOperation(newOp);
                                    updateUrl(newOp, range);
                                }}
                                aria-label={t('controls.selectOperation')}
                            >
                                <option value="+">{t('operations.additionWithSymbol')}</option>
                                <option value="-">{t('operations.subtractionWithSymbol')}</option>
                                <option value="*">{t('operations.multiplicationWithSymbol')}</option>
                                <option value=":">{t('operations.divisionWithSymbol')}</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 ms-2" id="range-label">{t('range.label')}</span>
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={range}
                                onChange={(e) => {
                                    const newRange = parseInt(e.target.value);
                                    setRange(newRange);
                                    updateUrl(operation, newRange);
                                }}
                                aria-labelledby="range-label"
                            >
                                <option value="10">{t('range.upTo', { value: '10' })}</option>
                                <option value="20">{t('range.upTo', { value: '20' })}</option>
                                <option value="100">{t('range.upTo', { value: '100' })}</option>
                                <option value="1000">{t('range.upTo', { value: '1,000' })}</option>
                                <option value="10000">{t('range.upTo', { value: '10,000' })}</option>
                                <option value="100000">{t('range.upTo', { value: '100,000' })}</option>
                                <option value="1000000">{t('range.upTo', { value: '1,000,000' })}</option>
                            </select>
                        </div>

                        <button
                            onClick={() => handleGenerate(operation, range, count, true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                        >
                            <RefreshCw size={16} />
                            <span>{t('controls.refresh')}</span>
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
                        href={operation === '+' ? '/help/addition' : operation === '-' ? '/help/subtraction' : operation === '*' ? '/help/multiplication' : '/help/division'}
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span>{t('controls.helpForParents')}</span>
                    </Link>
                    <button
                        onClick={onPrint} disabled={printing || problems.length === 0}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-sm"
                    >
                        <Printer size={16} />
                        <span>{t('controls.print')}</span>
                    </button>
                </div>
            </div>

            {printError && <p role="alert" className="container-custom py-3 text-red-700 print:hidden">{t('document.printError')}</p>}
            {/* Breadcrumbs */}
            <div className="container-custom py-3 print:hidden">
                <Breadcrumb
                    items={pathname.includes('/worksheet/math')
                        ? [
                            { label: metaT('breadcrumb.home'), href: '/' },
                            { label: metaT('breadcrumb.worksheets'), href: '/worksheet' },
                            { label: metaT('breadcrumb.math') },
                        ]
                        : [
                            { label: metaT('breadcrumb.home'), href: '/' },
                            { label: metaT('breadcrumb.worksheets') },
                        ]
                    }
                />
            </div>

            {/* A4 Paper Preview Wrapper */}
            <WorksheetActionBar count={problems.length} onRefresh={() => handleGenerate(operation, range, count, true)} />
            <WorksheetDocument title={title}
                items={problems} perPage={12} variant="math" includeAnswers={showAnswers}
                renderPage={(pageItems, showAnswers, offset) => (
                    <div className="worksheet-grid">
                        {pageItems.map((prob, index) => {
                            let result = 0;
                            switch (prob.operator) {
                                case '+': result = prob.num1 + prob.num2; break;
                                case '-': result = prob.num1 - prob.num2; break;
                                case '*': result = prob.num1 * prob.num2; break;
                                case ':': result = prob.num1 / prob.num2; break;
                            }

                            return (
                                <div key={prob.id} dir="ltr" className="worksheet-problem">
                                    <span className="worksheet-number">{offset + index + 1}</span>
                                    {prob.operator === ':' || prob.operator === '/' ? (
                                        <div className="text-xl font-mono flex flex-wrap items-center gap-2" dir="ltr">
                                            <span>{formatNumber(prob.num1, locale)} {getDivisionSymbol(locale)} {formatNumber(prob.num2, locale)} =</span>
                                            <span className="inline-block min-w-12 border-b border-slate-600">{showAnswers ? formatNumber(result, locale) : '\u00a0'}</span>
                                        </div>
                                    ) : <div className="inline-grid grid-cols-[auto_1fr] text-3xl font-medium font-mono leading-none me-auto content-end w-fit">
                                        {/* Row 1 */}
                                        <div></div>
                                        <div className="text-right pb-1">{formatNumber(prob.num1, locale)}</div>

                                        {/* Row 2 */}
                                        <div className="text-2xl pt-1 pe-3 border-b-2 border-slate-900 pb-2">{prob.operator === '*' ? '×' : prob.operator}</div>
                                        <div className="text-right border-b-2 border-slate-900 pb-2">{formatNumber(prob.num2, locale)}</div>

                                        {/* Result Row (Answer Key) - always rendered to prevent CLS */}
                                        <div></div>
                                        <div className={`text-right pt-2 text-red-600 font-bold min-h-[1.5em] ${showAnswers ? 'visible' : 'invisible'}`}>
                                            {formatNumber(result, locale)}
                                        </div>
                                    </div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            />

            {/* Helper Text */}
            <div className="text-center mt-8 text-slate-500 text-sm print:hidden">
                {t('print.hint')}
            </div>

            <ContentSection
                title={t('content.title')}
                description={t('content.description')}
                features={t.raw('content.features') as string[]}
                benefits={[
                    {
                        title: t('content.benefits.saveMoney.title'),
                        text: t('content.benefits.saveMoney.text')
                    },
                    {
                        title: t('content.benefits.focusedPractice.title'),
                        text: t('content.benefits.focusedPractice.text')
                    },
                    {
                        title: t('content.benefits.alwaysAvailable.title'),
                        text: t('content.benefits.alwaysAvailable.text')
                    }
                ]}
                tips={t.raw('content.tips') as string[]}
            />
        </div>
    );
}


