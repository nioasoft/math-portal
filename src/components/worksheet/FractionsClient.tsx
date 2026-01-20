'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import ContentSection from '@/components/ContentSection';
import { trackPrintEvent } from '@/lib/analytics';
import { useTranslations } from 'next-intl';

type Difficulty = 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
type Operation = '+' | '-' | '*' | ':';

interface Fraction {
    n: number;
    d: number;
    whole?: number; // For mixed numbers
}

interface FractionProblem {
    id: string;
    f1: Fraction;
    f2: Fraction;
    op: Operation;
    difficulty: Difficulty;
    isSimplify?: boolean; // Special type where f2 is empty/null conceptually and we just simplify f1
}

function generateSingleFractionProblem(difficulty: Difficulty): { f1: Fraction; f2: Fraction; op: Operation; isSimplify: boolean } {
    let f1: Fraction = { n: 1, d: 2, whole: 0 };
    let f2: Fraction = { n: 1, d: 2, whole: 0 };
    let op: Operation = '+';
    let isSimplify = false;

    // Generate fractions based on difficulty
    switch (difficulty) {
        case 'level1': { // Same Denominator (+/-)
            const d1 = Math.floor(Math.random() * 8) + 2;
            f1 = { n: Math.floor(Math.random() * (d1 * 2)) + 1, d: d1, whole: 0 };
            f2 = { n: Math.floor(Math.random() * (d1 * 2)) + 1, d: d1, whole: 0 };
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level2': { // Related Denominators (+/-)
            const base = Math.floor(Math.random() * 5) + 2;
            f1 = { n: Math.floor(Math.random() * 5) + 1, d: base, whole: 0 };
            f2 = { n: Math.floor(Math.random() * 5) + 1, d: base * (Math.floor(Math.random() * 2) + 2), whole: 0 }; // Multiple
            if (Math.random() > 0.5) [f1, f2] = [f2, f1]; // Swap
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level3': { // Mixed Numbers (+/-)
            const dm = Math.floor(Math.random() * 6) + 2;
            f1 = { whole: Math.floor(Math.random() * 3) + 1, n: Math.floor(Math.random() * (dm - 1)) + 1, d: dm };
            f2 = { whole: Math.floor(Math.random() * 3) + 1, n: Math.floor(Math.random() * (dm - 1)) + 1, d: dm };
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level4': { // Mul/Div
            const dMul = Math.floor(Math.random() * 8) + 2;
            f1 = { n: Math.floor(Math.random() * 5) + 1, d: dMul, whole: 0 };
            f2 = { n: Math.floor(Math.random() * 5) + 1, d: Math.floor(Math.random() * 8) + 2, whole: 0 };
            op = Math.random() > 0.5 ? '*' : ':';
            break;
        }

        case 'level5': { // Simplification
            // Generate a "messy" fraction
            isSimplify = true;
            op = '+'; // dummy
            const simpleN = Math.floor(Math.random() * 10) + 1;
            const simpleD = Math.floor(Math.random() * 10) + 2;
            const factor = Math.floor(Math.random() * 5) + 2;
            f1 = { n: simpleN * factor, d: simpleD * factor, whole: 0 };
            f2 = { n: 0, d: 0, whole: 0 }; // Not used
            break;
        }
    }

    // Correction for Subtraction to avoid negative
    if (op === '-' && !isSimplify) {
        const val1 = (f1.whole || 0) + f1.n / f1.d;
        const val2 = (f2.whole || 0) + f2.n / f2.d;
        if (val2 > val1) [f1, f2] = [f2, f1];
    }

    return { f1, f2, op, isSimplify };
}

function createProblems(difficulty: Difficulty, count: number): FractionProblem[] {
    const newProblems: FractionProblem[] = [];
    const generated = new Set<string>();
    const maxAttempts = count * 10;
    let attempts = 0;

    while (newProblems.length < count && attempts < maxAttempts) {
        attempts++;
        const { f1, f2, op, isSimplify } = generateSingleFractionProblem(difficulty);

        // Create unique key
        const key = isSimplify
            ? `${f1.n}/${f1.d}`
            : `${f1.whole || 0}-${f1.n}/${f1.d}-${op}-${f2.whole || 0}-${f2.n}/${f2.d}`;

        if (!generated.has(key)) {
            generated.add(key);
            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                f1, f2, op, difficulty, isSimplify
            });
        }
    }
    return newProblems;
}

export default function FractionsClient() {
    const t = useTranslations('worksheet');
    const [showAnswers, setShowAnswers] = useState<boolean>(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('level1');
    const [count] = useState<number>(12); // Problems per page
    const [problems, setProblems] = useState<FractionProblem[]>(() => createProblems('level1', 12));

    const gcd = (a: number, b: number): number => {
        return b === 0 ? a : gcd(b, a % b);
    };

    const simplify = (n: number, d: number): { n: number, d: number, whole: number } => {
        const common = gcd(n, d);
        let sn = n / common;
        const sd = d / common;
        const whole = Math.floor(sn / sd);
        sn = sn % sd;
        return { n: sn, d: sd, whole };
    };

    const regenerateProblems = () => {
        setProblems(createProblems(difficulty, count));
    };

    const handleDifficultyChange = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        setProblems(createProblems(newDifficulty, count));
    };

    const solveProblem = (p: FractionProblem) => {
        if (p.isSimplify) {
            const res = simplify(p.f1.n, p.f1.d);
            return res;
        }

        // Convert mixed to improper
        const n1 = (p.f1.whole || 0) * p.f1.d + p.f1.n;
        const n2 = (p.f2.whole || 0) * p.f2.d + p.f2.n;
        const d1 = p.f1.d;
        const d2 = p.f2.d;

        let resN = 0, resD = 0;

        switch (p.op) {
            case '+':
                resD = d1 * d2; // Not LCD but works for raw calc
                resN = n1 * d2 + n2 * d1;
                break;
            case '-':
                resD = d1 * d2;
                resN = n1 * d2 - n2 * d1;
                break;
            case '*':
                resN = n1 * n2;
                resD = d1 * d2;
                break;
            case ':':
                resN = n1 * d2;
                resD = d1 * n2;
                break;
        }

        return simplify(resN, resD);
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'fractions', difficulty });
        window.print();
    };

    // Helper to render fraction (Mixed or Simple)
    const FractionDisplay = ({ f }: { f: Fraction }) => (
        <div className="flex items-center gap-1">
            {f.whole && f.whole > 0 ? <span className="text-3xl font-bold -mt-1 text-slate-700">{f.whole}</span> : null}
            <div className="flex flex-col items-center">
                <span className="text-slate-800">{f.n}</span>
                <span className="h-[2px] w-full bg-slate-800 my-1"></span>
                <span className="text-slate-800">{f.d}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20 print:bg-white">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('fractions.generatorTitle')}</h1>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 mr-2" id="difficulty-label">{t('fractions.difficultyLabel')}</span>
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={difficulty}
                                onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                                aria-labelledby="difficulty-label"
                            >
                                <option value="level1">{t('fractions.levels.level1')}</option>
                                <option value="level2">{t('fractions.levels.level2')}</option>
                                <option value="level3">{t('fractions.levels.level3')}</option>
                                <option value="level4">{t('fractions.levels.level4')}</option>
                                <option value="level5">{t('fractions.levels.level5')}</option>
                            </select>
                        </div>

                        <button
                            onClick={regenerateProblems}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <RefreshCw size={16} />
                            <span className="hidden sm:inline">{t('controls.refresh')}</span>
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
                        href="/help/fractions"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">{t('controls.helpForParents')}</span>
                    </Link>
                    <button
                        onClick={onPrint}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"
                    >
                        <Printer size={16} />
                        <span>{t('controls.print')}</span>
                    </button>
                </div>
            </div>

            {/* A4 Paper Wrapper */}
            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">
                            {t(`fractions.worksheetTitles.${difficulty}`)}
                        </h2>
                    </div>

                    <div className="grid grid-cols-3 gap-y-16 gap-x-12" dir="ltr">
                        {problems.map((prob) => {
                            const result = solveProblem(prob);

                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex items-center text-2xl font-bold justify-center">

                                    <FractionDisplay f={prob.f1} />

                                    {!prob.isSimplify ? (
                                        <>
                                            <span className="mx-4 text-3xl pb-2 text-slate-400">{prob.op}</span>
                                            <FractionDisplay f={prob.f2} />
                                            <span className="mx-4 text-slate-400">=</span>
                                        </>
                                    ) : (
                                        <span className="mx-4 text-slate-400">=</span>
                                    )}

                                    {/* Answer space */}
                                    <div className="border-2 border-slate-200 border-dashed w-24 h-24 rounded-lg flex flex-col items-center justify-center relative bg-slate-50">
                                        {showAnswers && (
                                            <div className="absolute inset-0 flex items-center justify-center text-indigo-600 bg-white/95 z-10 px-1 rounded-lg">
                                                <FractionDisplay f={{ n: result.n, d: result.d, whole: result.whole }} />
                                            </div>
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
                title={t('fractions.content.title')}
                description={t('fractions.content.description')}
                features={t.raw('fractions.content.features') as string[]}
                benefits={[
                    {
                        title: t('fractions.content.benefits.deepUnderstanding.title'),
                        text: t('fractions.content.benefits.deepUnderstanding.text')
                    },
                    {
                        title: t('fractions.content.benefits.examPrep.title'),
                        text: t('fractions.content.benefits.examPrep.text')
                    }
                ]}
                tips={t.raw('fractions.content.tips') as string[]}
            />
        </div>
    );
}
