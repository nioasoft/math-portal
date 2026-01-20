'use client';

import { useState, useCallback } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, Ruler, Scale, Clock, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import ContentSection from '@/components/ContentSection';
import { trackPrintEvent } from '@/lib/analytics';
import { useTranslations } from 'next-intl';

interface UnitProblem {
    id: string;
    val: number;
    fromKey: string;
    toKey: string;
    answer: number;
}

type UnitType = 'length' | 'weight' | 'time';

function createProblems(unitType: UnitType): UnitProblem[] {
    const newProblems: UnitProblem[] = [];
    const generated = new Set<string>();
    const maxAttempts = 150;
    let attempts = 0;

    while (newProblems.length < 15 && attempts < maxAttempts) {
        attempts++;
        let p: UnitProblem | null = null;

        if (unitType === 'length') {
            const types = ['cm_mm', 'm_cm', 'km_m'];
            const t = types[Math.floor(Math.random() * types.length)];

            if (t === 'cm_mm') {
                const cm = Math.floor(Math.random() * 50) + 1;
                p = { id: '', val: cm, fromKey: 'cm', toKey: 'mm', answer: cm * 10 };
            } else if (t === 'm_cm') {
                const m = Math.floor(Math.random() * 20) + 1;
                p = { id: '', val: m, fromKey: 'm', toKey: 'cm', answer: m * 100 };
            } else {
                const km = Math.floor(Math.random() * 10) + 1;
                p = { id: '', val: km, fromKey: 'km', toKey: 'm', answer: km * 1000 };
            }
        } else if (unitType === 'weight') {
            const t = Math.random() > 0.5 ? 'kg_g' : 'ton_kg';
            if (t === 'kg_g') {
                const kg = Math.floor(Math.random() * 20) + 1;
                p = { id: '', val: kg, fromKey: 'kg', toKey: 'g', answer: kg * 1000 };
            } else {
                const ton = Math.floor(Math.random() * 10) + 1;
                p = { id: '', val: ton, fromKey: 'ton', toKey: 'kg', answer: ton * 1000 };
            }
        } else {
            const types = ['min_sec', 'hour_min', 'day_hour'];
            const t = types[Math.floor(Math.random() * types.length)];

            if (t === 'min_sec') {
                const min = Math.floor(Math.random() * 10) + 1;
                p = { id: '', val: min, fromKey: 'minutes', toKey: 'seconds', answer: min * 60 };
            } else if (t === 'hour_min') {
                const hr = Math.floor(Math.random() * 10) + 1;
                p = { id: '', val: hr, fromKey: 'hours', toKey: 'minutes', answer: hr * 60 };
            } else {
                const day = Math.floor(Math.random() * 5) + 1;
                p = { id: '', val: day, fromKey: 'days', toKey: 'hours', answer: day * 24 };
            }
        }

        if (p) {
            const key = `${p.val}-${p.fromKey}-${p.toKey}`;
            if (!generated.has(key)) {
                generated.add(key);
                p.id = Math.random().toString(36).substr(2, 9);
                newProblems.push(p);
            }
        }
    }
    return newProblems;
}

export default function UnitsClient() {
    const t = useTranslations('worksheet');
    const [unitType, setUnitType] = useState<UnitType>('length');
    const [problems, setProblems] = useState<UnitProblem[]>(() => createProblems('length'));
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems(unitType));
    };

    const handleUnitTypeChange = (newUnitType: UnitType) => {
        setUnitType(newUnitType);
        setProblems(createProblems(newUnitType));
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'units' });
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
                        <h1 className="text-xl font-bold text-slate-800">{t('units.title')}</h1>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg" role="tablist" aria-label={t('units.tabLabel')}>
                        <button onClick={() => handleUnitTypeChange('length')} role="tab" aria-selected={unitType === 'length'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${unitType === 'length' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            <Ruler size={16} aria-hidden="true" /> {t('units.types.length')}
                        </button>
                        <button onClick={() => handleUnitTypeChange('weight')} role="tab" aria-selected={unitType === 'weight'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${unitType === 'weight' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            <Scale size={16} aria-hidden="true" /> {t('units.types.weight')}
                        </button>
                        <button onClick={() => handleUnitTypeChange('time')} role="tab" aria-selected={unitType === 'time'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${unitType === 'time' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            <Clock size={16} aria-hidden="true" /> {t('units.types.time')}
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold text-sm">
                            <RefreshCw size={16} /> <span className="hidden sm:inline">{t('controls.refresh')}</span>
                        </button>
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                            aria-label={showAnswers ? t('controls.hideAnswers') : t('controls.showAnswers')}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span className="hidden sm:inline">{showAnswers ? t('units.showHide.hide') : t('units.showHide.show')}</span>
                        </button>
                        <Link
                            href="/help/units"
                            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                        >
                            <HelpCircle size={16} />
                            <span className="hidden sm:inline">{t('units.help')}</span>
                        </Link>
                        <button onClick={onPrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold text-sm">
                            <Printer size={16} /> <span>{t('controls.print')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">
                            {t(`units.worksheetTitles.${unitType}`)}
                        </h2>
                        <p className="text-slate-500 print:hidden">{t('units.instruction')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-12 gap-x-20" dir="rtl">
                        {problems.map((prob) => (
                            <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex items-center justify-between border-b border-slate-100 pb-4 text-2xl font-bold text-slate-800">

                                <div className="flex items-center gap-2 min-w-[120px]">
                                    <span className="font-mono">{prob.val}</span>
                                    <span className="text-base font-normal text-slate-600">{t(`units.unitNames.${prob.fromKey}`)}</span>
                                </div>

                                <span className="text-slate-400">=</span>

                                <div className="flex items-center gap-2 min-w-[120px] justify-end relative">
                                    {showAnswers ? (
                                        <span className="font-mono text-red-600">{prob.answer.toLocaleString()}</span>
                                    ) : (
                                        <div className="w-24 h-8 border-b-2 border-slate-300 border-dashed"></div>
                                    )}
                                    <span className="text-base font-normal text-slate-600">{t(`units.unitNames.${prob.toKey}`)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white print:text-slate-400">
                        {t('print.copyright')}
                    </div>
                </div>
            </div>

            <ContentSection
                title={t('units.content.title')}
                description={t('units.content.description')}
                features={t.raw('units.content.features') as string[]}
                benefits={[
                    {
                        title: t('units.content.benefits.magnitude.title'),
                        text: t('units.content.benefits.magnitude.text')
                    },
                    {
                        title: t('units.content.benefits.multiplication.title'),
                        text: t('units.content.benefits.multiplication.text')
                    },
                    {
                        title: t('units.content.benefits.practical.title'),
                        text: t('units.content.benefits.practical.text')
                    }
                ]}
                tips={t.raw('units.content.tips') as string[]}
            />
        </div>
    );
}
