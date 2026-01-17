'use client';

import { Trophy, Star, Flame, Target, RotateCcw, Home, Award } from 'lucide-react';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';

interface GameSummaryProps {
    score: number;
    correctCount: number;
    wrongCount: number;
    bestStreak: number;
    isNewHighScore: boolean;
    previousHighScore?: number;
    onPlayAgain: () => void;
}

export default function GameSummary({
    score,
    correctCount,
    wrongCount,
    bestStreak,
    isNewHighScore,
    previousHighScore,
    onPlayAgain
}: GameSummaryProps) {
    const totalProblems = correctCount + wrongCount;
    const accuracy = totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-700">
                {/* Header */}
                <div className="text-center mb-8">
                    {isNewHighScore ? (
                        <>
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce">
                                <Trophy className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-yellow-400 mb-2">שיא חדש!</h2>
                            <p className="text-slate-400">
                                שברת את השיא הקודם של {previousHighScore || 0} נקודות
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                                <Award className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">סיום משחק</h2>
                            <p className="text-slate-400">כל הכבוד על התרגול!</p>
                        </>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Score */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
                            <Star className="w-5 h-5" fill="currentColor" />
                            <span className="text-2xl font-bold">{score}</span>
                        </div>
                        <span className="text-xs text-slate-400">ניקוד</span>
                    </div>

                    {/* Best Streak */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-orange-400 mb-1">
                            <Flame className="w-5 h-5" fill="currentColor" />
                            <span className="text-2xl font-bold">{bestStreak}</span>
                        </div>
                        <span className="text-xs text-slate-400">סטריק מקסימלי</span>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                            <Target className="w-5 h-5" />
                            <span className="text-2xl font-bold">{accuracy}%</span>
                        </div>
                        <span className="text-xs text-slate-400">דיוק</span>
                    </div>

                    {/* Problems Solved */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                            <span className="text-2xl font-bold">
                                <span className="text-green-400">{correctCount}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-red-400">{wrongCount}</span>
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">נכון / שגוי</span>
                    </div>
                </div>

                {/* Ad Slot */}
                <div className="mb-6">
                    <AdSlot slotId="game-summary-ad" format="rectangle" className="mx-auto" />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onPlayAgain}
                        className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        <span>שחק שוב</span>
                    </button>

                    <Link
                        href="/play"
                        className="w-full py-4 px-6 bg-slate-700/50 text-white font-bold text-lg rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        <span>חזרה לתפריט</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
