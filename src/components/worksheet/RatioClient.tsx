'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { trackPrintEvent } from '@/lib/analytics';

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
    const [problems, setProblems] = useState<RatioProblem[]>(() => createProblems());
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'ratio' });
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    {/* Header similar to others */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition text-slate-900">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">מחולל יחס ופרופורציה</h1>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <button onClick={regenerateProblems} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold">
                            <RefreshCw size={16} /> <span>רענן</span>
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
                        href="/help/ratio"
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">הסברים להורים</span>
                    </Link>
                    <button onClick={onPrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 font-bold">
                        <Printer size={16} /> <span>הדפס</span>
                    </button>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">יחס ופרופורציה</h2>
                        <p className="text-slate-500 print:hidden">השלימו את המספר החסר כדי לקיים את הפרופורציה</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-16 gap-x-20" dir="ltr">
                        {problems.map((prob) => {
                            const c = prob.a * prob.factor;
                            const d = prob.b * prob.factor;
                            // numbers array: [a, b, c, d] for a:b = c:d
                            const nums = [prob.a, prob.b, c, d];
                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex items-center justify-center text-3xl font-bold font-mono">
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

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white">
                        דפי עבודה חכמים - כל הזכויות שמורות ©
                    </div>
                </div>
            </div>

            <ContentSection
                title="דפי עבודה ביחס ופרופורציה להדפסה"
                description="יחס ופרופורציה הם עמודי התווך של החשיבה האלגברית. דפי העבודה שלנו עוזרים לתלמידים לזהות קשרים כפליים בין מספרים ולפתור משוואות פשוטות."
                features={[
                    "השלמת האיבר החסר במשוואת יחס (1:2 = ?:8)",
                    "תרגול כפל וחילוק בהקשר של יחסר",
                    "זיהוי המקדם המקשר בין זוגות היחסים",
                    "הכנה למבחני מיצ\"ב וללימודי מדעים"
                ]}
                benefits={[
                    {
                        title: "חשיבה לוגית",
                        text: "פתרון תרגילי יחס דורש הבנה עמוקה יותר מאשר סתם חישוב טכני - יש למצוא את החוקיות."
                    },
                    {
                        title: "שימושי במטבח ובמפות",
                        text: "הגדלת כמויות במתכון או קריאת קנה מידה במפה - הכל זה יחס ופרופורציה."
                    },
                    {
                        title: "מעבר קל לאלגברה",
                        text: "מציאת הנעלם בפרופורציה היא למעשה פתרון המשוואה הראשונה של הילד (X)."
                    }
                ]}
                tips={[
                    "שאלו: 'פי כמה גדל המספר הראשון? המספר השני חייב לגדול באותו יחס'.",
                    "ציירו את היחסים כדי להמחיש (למשל כדורים אדומים מול כחולים).",
                    "אל תמהרו לפתור, תנו לילד לנסות לגלות את החוקיות בעצמו."
                ]}
            />
        </div>
    );
}
