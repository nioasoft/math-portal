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

// ============ 3D Games extensions ============

const KEY_3D_BEST_PREFIX = 'tirgul.games3d.best.';
const KEY_MUTE = 'tirgul.games3d.muted';

function safeRead(key: string): string | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeWrite(key: string, value: string): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
    } catch {
        // Silently ignore quota/permission errors — UX should not break
    }
}

export function getGame3DBestScore(gameId: string): number {
    const raw = safeRead(KEY_3D_BEST_PREFIX + gameId);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setGame3DBestScore(gameId: string, score: number): void {
    if (!Number.isFinite(score) || score < 0) return;
    safeWrite(KEY_3D_BEST_PREFIX + gameId, String(Math.floor(score)));
}

export function getMutePreference(): boolean {
    return safeRead(KEY_MUTE) === '1';
}

export function setMutePreference(muted: boolean): void {
    safeWrite(KEY_MUTE, muted ? '1' : '0');
}
