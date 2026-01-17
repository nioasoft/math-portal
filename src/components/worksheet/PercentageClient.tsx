'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';

interface PercentProblem {
    id: string;
    percent: number;
    total: number;
}

function createProblems(): PercentProblem[] {
    const newProblems: PercentProblem[] = [];
    const generated = new Set<string>();
    const easyPercents = [10, 20, 25, 50, 75];
    const maxAttempts = 200;
    let attempts = 0;

    while (newProblems.length < 20 && attempts < maxAttempts) {
        attempts++;
        // Mix of easy percents and multiples of 10
        const isEasy = Math.random() > 0.4;
        const percent = isEasy
            ? easyPercents[Math.floor(Math.random() * easyPercents.length)]
            : (Math.floor(Math.random() * 9) + 1) * 10;

        const total = (Math.floor(Math.random() * 20) + 1) * 10; // Multiples of 10

        const key = `${percent}-${total}`;
        if (!generated.has(key)) {
            generated.add(key);
            newProblems.push({
                id: Math.random().toString(36).substr(2, 9),
                percent,
                total
            });
        }
    }
    return newProblems;
}

export default function PercentageClient() {
    const [problems, setProblems] = useState<PercentProblem[]>(() => createProblems());
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems());
    };

    const onPrint = () => window.print();

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">דפי עבודה - אחוזים</h1>
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
                        href="/help/percentage"
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
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">חישובי אחוזים</h2>
                        <p className="text-slate-500 print:hidden">חשבו את ערך האחוז מהשלם</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-12 gap-x-20" dir="rtl">
                        {problems.map((prob) => {
                            const result = (prob.percent / 100) * prob.total;
                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex flex-col gap-8 border-b border-slate-100 pb-6">
                                    <div className="text-2xl font-bold text-slate-800 font-mono whitespace-nowrap">
                                        {prob.percent}% <span className="text-slate-400 font-sans text-xl mx-2">מתוך</span> {prob.total} =
                                        {showAnswers ? <span className="text-red-600 mr-2">{result}</span> : ''}
                                    </div>
                                    <div className="w-full h-px border-b border-slate-300 border-dashed"></div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white">
                        דפי עבודה חכמים - כל הזכויות שמורות ©
                    </div>
                </div>
            </div>

            <ContentSection
                title="דפי עבודה באחוזים להדפסה - חישוב אחוזים משלם"
                description="המחולל החכם מאפשר לכם ליצור דפי עבודה בנושא אחוזים. תרגול זה חיוני לפיתוח אוריינות פיננסית והבנה מתמטית לקראת המעבר לחטיבת הביניים."
                features={[
                    "חישוב ערך האחוז מתוך השלם (למשל: כמה הם 20% מ-80?)",
                    "שילוב של אחוזים 'נוחים' (10%, 25%, 50%) ואחוזים כלליים",
                    "מקום לביצוע דרך החישוב (כפל שברים או ערך המשולש)",
                    "מתאים במיוחד לכיתות ה' ו-ו' כהמשך ישיר ללימוד השברים"
                ]}
                benefits={[
                    {
                        title: "חיבור למציאות",
                        text: "אחוזים הם אולי הנושא השימושי ביותר ביומיום: הנחות בחנויות, ריבית בבנק וסטטיסטיקה בחדשות. תרגול זה מכין את הילד לחיים."
                    },
                    {
                        title: "הקשר בין שברים לאחוזים",
                        text: "התרגול עוזר לתלמיד לראות את הקשר הישיר: 50% זה חצי, 25% זה רבע. הבנה זו מחזקת את השליטה בשני הנושאים."
                    },
                    {
                        title: "פיתוח חשיבה מהירה",
                        text: "תרגול אחוזים בסיסיים (כמו 10%) מעודד חישוב בעל פה ומפתח אומדן מספרי מהיר."
                    }
                ]}
                tips={[
                    "הסבירו שתמיד קל להתחיל מחישוב 10% (מחלקים ב-10) ואז להכפיל לפי הצורך.",
                    "הראו את הקשר לשבר פשוט: 50% זה כמו לחלק ב-2, 25% זה כמו לחלק ב-4.",
                    "השתמשו בדוגמאות של 'הנחה בחנות' כדי להפוך את השאלה המופשטת למוחשית ומעניינת.",
                    "עודדו בדיקה עצמית: אם ביקשו 200%, התוצאה חייבת להיות גדולה מהמספר המקורי!"
                ]}
            />
        </div>
    );
}
