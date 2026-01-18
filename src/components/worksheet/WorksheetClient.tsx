'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { MathEngine, MathOperation, MathProblem } from '@/lib/math-engine';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';
import { trackPrintEvent, trackGenerateEvent } from '@/lib/analytics';

export default function WorksheetClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // State
    const [problems, setProblems] = useState<MathProblem[]>([]);
    const [operation, setOperation] = useState<MathOperation>('+');
    const [range, setRange] = useState<number>(10);
    const [count] = useState<number>(20); // Problems per page
    const [title, setTitle] = useState<string>("דף עבודה בחשבון");
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

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

    const updateTitle = (op: MathOperation, r: number) => {
        let opText = "חיבור";
        if (op === '-') opText = "חיסור";
        if (op === '*') opText = "כפל";
        if (op === ':') opText = "חילוק";

        setTitle(`${opText} בתחום ה-${r.toLocaleString()}`);
    };

    const handleGenerate = (op: MathOperation, r: number, c: number, trackEvent = false) => {
        const newProblems = MathEngine.generateProblems(c, op, r);
        setProblems(newProblems);
        updateTitle(op, r);
        if (trackEvent) {
            trackGenerateEvent({
                worksheet_type: 'math',
                operation: op,
                range: r,
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

        const initialRange = rangeParam ? parseInt(rangeParam) : 10;

        setOperation(initialOp);
        setRange(initialRange);

        // Auto generate on load
        handleGenerate(initialOp, initialRange, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, count]);

    const onPrint = () => {
        trackPrintEvent({
            worksheet_type: 'math',
            operation: operation,
            range: range,
        });
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20 print:bg-white">

            {/* Configure Toolbar (Hidden on Print) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800 hidden sm:block">מחולל דפי עבודה</h1>
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
                                aria-label="בחר פעולה חשבונית"
                            >
                                <option value="+">חיבור (+)</option>
                                <option value="-">חיסור (-)</option>
                                <option value="*">כפל (×)</option>
                                <option value=":">חילוק (:)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 mr-2" id="range-label">תחום:</span>
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
                                <option value="10">עד 10</option>
                                <option value="20">עד 20</option>
                                <option value="100">עד 100</option>
                                <option value="1000">עד 1,000</option>
                                <option value="10000">עד 10,000</option>
                                <option value="100000">עד 100,000</option>
                                <option value="1000000">עד 1,000,000</option>
                            </select>
                        </div>

                        <button
                            onClick={() => handleGenerate(operation, range, count, true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                        >
                            <RefreshCw size={16} />
                            <span className="hidden sm:inline">רענן</span>
                        </button>

                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm ${showAnswers ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            aria-pressed={showAnswers}
                        >
                            {showAnswers ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            <span className="hidden sm:inline">{showAnswers ? 'הסתר תשובות' : 'הצג תשובות'}</span>
                        </button>
                    </div>

                    <Link
                        href={operation === '+' ? '/help/addition' : operation === '-' ? '/help/subtraction' : operation === '*' ? '/help/multiplication' : '/help/division'}
                        className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition shadow-sm"
                    >
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">הסברים להורים</span>
                    </Link>
                    <button
                        onClick={onPrint}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-sm"
                    >
                        <Printer size={16} />
                        <span>הדפס</span>
                    </button>
                </div>
            </div>

            {/* A4 Paper Preview Wrapper */}
            <div className="w-full overflow-x-auto pb-12 print:pb-0 print:overflow-visible custom-scrollbar">
                <div className="min-w-[210mm] max-w-[210mm] mx-auto mt-8 bg-white shadow-xl min-h-[297mm] p-[20mm] print:p-[10mm] print:shadow-none print:mt-0 print:mx-0 print:w-full print:min-h-0 print:h-auto print:overflow-visible">

                    {/* Worksheet Header */}
                    <div className="text-center border-b-2 border-slate-100 pb-8 mb-12 print:mb-4 print:pb-2 print:border-b">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">{title}</h2>
                        <div className="flex justify-between mt-8 text-lg print:hidden">
                            <div className="text-slate-400 text-sm">tirgul.net</div>
                        </div>
                    </div>

                    {/* Problems Grid */}
                    <div className="grid grid-cols-4 gap-y-16 gap-x-12" dir="ltr">
                        {problems.map((prob) => {
                            let result = 0;
                            switch (prob.operator) {
                                case '+': result = prob.num1 + prob.num2; break;
                                case '-': result = prob.num1 - prob.num2; break;
                                case '*': result = prob.num1 * prob.num2; break;
                                case ':': result = prob.num1 / prob.num2; break;
                            }

                            return (
                                <div key={prob.id} className="break-inside-avoid page-break-inside-avoid">
                                    <div className="inline-grid grid-cols-[auto_1fr] text-3xl font-medium font-mono leading-none ml-auto content-end w-fit">
                                        {/* Row 1 */}
                                        <div></div>
                                        <div className="text-right pb-1">{prob.num1.toLocaleString()}</div>

                                        {/* Row 2 */}
                                        <div className="text-2xl pt-1 pr-3 border-b-2 border-slate-900 pb-2">{prob.operator}</div>
                                        <div className="text-right border-b-2 border-slate-900 pb-2">{prob.num2.toLocaleString()}</div>

                                        {/* Result Row (Answer Key) */}
                                        {showAnswers && (
                                            <>
                                                <div></div>
                                                <div className="text-right pt-2 text-red-600 font-bold">{result.toLocaleString()}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer / Copyright on Paper */}
                    <div className="mt-20 text-center text-slate-300 text-xs print:fixed print:bottom-4 print:left-0 print:right-0 bg-white">
                        דפי עבודה חכמים - כל הזכויות שמורות ©
                    </div>
                </div>
            </div>

            {/* Helper Text */}
            <div className="text-center mt-8 text-slate-500 text-sm print:hidden">
                לחצו על כפתור ההדפסה למעלה או השתמשו ב-CTRL+P
            </div>

            {/* Ad Slot - After Worksheet */}
            <div className="container-custom py-8 print:hidden">
                <AdSlot slotId="worksheet-bottom" format="horizontal" className="mx-auto max-w-3xl" />
            </div>

            <ContentSection
                title="דפי עבודה בחשבון להדפסה - חיבור, חיסור, כפל וחילוק"
                description="המחולל החכם מאפשר לכם ליצור דפי עבודה במתמטיקה מותאמים אישית בקלות ובמהירות. מתאים לתלמידי כיתות א' עד ו' ולתרגול ביתי."
                features={[
                    "תרגול 4 פעולות חשבון: חיבור, חיסור, כפל וחילוק",
                    "התאמה אישית של רמת הקושי וטווח המספרים (עד מיליון!)",
                    "יצירת דפים ללא הגבלה - כל לחיצה יוצרת תרגילים חדשים",
                    "עיצוב נקי וברור המתאים להדפסה חסכונית (A4)",
                    "מתאים למורים, הורים ותלמידים כאחד"
                ]}
                benefits={[
                    {
                        title: "חיסכון בזמן וכסף",
                        text: "במקום לקנות חוברות יקרות שנגמרות מהר, הדפיסו בדיוק את מה שהילד צריך, מתי שהוא צריך."
                    },
                    {
                        title: "תרגול ממוקד ואפקטיבי",
                        text: "הילד מתקשה בכפל? צרו דף שכולו כפל. רוצים לחזק חיבור במיליונים? אין בעיה. המערכת גמישה לצרכים שלכם."
                    },
                    {
                        title: "זמין תמיד",
                        text: "האתר זמין מכל מחשב וטלפון, 24/7. נגמרו דפי העבודה בכיתה? המדפסת בבית מוכנה לפעולה."
                    }
                ]}
                tips={[
                    "התחילו ברמה קלה כדי לבנות ביטחון עצמי, ורק אז העלו את רומת הקושי.",
                    "הקפידו על תרגול קצר ועקבי (10 דקות ביום) במקום שעות ארוכות פעם בשבוע.",
                    "הפכו את הלימוד למשחק - מדדו זמן ונסו לשפר את השיא האישי בפתרון דף תרגילים.",
                    "בדקו יחד את התשובות ועודדו תיקון עצמי של טעויות."
                ]}
            />
        </div>
    );
}


