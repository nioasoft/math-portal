'use client';

import { useState, useCallback, useEffect } from 'react';
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

export default function PercentageGameClient() {
    const [gameEngine] = useState(() => new GameEngine());
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [phase, setPhase] = useState<GamePhase>('setup');
    const [feedbackResult, setFeedbackResult] = useState<{ correct: boolean; answer: number } | null>(null);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [previousHighScore, setPreviousHighScore] = useState(0);

    // Setup options
    const [selectedMode, setSelectedMode] = useState<GameMode>('practice');
    const [selectedDuration, setSelectedDuration] = useState(60);

    // Load high score on mount
    useEffect(() => {
        const highScore = getHighScore('percentage', selectedMode);
        setPreviousHighScore(highScore?.score || 0);
    }, [selectedMode]);

    const startGame = () => {
        const duration = selectedMode === 'quiz' ? selectedDuration : 0;
        const state = gameEngine.startGame(selectedMode, 'percentage', duration);
        gameEngine.nextProblem();
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

        // Check if game should end
        if (state.mode === 'quiz' && state.timeRemaining !== null && state.timeRemaining <= 0) {
            endGame();
            return;
        }

        // Generate next problem
        gameEngine.nextProblem();
        setGameState(gameEngine.getState());
        setPhase('playing');
    }, [gameEngine]);

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

        const isNew = updateHighScore('percentage', state.mode, state.score, state.bestStreak, state.correctCount);
        setIsNewHighScore(isNew);
        setPhase('summary');
    };

    const handlePlayAgain = () => {
        setPhase('setup');
        setGameState(null);
        setIsNewHighScore(false);
        const highScore = getHighScore('percentage', selectedMode);
        setPreviousHighScore(highScore?.score || 0);
    };

    // Setup screen
    if (phase === 'setup') {
        return (
            <GameShell title="משחק אחוזים">
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

                        {/* Quiz Duration */}
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

                        {/* Info about percentage problems */}
                        <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <h3 className="font-bold mb-2 text-emerald-400">מה נתרגל?</h3>
                            <p className="text-sm text-slate-400">
                                חישוב אחוז מתוך שלם. למשל: כמה זה 25% מתוך 80?
                            </p>
                            <p className="text-sm text-slate-400 mt-2">
                                טיפ: 10% זה תמיד לחלק ב-10!
                            </p>
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
                            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xl rounded-xl hover:from-emerald-600 hover:to-teal-700 transition flex items-center justify-center gap-2"
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
                title="משחק אחוזים"
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
            <GameShell title="משחק אחוזים">
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
