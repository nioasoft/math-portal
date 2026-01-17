import { GameMode, GameTopic } from './game-engine';

export interface HighScore {
    score: number;
    streak: number;
    correctCount: number;
    date: string;
}

export interface GameStats {
    totalGamesPlayed: number;
    totalCorrect: number;
    totalWrong: number;
    highScores: {
        [key: string]: HighScore; // key = `${topic}-${mode}`
    };
}

const STORAGE_KEY = 'math-game-stats';

// Get default stats
function getDefaultStats(): GameStats {
    return {
        totalGamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        highScores: {}
    };
}

// Load stats from localStorage
export function loadStats(): GameStats {
    if (typeof window === 'undefined') {
        return getDefaultStats();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load game stats:', e);
    }

    return getDefaultStats();
}

// Save stats to localStorage
export function saveStats(stats: GameStats): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error('Failed to save game stats:', e);
    }
}

// Get high score for a specific topic and mode
export function getHighScore(topic: GameTopic, mode: GameMode): HighScore | null {
    const stats = loadStats();
    const key = `${topic}-${mode}`;
    return stats.highScores[key] || null;
}

// Update high score if the new score is higher
export function updateHighScore(
    topic: GameTopic,
    mode: GameMode,
    score: number,
    streak: number,
    correctCount: number
): boolean {
    const stats = loadStats();
    const key = `${topic}-${mode}`;
    const current = stats.highScores[key];

    const isNewHighScore = !current || score > current.score;

    if (isNewHighScore) {
        stats.highScores[key] = {
            score,
            streak,
            correctCount,
            date: new Date().toISOString()
        };
    }

    // Update total stats
    stats.totalGamesPlayed++;
    stats.totalCorrect += correctCount;

    saveStats(stats);
    return isNewHighScore;
}

// Clear all stats (for testing/reset)
export function clearStats(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}
