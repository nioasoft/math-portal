'use client';

import { Star, Flame, Target } from 'lucide-react';

interface ScoreDisplayProps {
    score: number;
    streak: number;
    correctCount?: number;
    wrongCount?: number;
    compact?: boolean;
}

export default function ScoreDisplay({ score, streak, correctCount, wrongCount, compact = false }: ScoreDisplayProps) {
    if (compact) {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-yellow-400">
                    <Star className="w-5 h-5" fill="currentColor" />
                    <span className="font-bold text-lg">{score}</span>
                </div>
                {streak > 0 && (
                    <div className="flex items-center gap-1.5 text-orange-400">
                        <Flame className="w-5 h-5" fill="currentColor" />
                        <span className="font-bold text-lg">{streak}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-4 md:gap-6 py-2 md:py-4" aria-live="polite" aria-atomic="true">
            {/* Score */}
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 md:gap-2 text-yellow-400">
                    <Star className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" />
                    <span className="font-bold text-2xl md:text-3xl">{score}</span>
                </div>
                <span className="text-xs text-slate-400">ניקוד</span>
            </div>

            {/* Streak */}
            <div className="flex flex-col items-center">
                <div className={`flex items-center gap-1.5 md:gap-2 ${streak > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                    <Flame className="w-6 h-6 md:w-8 md:h-8" fill={streak > 0 ? 'currentColor' : 'none'} />
                    <span className="font-bold text-2xl md:text-3xl">{streak}</span>
                </div>
                <span className="text-xs text-slate-400">סטריק</span>
            </div>

            {/* Correct/Wrong counts */}
            {(correctCount !== undefined || wrongCount !== undefined) && (
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 md:gap-2 text-slate-400">
                        <Target className="w-6 h-6 md:w-8 md:h-8" />
                        <span className="font-bold text-2xl md:text-3xl">
                            <span className="text-green-400">{correctCount || 0}</span>
                            <span className="text-slate-600 mx-0.5 md:mx-1">/</span>
                            <span className="text-red-400">{wrongCount || 0}</span>
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">נכון/שגוי</span>
                </div>
            )}
        </div>
    );
}
