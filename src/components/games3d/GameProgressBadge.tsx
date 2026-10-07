'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getGame3DRecord, type Game3DRecord } from '@/lib/game/storage';
import { computeStars } from '@/lib/games3d/kit/rewards';

/**
 * Trophy chip for a game the child has already played. The record lives in
 * localStorage, so it is read after mount; the chip is absolutely positioned so
 * unplayed cards don't shift when it appears.
 */
export function GameProgressBadge({ gameId }: { gameId: string }): React.ReactElement | null {
  const t = useTranslations('games3d');
  const [record, setRecord] = useState<Game3DRecord | null>(null);

  useEffect(() => {
    setRecord(getGame3DRecord(gameId));
  }, [gameId]);

  if (!record || record.totalPlays === 0 || record.bestScore <= 0) return null;

  const stars = computeStars(record.bestAccuracy);

  return (
    <div
      data-testid="game-progress"
      className="absolute end-2 top-2 z-20 flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 shadow-sm"
    >
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={i < stars ? 'text-amber-500' : 'text-amber-200'}>
            {i < stars ? '★' : '☆'}
          </span>
        ))}
      </span>
      <span className="tabular-nums">{record.bestScore}</span>
      <span className="sr-only">
        {t('stars', { count: stars })}, {t('bestScore')}: {record.bestScore}
      </span>
    </div>
  );
}
