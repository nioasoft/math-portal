'use client';

import { GameProblem, formatFraction } from '@/lib/game/game-engine';

interface ProblemDisplayProps {
    problem: GameProblem;
}

export default function ProblemDisplay({ problem }: ProblemDisplayProps) {
    // Render fraction component
    const FractionDisplay = ({ n, d, whole }: { n: number; d: number; whole?: number }) => (
        <span className="inline-flex items-center gap-0.5 md:gap-1 mx-0.5 md:mx-1">
            {whole && whole > 0 ? <span className="text-3xl md:text-4xl font-bold">{whole}</span> : null}
            <span className="inline-flex flex-col items-center text-xl md:text-2xl">
                <span>{n}</span>
                <span className="h-[2px] md:h-[3px] w-full bg-white my-0.5"></span>
                <span>{d}</span>
            </span>
        </span>
    );

    // Render based on problem type
    if (problem.type === 'math' && problem.mathProblem) {
        const { num1, num2, operator } = problem.mathProblem;
        return (
            <div className="text-center py-8">
                <div className="text-5xl md:text-6xl font-bold tracking-wide" dir="ltr">
                    <span>{num1}</span>
                    <span className="mx-4 text-yellow-400">{operator}</span>
                    <span>{num2}</span>
                    <span className="mx-4 text-slate-500">=</span>
                    <span className="text-slate-600">?</span>
                </div>
            </div>
        );
    }

    if (problem.type === 'fractions' && problem.fractionProblem) {
        const { f1, f2, op } = problem.fractionProblem;
        return (
            <div className="text-center py-4">
                <div className="text-3xl md:text-5xl font-bold flex items-center justify-center gap-1 md:gap-2" dir="ltr">
                    <FractionDisplay n={f1.n} d={f1.d} whole={f1.whole} />
                    <span className="mx-2 md:mx-4 text-yellow-400 text-4xl md:text-5xl">{op}</span>
                    <FractionDisplay n={f2.n} d={f2.d} whole={f2.whole} />
                    <span className="mx-2 md:mx-4 text-slate-500">=</span>
                    <span className="text-slate-600">?</span>
                </div>
            </div>
        );
    }

    if (problem.type === 'percentage' && problem.percentProblem) {
        const { percent, total } = problem.percentProblem;
        return (
            <div className="text-center py-8">
                <div className="text-4xl md:text-5xl font-bold">
                    <span className="text-yellow-400">{percent}%</span>
                    <span className="mx-4 text-slate-400 text-3xl">מתוך</span>
                    <span>{total}</span>
                    <span className="mx-4 text-slate-500">=</span>
                    <span className="text-slate-600">?</span>
                </div>
            </div>
        );
    }

    // Fallback - simple display
    return (
        <div className="text-center py-8">
            <div className="text-5xl md:text-6xl font-bold">
                {problem.display} = ?
            </div>
        </div>
    );
}
