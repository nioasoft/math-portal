'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';
import { trackPrintEvent } from '@/lib/analytics';

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
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [problems, setProblems] = useState<SeriesProblem[]>(() => createProblems('easy'));
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems(difficulty));
    };

    const handleDifficultyChange = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        setProblems(createProblems(newDifficulty));
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'series', difficulty });
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">סדרות חשבוניות</h1>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg" role="tablist" aria-label="רמת קושי">
                        <button onClick={() => handleDifficultyChange('easy')} role="tab" aria-selected={difficulty === 'easy'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'easy' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            קל
                        </button>
                        <button onClick={() => handleDifficultyChange('medium')} role="tab" aria-selected={difficulty === 'medium'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'medium' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            בינוני
                        </button>
                        <button onClick={() => handleDifficultyChange('hard')} role="tab" aria-selected={difficulty === 'hard'} className={`px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 transition ${difficulty === 'hard' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            קשה
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold text-sm">
                            <RefreshCw size={16} /> <span className="hidden sm:inline">רענן</span>
                        </button>
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                            aria-label={showAnswers ? 'הסתר תשובות' : 'הצג תשובות'}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span className="hidden sm:inline">{showAnswers ? 'הסתר' : 'הצג'}</span>
                        </button>
                        <Link
                            href="/help/series"
                            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                        >
                            <HelpCircle size={16} />
                            <span className="hidden sm:inline">הסברים</span>
                        </Link>
                        <button onClick={onPrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold text-sm">
                            <Printer size={16} /> <span>הדפס</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">
                            השלמת סדרות חשבוניות
                        </h2>
                        <p className="text-slate-500 print:hidden">גלו את החוקיות והשלימו את המספר החסר</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-16 gap-x-20" dir="ltr">
                        {problems.map((prob) => (
                            <div key={prob.id} className="break-inside-avoid page-break-inside-avoid border-b border-slate-100 pb-4">
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
                                {showAnswers && <div className="text-xs text-center mt-2 text-slate-400">חוקיות: {prob.rule}</div>}
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white">
                        דפי עבודה חכמים - כל הזכויות שמורות ©
                    </div>
                </div>
            </div>

            <ContentSection
                title="דפי עבודה בסדרות חשבוניות להדפסה"
                description="סדרות חשבוניות הן הבסיס להבנת דפוסים וחוקיות במתמטיקה. דפי העבודה שלנו מאפשרים לתרגל זיהוי חוקיות והשלמת איברים חסרים ברמות קושי שונות."
                features={[
                    "רמות קושי מגוונות: מחיבור פשוט ועד לכפל",
                    "סדרות עולות ויורדות",
                    "פיתוח חשיבה לוגית ואלגברית",
                    "מתאים כהכנה למבחני איתור מחוננים ומבחני מיצ\"ב"
                ]}
                benefits={[
                    {
                        title: "זיהוי דפוסים",
                        text: "היכולת לזהות תבנית חוזרת היא מיומנות קריטית לא רק במתמטיקה אלא גם בתכנות ובמדעים."
                    },
                    {
                        title: "גמישות מחשבתית",
                        text: "הצורך לגלות את 'החוק' מאחורי המספרים מעודד חשיבה יצירתית ופתרון בעיות."
                    },
                    {
                        title: "חיזוק פעולות החשבון",
                        text: "תרגול סדרות מחייב ביצוע חישובים חוזרים (למשל: +3, +3, +3) ובכך מחזק את השליטה בלוח הכפל והחיבור."
                    }
                ]}
                tips={[
                    "התחילו בבדיקת ההפרש בין שני המספרים הראשונים הסמוכים.",
                    "בדקו אם ההפרש נשמר גם בין הזוגות הבאים. אם לא, נסו כפל או חילוק.",
                    "בסדרות יורדות, החוקיות היא בדרך כלל חיסור או חילוק."
                ]}
            />
        </div>
    );
}
