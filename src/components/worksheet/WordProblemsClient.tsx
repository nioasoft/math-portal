'use client';

import { useState } from 'react';
import { WordProblemEngine, Operation } from '@/lib/word-problem-engine';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { trackPrintEvent } from '@/lib/analytics';

interface QuestionState {
    id: string;
    text: string;
    answer: number;
}

function createQuestions(selectedGrade: number): QuestionState[] {
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
        const q = WordProblemEngine.generateProblem(selectedGrade, op);

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
    const [grade, setGrade] = useState<number>(1);
    const [questions, setQuestions] = useState<QuestionState[]>(() => createQuestions(1));
    const [showAnswers, setShowAnswers] = useState(false);

    const regenerateQuestions = () => {
        setQuestions(createQuestions(grade));
    };

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
        setQuestions(createQuestions(newGrade));
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'word-problems' });
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">בעיות מילוליות</h1>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 mr-2">כיתה:</span>
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={grade}
                                onChange={(e) => handleGradeChange(parseInt(e.target.value))}
                            >
                                <option value={1}>כיתה א&apos;</option>
                                <option value={2}>כיתה ב&apos;</option>
                                <option value={3}>כיתה ג&apos;</option>
                            </select>
                        </div>

                        <button
                            onClick={regenerateQuestions}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <RefreshCw size={16} />
                            <span className="hidden sm:inline">רענן</span>
                        </button>

                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
                            <span className="hidden sm:inline">{showAnswers ? 'הסתר תשובות' : 'הצג תשובות'}</span>
                        </button>
                    </div>

                    <Link
                        href="/help/word-problems"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">הסברים להורים</span>
                    </Link>
                    <button
                        onClick={onPrint}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"
                    >
                        <Printer size={16} />
                        <span>הדפס</span>
                    </button>
                </div>
            </div>

            {/* A4 Paper Wrapper */}
            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">

                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">בעיות מילוליות בחשבון</h2>
                        <p className="text-slate-500 print:hidden text-lg">קראו את השאלות בעיון וכתבו את התרגיל והתשובה</p>
                    </div>

                    <div className="space-y-12" dir="rtl">
                        {questions.map((q, index) => (
                            <div key={q.id} className="break-inside-avoid page-break-inside-avoid relative">
                                <div className="flex gap-4">
                                    <div className="bg-slate-100 text-slate-600 font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-medium leading-relaxed mb-6 pl-8">{q.text}</p>

                                        {/* Answer Area */}
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-400">תרגיל:</span>
                                            <div className="border-b-2 border-slate-200 border-dashed w-48 h-8"></div>

                                            <span className="font-bold text-slate-400 mr-8">תשובה:</span>
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

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white">
                        דפי עבודה חכמים - כל הזכויות שמורות ©
                    </div>
                </div>
            </div>

            <ContentSection
                title="בעיות מילוליות בחשבון - לתרגל את החיים האמיתיים"
                description="בעיות מילוליות הן הגשר בין המספרים לבין המציאות. הן עוזרות לילדים להבין למה אנחנו לומדים חשבון ואיך משתמשים בו בחיי היומיום."
                features={[
                    "מגוון שאלות מהחיים: קניות, חלוקת ממתקים, משחקים ועוד",
                    "מותאם מגדרית: שמות של בנים ובנות, ניסוחים תקינים בעברית",
                    "רמות קושי משתנות: מחיבור וחיסור פשוט ועד בעיות דו-שלביות (בקרוב)",
                    "מקום לכתיבת התרגיל והתשובה בצורה מסודרת"
                ]}
                benefits={[
                    {
                        title: "פיתוח חשיבה מתמטית",
                        text: "הילד לומד 'לתרגם' סיפור לשפת המספרים - מיומנות קריטית להצלחה במתמטיקה."
                    },
                    {
                        title: "הבנת הנקרא",
                        text: "פתרון הבעיה דורש קריאה מעמיקה והבנה של הפרטים החשובים מול הטפלים."
                    }
                ]}
                tips={[
                    "בקשו מהילד לסמן את המספרים בסיפור ואת מילת המפתח (כמו 'נתן', 'קיבל', 'חילק').",
                    "ציור עוזר! עודדו את הילד לצייר את הבעיה לפני שהוא כותב את התרגיל.",
                    "שאלו בסוף: 'האם התשובה הגיונית?'. אם יצא שלדני יש מיליון תפוחים, כנראה שיש טעות."
                ]}
            />
        </div>
    );
}
