'use client';

import { useState } from 'react';
import { Printer, RefreshCw, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import ContentSection from '@/components/ContentSection';
import { AdSlot } from '@/components/AdSlot';
import { trackPrintEvent } from '@/lib/analytics';

type GeomTopic = 'rect' | 'triangle' | 'angle' | 'circle';

interface GeomData {
    width?: number;
    height?: number;
    base?: number;
    sideA?: number;
    sideB?: number;
    sideC?: number;
    degrees?: number;
    radius?: number;
}

interface GeomProblem {
    id: string;
    topic: GeomTopic;
    data: GeomData;
    questionKey: string; // 'area', 'perimeter', 'classify', 'angle'
}

function createProblems(topic: GeomTopic): GeomProblem[] {
    const newProblems: GeomProblem[] = [];
    const generated = new Set<string>();
    const count = 9; // Grid 3x3
    const maxAttempts = count * 10;
    let attempts = 0;

    while (newProblems.length < count && attempts < maxAttempts) {
        attempts++;
        let key = '';
        let problem: GeomProblem | null = null;

        if (topic === 'rect') {
            const w = Math.floor(Math.random() * 8) + 2;
            const h = Math.random() > 0.7 ? w : Math.floor(Math.random() * 8) + 2;
            key = `${w}-${h}`;
            problem = {
                id: Math.random().toString(36).substr(2, 9),
                topic,
                data: { width: w, height: h },
                questionKey: 'area_perimeter'
            };
        } else if (topic === 'triangle') {
            const base = Math.floor(Math.random() * 8) + 4;
            const height = Math.floor(Math.random() * 6) + 3;
            key = `${base}-${height}`;
            problem = {
                id: Math.random().toString(36).substr(2, 9),
                topic,
                data: { base, height, sideA: 5, sideB: 6, sideC: 7 },
                questionKey: 'area'
            };
        } else if (topic === 'angle') {
            let deg = 0;
            const type = Math.random();
            if (type < 0.4) deg = Math.floor(Math.random() * 80) + 5; // Acute
            else if (type < 0.5) deg = 90; // Right
            else if (type < 0.8) deg = Math.floor(Math.random() * 80) + 95; // Obtuse
            else deg = 180; // Straight
            key = `${deg}`;
            problem = {
                id: Math.random().toString(36).substr(2, 9),
                topic,
                data: { degrees: deg },
                questionKey: 'classify'
            };
        } else if (topic === 'circle') {
            const r = Math.floor(Math.random() * 8) + 2;
            key = `${r}`;
            problem = {
                id: Math.random().toString(36).substr(2, 9),
                topic,
                data: { radius: r },
                questionKey: 'area_circumference'
            };
        }

        if (problem && !generated.has(key)) {
            generated.add(key);
            newProblems.push(problem);
        }
    }
    return newProblems;
}

export default function GeometryClient() {
    const [topic, setTopic] = useState<GeomTopic>('rect');
    const [problems, setProblems] = useState<GeomProblem[]>(() => createProblems('rect'));
    const [showAnswers, setShowAnswers] = useState<boolean>(false);

    const regenerateProblems = () => {
        setProblems(createProblems(topic));
    };

    const handleTopicChange = (newTopic: GeomTopic) => {
        setTopic(newTopic);
        setProblems(createProblems(newTopic));
    };

    const onPrint = () => {
        trackPrintEvent({ worksheet_type: 'geometry' });
        window.print();
    };

    const renderShape = (p: GeomProblem) => {
        const { data } = p;

        if (p.topic === 'rect' && data.width && data.height) {
            return (
                <div className="relative border-4 border-slate-800 bg-white"
                    style={{
                        width: `${data.width * 15}px`,
                        height: `${data.height * 15}px`,
                        backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                        backgroundSize: '15px 15px'
                    }}>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-lg font-bold bg-white px-2 whitespace-nowrap">{data.width} ס&quot;מ</span>
                    <span className="absolute -left-16 top-1/2 -translate-y-1/2 text-lg font-bold bg-white px-2 whitespace-nowrap">{data.height} ס&quot;מ</span>
                </div>
            );
        }

        if (p.topic === 'triangle') {
            // Draw a standard triangle using SVG
            return (
                <svg width="150" height="120" viewBox="0 0 150 120" className="overflow-visible">
                    {/* Triangle Path */}
                    <path d="M75 10 L140 110 L10 110 Z" fill="none" stroke="#1e293b" strokeWidth="3" />
                    {/* Height Line (Dashed) */}
                    <path d="M75 10 L75 110" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,3" />
                    {/* Labels */}
                    <text x="75" y="130" textAnchor="middle" className="text-sm font-bold">בסיס: {data.base}</text>
                    <text x="80" y="60" textAnchor="start" className="text-sm font-bold text-slate-500">גובה: {data.height}</text>
                </svg>
            );
        }

        if (p.topic === 'angle' && data.degrees !== undefined) {
            const len = 60;
            // In SVG, Y is down. Start from horizontal right (0 deg)
            // 0 deg line: 75,80 -> 135,80
            // Target line: -degrees (to go up)
            const targetRad = (-data.degrees * Math.PI) / 180;
            const tx = 75 + len * Math.cos(targetRad);
            const ty = 80 + len * Math.sin(targetRad);

            return (
                <svg width="150" height="100" viewBox="0 0 150 100" className="overflow-visible">
                    {/* Base Line */}
                    <line x1="75" y1="80" x2="135" y2="80" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                    {/* Rotated Line */}
                    <line x1="75" y1="80" x2={tx} y2={ty} stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                    {/* Vertex */}
                    <circle cx="75" cy="80" r="4" fill="#1e293b" />
                    {/* Arc for angle */}
                    <path d={`M95 80 A 20 20 0 0 0 ${75 + 20 * Math.cos(targetRad)} ${80 + 20 * Math.sin(targetRad)}`} fill="none" stroke="#94a3b8" strokeWidth="2" />
                    {/* Right Angle marker if 90 */}
                    {data.degrees === 90 && <rect x="75" y="60" width="20" height="20" fill="none" stroke="#94a3b8" />}
                </svg>
            );
        }

        if (p.topic === 'circle' && data.radius !== undefined) {
            return (
                <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="3" />
                    <circle cx="60" cy="60" r="3" fill="#1e293b" />
                    {/* Radius Line */}
                    <line x1="60" y1="60" x2="110" y2="60" stroke="#ef4444" strokeWidth="2" />
                    <text x="85" y="55" textAnchor="middle" className="text-sm font-bold text-red-600">r={data.radius}</text>
                </svg>
            );
        }
    };

    const renderAnswer = (p: GeomProblem) => {
        if (p.topic === 'rect' && p.data.width && p.data.height) {
            return (
                <div className="text-lg space-y-1 w-40">
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>שטח:</span>
                        {showAnswers && <span className="text-red-600 font-bold">{p.data.width * p.data.height}</span>}
                    </div>
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>היקף:</span>
                        {showAnswers && <span className="text-red-600 font-bold">{2 * (p.data.width + p.data.height)}</span>}
                    </div>
                </div>
            )
        }
        if (p.topic === 'triangle' && p.data.base && p.data.height) {
            return (
                <div className="text-lg space-y-1 w-40">
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>שטח:</span>
                        {showAnswers && <span className="text-red-600 font-bold">{(p.data.base * p.data.height) / 2}</span>}
                    </div>
                </div>
            )
        }
        if (p.topic === 'angle' && p.data.degrees !== undefined) {
            let type = "חדה";
            if (p.data.degrees === 90) type = "ישרה";
            else if (p.data.degrees > 90 && p.data.degrees < 180) type = "קהה";
            else if (p.data.degrees === 180) type = "שטוחה";

            return (
                <div className="text-lg space-y-1 w-40">
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>סוג זווית:</span>
                        {showAnswers && <span className="text-red-600 font-bold text-sm">{type}</span>}
                    </div>
                </div>
            )
        }
        if (p.topic === 'circle' && p.data.radius !== undefined) {
            return (
                <div className="text-lg space-y-1 w-40">
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>היקף (P):</span>
                        {showAnswers && <span className="text-red-600 font-bold text-sm">{(2 * Math.PI * p.data.radius).toFixed(2)}</span>}
                    </div>
                    <div className="flex justify-between border-b border-dotted border-slate-300">
                        <span>שטח (S):</span>
                        {showAnswers && <span className="text-red-600 font-bold text-sm">{(Math.PI * p.data.radius * p.data.radius).toFixed(2)}</span>}
                    </div>
                </div>
            )
        }
    };

    const getTitle = () => {
        switch (topic) {
            case 'rect': return 'שטח והיקף של מלבנים';
            case 'triangle': return 'שטח משולש';
            case 'angle': return 'סוגי זוויות';
            case 'circle': return 'מעגל - שטח והיקף';
            default: return 'גיאומטריה';
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800">גיאומטריה</h1>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                            <span className="text-xs text-slate-400 mr-2">נושא:</span>
                            <select
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                                value={topic}
                                onChange={(e) => handleTopicChange(e.target.value as GeomTopic)}
                            >
                                <option value="rect">מלבנים (שטח והיקף)</option>
                                <option value="triangle">משולשים (שטח)</option>
                                <option value="angle">זוויות (זיהוי)</option>
                                <option value="circle">מעגלים (שטח והיקף)</option>
                            </select>
                        </div>

                        <button
                            onClick={regenerateProblems}
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
                        href="/help/geometry"
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
                        <h2 className="text-3xl font-bold text-slate-800 mb-2 print:text-2xl print:mb-0">
                            {getTitle()}
                        </h2>
                    </div>

                    <div className="grid grid-cols-3 gap-y-12 gap-x-8" dir="rtl">
                        {problems.map((prob, idx) => (
                            <div key={prob.id} className="break-inside-avoid page-break-inside-avoid flex flex-col items-center">
                                <div className="w-full flex justify-between px-2 mb-4">
                                    <span className="bg-slate-100 text-slate-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                </div>

                                <div className="h-32 flex items-center justify-center w-full">
                                    {renderShape(prob)}
                                </div>

                                <div className="mt-6 w-full flex justify-center">
                                    {renderAnswer(prob)}
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
                title="הנדסה לכיתות ג'-ו' - תרגול מקיף"
                description="כל נושאי ההנדסה במקום אחד: מלבנים, משולשים, זוויות ומעגלים."
                features={[
                    "מלבנים: חישוב שטחים והיקפים על גבי רשת משבצות",
                    "משולשים: תרגול נוסחת השטח (גובה כפול בסיס חלקי 2)",
                    "זוויות: זיהוי סוגי זוויות (חדה, קהה, ישרה, שטוחה)",
                    "מעגלים: היכרות עם המספר פאי (π) וחישוב שטח והיקף"
                ]}
                benefits={[
                    {
                        title: "ויזואליזציה ברורה",
                        text: "כל צורה מוצגת בצורה גרפית ברורה ומדויקת שעוזרת לתלמיד להבין את הנתונים."
                    },
                    {
                        title: "התאמה לתוכנית הלימודים",
                        text: "הנושאים מכסים את דרישות משרד החינוך בהנדסה ליסודי."
                    }
                ]}
                tips={[
                    "במשולש: שימו לב שתמיד כופלים את הגובה בצלע שאליה הוא יורד (הבסיס).",
                    "בזוויות: היעזרו בפינה של דף כדי לבדוק אם הזווית גדולה או קטנה מ-90 מעלות.",
                    "במעגל: זכרו שהקוטר הוא בדיוק פעמיים הרדיוס."
                ]}
            />
        </div>
    );
}
