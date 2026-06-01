import { getGame3DBestScore, setGame3DBestScore } from '@/lib/game/storage';

/** Persist a new score as the best for this game if it beats the stored best. Returns the resulting best. */
export function recordBestScore(gameId: string, score: number): number {
  const prev = getGame3DBestScore(gameId);
  if (score > prev) {
    setGame3DBestScore(gameId, score);
    return score;
  }
  return prev;
}
