'use client';

import { useState } from 'react';
import { WordProblemEngine, Operation, type WordProblemCopy } from '@/lib/word-problem-engine';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useWorksheetProblems } from '@/lib/useWorksheetProblems';
import { useWorksheetPrint } from '@/lib/useWorksheetPrint';
import { WorksheetDocument } from './WorksheetDocument';
import { WorksheetActionBar } from '@/components/worksheet/WorksheetActionBar';
import ContentSection from '@/components/ContentSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useTranslations } from 'next-intl';

interface QuestionState {
    id: string;
    text: string;
    answer: number;
}

function createQuestions(selectedGrade: number, copy: WordProblemCopy): QuestionState[] {
    const newQuestions: QuestionState[] = [];
    const generatedTexts = new Set<string>();
    // Mix of operations suitable for the grade
    // Grade 1: +,-
    // Grade 2: +,-,*
    // Grade 3: +,-,*,:

    const ops: Operation[] = ['+', '-'];
    if (selectedGrade >= 2) ops.push('*');
    if (selectedGrade >= 3) ops.push(':');

    const maxAttempts = 80;
    let attempts = 0;

    while (newQuestions.length < 8 && attempts < maxAttempts) { // 8 questions per page for word problems (they take more space)
        attempts++;
        const op = ops[Math.floor(Math.random() * ops.length)];
        const q = WordProblemEngine.generateProblem(selectedGrade, op, copy);

        if (!generatedTexts.has(q.question)) {
            generatedTexts.add(q.question);
            newQuestions.push({
                id: q.id,
                text: q.question,
                answer: q.answer
            });
        }
    }
    return newQuestions;
}

export default function WordProblemsClient() {
    const t = useTranslations('worksheet');
    const metaT = useTranslations('meta');
    const copy = t.raw('wordProblems.engine') as WordProblemCopy;
    const [grade, setGrade] = useState<number>(1);
    const [questions, setQuestions] = useWorksheetProblems(() => createQuestions(1, copy));
    const [showAnswers, setShowAnswers] = useState(false);

    const regenerateQuestions = () => {
        setQuestions(createQuestions(grade, copy));
    };

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
        setQuestions(createQuestions(newGrade, copy));
    };

    const { onPrint, printing, printError } = useWorksheetPrint({ worksheet_type: 'word-problems' });

    return (
        <div className="worksheet-workspace min-h-screen bg-slate-100 text-slate-900 pb-20 print:bg-white">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/worksheet" aria-label={metaT('breadcrumb.worksheets')} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} className="rtl:rotate-180" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">{t('wordProblems.title')}</h1>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 ms-2" id="grade-label">{t('wordProblems.gradeLabel')}</span>
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={grade}
                                onChange={(e) => handleGradeChange(parseInt(e.target.value))}
                                aria-labelledby="grade-label"
                            >
                                <option value={1}>{t('wordProblems.grades.grade1')}</option>
                                <option value={2}>{t('wordProblems.grades.grade2')}</option>
                                <option value={3}>{t('wordProblems.grades.grade3')}</option>
                            </select>
                        </div>

                        <button
                            onClick={regenerateQuestions}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition"
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
                        href="/help/word-problems"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span>{t('controls.helpForParents')}</span>
                    </Link>
                    <button
                        onClick={onPrint} disabled={printing || questions.length === 0}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"
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
                    items={[
                        { label: metaT('breadcrumb.home'), href: '/' },
                        { label: metaT('breadcrumb.worksheets'), href: '/worksheet' },
                        { label: metaT('breadcrumb.wordProblems') },
                    ]}
                />
            </div>

            {/* A4 Paper Wrapper */}
            <WorksheetActionBar count={questions.length} onRefresh={regenerateQuestions} />

            <WorksheetDocument title={t('wordProblems.worksheetTitle')} instruction={t('wordProblems.instruction')}
                items={questions} perPage={4} variant="word" includeAnswers={showAnswers}
                renderPage={(pageItems, showAnswers, offset) => (
                    <div className="worksheet-grid">
                        {pageItems.map((q, index) => (
                            <div key={q.id} dir="inherit" className="worksheet-problem worksheet-numbered relative">
                                <div className="flex gap-4">
                                    <div className="bg-slate-100 text-slate-600 font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                        {offset + index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-medium leading-relaxed mb-6 ps-8">{q.text}</p>

                                        {/* Answer Area */}
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-400">{t('wordProblems.exercise')}</span>
                                            <div className="border-b-2 border-slate-200 border-dashed w-48 h-8"></div>

                                            <span className="font-bold text-slate-400 ms-8">{t('wordProblems.answer')}</span>
                                            <div className="border-b-2 border-slate-200 border-dashed w-24 h-8 relative flex items-center justify-center">
                                                {showAnswers && (
                                                    <span className="text-red-600 font-bold text-xl absolute -top-1">{q.answer}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            />

            <ContentSection
                title={t('wordProblems.content.title')}
                description={t('wordProblems.content.description')}
                features={t.raw('wordProblems.content.features') as string[]}
                benefits={[
                    {
                        title: t('wordProblems.content.benefits.mathThinking.title'),
                        text: t('wordProblems.content.benefits.mathThinking.text')
                    },
                    {
                        title: t('wordProblems.content.benefits.readingComprehension.title'),
                        text: t('wordProblems.content.benefits.readingComprehension.text')
                    }
                ]}
                tips={t.raw('wordProblems.content.tips') as string[]}
            />
        </div>
    );
}
