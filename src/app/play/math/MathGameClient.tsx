'use client';

import { useState, useCallback, useEffect } from 'react';
import { MathOperation } from '@/lib/math-engine';
import { GameEngine, GameMode, GameState } from '@/lib/game/game-engine';
import { getHighScore, updateHighScore } from '@/lib/game/storage';
import GameShell from '@/components/game/GameShell';
import ProblemDisplay from '@/components/game/ProblemDisplay';
import AnswerInput from '@/components/game/AnswerInput';
import Feedback from '@/components/game/Feedback';
import ScoreDisplay from '@/components/game/ScoreDisplay';
import Timer from '@/components/game/Timer';
import GameSummary from '@/components/game/GameSummary';
import { Play, Clock, Zap, Settings } from 'lucide-react';

type GamePhase = 'setup' | 'playing' | 'feedback' | 'summary';

export default function MathGameClient() {
    const [gameEngine] = useState(() => new GameEngine());
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [phase, setPhase] = useState<GamePhase>('setup');
    const [feedbackResult, setFeedbackResult] = useState<{ correct: boolean; answer: number } | null>(null);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [previousHighScore, setPreviousHighScore] = useState(0);

    // Setup options
    const [selectedMode, setSelectedMode] = useState<GameMode>('practice');
    const [selectedOperation, setSelectedOperation] = useState<MathOperation | 'mixed'>('+');
    const [selectedRange, setSelectedRange] = useState(100);
    const [selectedDuration, setSelectedDuration] = useState(60);

    // Load high score on mount
    useEffect(() => {
        const highScore = getHighScore('math', selectedMode);
        setPreviousHighScore(highScore?.score || 0);
    }, [selectedMode]);

    const startGame = () => {
        const duration = selectedMode === 'quiz' ? selectedDuration : 0;
        const state = gameEngine.startGame(selectedMode, 'math', duration);

        // Generate first problem with selected operation
        const op = selectedOperation === 'mixed'
            ? ['+', '-', '*', ':'][Math.floor(Math.random() * 4)] as MathOperation
            : selectedOperation;
        gameEngine.nextProblem(op, selectedRange);

        setGameState(gameEngine.getState());
        setPhase('playing');
    };

    const handleAnswer = (answer: number) => {
        const result = gameEngine.checkAnswer(answer);

        if (result.correct && selectedMode === 'quiz') {
            gameEngine.addTimeBonus(2);
        }

        setFeedbackResult({ correct: result.correct, answer: result.correctAnswer });
        setGameState(gameEngine.getState());
        setPhase('feedback');
    };

    const handleFeedbackComplete = useCallback(() => {
        setFeedbackResult(null);

        const state = gameEngine.getState();

        // Check if game should end (quiz mode with no time)
        if (state.mode === 'quiz' && state.timeRemaining !== null && state.timeRemaining <= 0) {
            endGame();
            return;
        }

        // Generate next problem
        const op = selectedOperation === 'mixed'
            ? ['+', '-', '*', ':'][Math.floor(Math.random() * 4)] as MathOperation
            : selectedOperation;
        gameEngine.nextProblem(op, selectedRange);
        setGameState(gameEngine.getState());
        setPhase('playing');
    }, [selectedOperation, selectedRange, gameEngine]);

    const handleTick = useCallback(() => {
        const state = gameEngine.tick();
        setGameState({ ...state });

        if (state.timeRemaining !== null && state.timeRemaining <= 0) {
            endGame();
        }
    }, [gameEngine]);

    const endGame = () => {
        const state = gameEngine.endGame();
        setGameState(state);

        // Check for high score
        const isNew = updateHighScore('math', state.mode, state.score, state.bestStreak, state.correctCount);
        setIsNewHighScore(isNew);
        setPhase('summary');
    };

    const handlePlayAgain = () => {
        setPhase('setup');
        setGameState(null);
        setIsNewHighScore(false);
        const highScore = getHighScore('math', selectedMode);
        setPreviousHighScore(highScore?.score || 0);
    };

    // Setup screen
    if (phase === 'setup') {
        return (
            <GameShell title="משחק חשבון">
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        {/* Mode Selection */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                מצב משחק
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedMode('practice')}
                                    className={`p-4 rounded-xl border-2 transition ${
                                        selectedMode === 'practice'
                                            ? 'border-green-500 bg-green-500/20'
                                            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                    }`}
                                >
                                    <Zap className={`w-6 h-6 mx-auto mb-2 ${selectedMode === 'practice' ? 'text-green-400' : 'text-slate-400'}`} />
                                    <span className="font-bold">תרגול חופשי</span>
                                    <p className="text-xs text-slate-400 mt-1">ללא הגבלת זמן</p>
                                </button>
                                <button
                                    onClick={() => setSelectedMode('quiz')}
                                    className={`p-4 rounded-xl border-2 transition ${
                                        selectedMode === 'quiz'
                                            ? 'border-orange-500 bg-orange-500/20'
                                            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                    }`}
                                >
                                    <Clock className={`w-6 h-6 mx-auto mb-2 ${selectedMode === 'quiz' ? 'text-orange-400' : 'text-slate-400'}`} />
                                    <span className="font-bold">חידון</span>
                                    <p className="text-xs text-slate-400 mt-1">נגד השעון</p>
                                </button>
                            </div>
                        </div>

                        {/* Quiz Duration (only for quiz mode) */}
                        {selectedMode === 'quiz' && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold mb-4">זמן החידון</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    {[60, 90, 120].map((duration) => (
                                        <button
                                            key={duration}
                                            onClick={() => setSelectedDuration(duration)}
                                            className={`p-3 rounded-xl border-2 transition ${
                                                selectedDuration === duration
                                                    ? 'border-orange-500 bg-orange-500/20'
                                                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                            }`}
                                        >
                                            <span className="font-bold">{duration} שניות</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Operation Selection */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold mb-4">פעולה</h2>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { op: '+', label: '+' },
                                    { op: '-', label: '-' },
                                    { op: '*', label: '×' },
                                    { op: ':', label: ':' },
                                    { op: 'mixed', label: 'מעורב' },
                                ].map(({ op, label }) => (
                                    <button
                                        key={op}
                                        onClick={() => setSelectedOperation(op as MathOperation | 'mixed')}
                                        className={`p-3 rounded-xl border-2 transition text-xl font-bold ${
                                            selectedOperation === op
                                                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Range Selection */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold mb-4">טווח מספרים</h2>
                            <div className="grid grid-cols-4 gap-2">
                                {[20, 50, 100, 1000].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setSelectedRange(range)}
                                        className={`p-3 rounded-xl border-2 transition font-bold ${
                                            selectedRange === range
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                                                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                        }`}
                                    >
                                        עד {range}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* High Score Display */}
                        {previousHighScore > 0 && (
                            <div className="mb-6 text-center">
                                <span className="text-slate-400">שיא קודם: </span>
                                <span className="text-yellow-400 font-bold">{previousHighScore}</span>
                            </div>
                        )}

                        {/* Start Button */}
                        <button
                            onClick={startGame}
                            className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl rounded-xl hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2"
                        >
                            <Play className="w-6 h-6" />
                            <span>התחל לשחק</span>
                        </button>
                    </div>
                </div>
            </GameShell>
        );
    }

    // Game screen
    if (gameState && (phase === 'playing' || phase === 'feedback')) {
        return (
            <GameShell
                title="משחק חשבון"
                topBar={
                    gameState.mode === 'quiz' && gameState.timeRemaining !== null ? (
                        <Timer
                            timeRemaining={gameState.timeRemaining}
                            onTick={handleTick}
                            isActive={phase === 'playing'}
                        />
                    ) : undefined
                }
                onExit={endGame}
            >
                <div className="flex-1 flex flex-col">
                    {/* Score Display */}
                    <ScoreDisplay
                        score={gameState.score}
                        streak={gameState.streak}
                        correctCount={gameState.correctCount}
                        wrongCount={gameState.wrongCount}
                    />

                    {/* Problem */}
                    <div className="flex-1 flex flex-col justify-center px-4">
                        {gameState.currentProblem && (
                            <ProblemDisplay problem={gameState.currentProblem} />
                        )}

                        {/* Answer Input */}
                        <div className="mt-8">
                            <AnswerInput
                                onSubmit={handleAnswer}
                                disabled={phase === 'feedback'}
                            />
                        </div>
                    </div>

                    {/* End button for practice mode */}
                    {gameState.mode === 'practice' && (
                        <div className="p-4 text-center">
                            <button
                                onClick={endGame}
                                className="text-slate-400 hover:text-white transition text-sm"
                            >
                                סיים משחק
                            </button>
                        </div>
                    )}
                </div>

                {/* Feedback overlay */}
                <Feedback
                    correct={feedbackResult?.correct ?? null}
                    correctAnswer={feedbackResult?.answer}
                    onComplete={handleFeedbackComplete}
                />
            </GameShell>
        );
    }

    // Summary screen
    if (phase === 'summary' && gameState) {
        return (
            <GameShell title="משחק חשבון">
                <GameSummary
                    score={gameState.score}
                    correctCount={gameState.correctCount}
                    wrongCount={gameState.wrongCount}
                    bestStreak={gameState.bestStreak}
                    isNewHighScore={isNewHighScore}
                    previousHighScore={previousHighScore}
                    onPlayAgain={handlePlayAgain}
                />
            </GameShell>
        );
    }

    return null;
}
