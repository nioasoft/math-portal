'use client';

import { useEffect, useState, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FeedbackProps {
    correct: boolean | null;
    correctAnswer?: number;
    onComplete?: () => void;
}

export default function Feedback({ correct, correctAnswer, onComplete }: FeedbackProps) {
    const t = useTranslations('games');
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);
    const prevCorrectRef = useRef<boolean | null>(null);

    useEffect(() => {
        const prevCorrect = prevCorrectRef.current;
        prevCorrectRef.current = correct;

        // Only trigger when correct changes from null to a value
        if (prevCorrect === null && correct !== null) {
            // Use requestAnimationFrame to batch state updates
            requestAnimationFrame(() => {
                setShow(true);
                setAnimating(true);
            });

            const timer = setTimeout(() => {
                setShow(false);
                setAnimating(false);
                onComplete?.();
            }, 1200);

            return () => clearTimeout(timer);
        } else if (correct === null && prevCorrect !== null) {
            // Reset when correct goes back to null
            requestAnimationFrame(() => {
                setShow(false);
                setAnimating(false);
            });
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
                        <span className="mt-4 text-3xl font-bold text-green-400">{t('feedback.correct')}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/50">
                            <X className="w-16 h-16 text-white" strokeWidth={3} />
                        </div>
                        <span className="mt-4 text-3xl font-bold text-red-400">{t('feedback.incorrect')}</span>
                        {correctAnswer !== undefined && (
                            <span className="mt-2 text-xl text-slate-400">
                                {t('feedback.theAnswer')} <span className="text-white font-bold">{correctAnswer}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
