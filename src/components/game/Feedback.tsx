'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface FeedbackProps {
    correct: boolean | null;
    correctAnswer?: number;
    onComplete?: () => void;
}

export default function Feedback({ correct, correctAnswer, onComplete }: FeedbackProps) {
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (correct !== null) {
            setShow(true);
            setAnimating(true);

            const timer = setTimeout(() => {
                setShow(false);
                setAnimating(false);
                onComplete?.();
            }, 1200);

            return () => clearTimeout(timer);
        }
    }, [correct, onComplete]);

    if (!show || correct === null) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" role="status" aria-live="polite">
            <div
                className={`
                    transform transition-all duration-300
                    ${animating ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
                    ${correct ? 'animate-bounce-in' : 'animate-shake'}
                `}
            >
                {correct ? (
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/50">
                            <Check className="w-16 h-16 text-white" strokeWidth={3} />
                        </div>
                        <span className="mt-4 text-3xl font-bold text-green-400">נכון!</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/50">
                            <X className="w-16 h-16 text-white" strokeWidth={3} />
                        </div>
                        <span className="mt-4 text-3xl font-bold text-red-400">לא נכון</span>
                        {correctAnswer !== undefined && (
                            <span className="mt-2 text-xl text-slate-400">
                                התשובה: <span className="text-white font-bold">{correctAnswer}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
