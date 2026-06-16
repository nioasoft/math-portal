import {
  getGame3DBestScore,
  setGame3DBestScore,
  getGame3DRecord,
  setGame3DRecord,
  type Game3DRecord,
} from '@/lib/game/storage';
import type { CompleteSummary } from '@/lib/games3d/types';

export interface CompletionResult {
  isNewBest: boolean;
  record: Game3DRecord;
}

/** Persist a new score as the best for this game if it beats the stored best. Returns the resulting best. */
export function recordBestScore(gameId: string, score: number): number {
  const prev = getGame3DBestScore(gameId);
  if (score > prev) {
    setGame3DBestScore(gameId, score);
    return score;
  }
  return prev;
}

/** Record a full completion summary, updating all tracked metrics. */
export function recordCompletion(gameId: string, summary: CompleteSummary): CompletionResult {
  const prev = getGame3DRecord(gameId);
  const isNewBest = summary.totalPoints > prev.bestScore;

  const record: Game3DRecord = {
    bestScore: Math.max(prev.bestScore, summary.totalPoints),
    bestAccuracy: Math.max(prev.bestAccuracy, summary.accuracy),
    bestStreak: Math.max(prev.bestStreak, summary.streak ?? 0),
    totalPlays: prev.totalPlays + 1,
  };

  setGame3DRecord(gameId, record);

  // Backward compat: also update the legacy best-score store
  if (isNewBest) {
    setGame3DBestScore(gameId, summary.totalPoints);
  }

  return { isNewBest, record };
}
