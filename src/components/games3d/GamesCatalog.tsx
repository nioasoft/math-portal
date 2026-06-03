'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid } from 'lucide-react';
import { GameCard, type GameCardData } from './GameCard';
import { topicStyle } from './topicMeta';

export interface CatalogTopic {
  key: string;
  count: number;
}

interface GamesCatalogProps {
  games: GameCardData[];
  /** Ordered topic chips (without the "all" entry — added here). */
  topics: CatalogTopic[];
}

/**
 * Filterable catalog of the 3D games: a sticky row of topic chips drives a
 * single responsive grid. Replaces the old flat 44-card wall. Client component
 * (holds the active-filter state); RTL-safe (logical flow, no left/right).
 */
export function GamesCatalog({ games, topics }: GamesCatalogProps) {
  const t = useTranslations('games.play.catalog');
  const tTopics = useTranslations('games3d');
  const [active, setActive] = useState<string>('all');

  const shown = active === 'all' ? games : games.filter((g) => g.topic === active);
  const chips = [{ key: 'all', count: games.length }, ...topics];

  return (
    <div>
      {/* Sticky topic chips */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {chips.map((chip) => {
            const isActive = chip.key === active;
            const style = topicStyle(chip.key === 'all' ? 'misc' : chip.key);
            const Icon = chip.key === 'all' ? LayoutGrid : style.icon;
            const label = chip.key === 'all' ? t('all') : tTopics(`topics.${chip.key}`);
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setActive(chip.key)}
                aria-pressed={isActive}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? `border-transparent bg-gradient-to-br ${style.gradient} text-white shadow-md`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <Icon size={16} />
                {label}
                <span className={`text-xs font-semibold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      <p className="mb-4 px-1 text-sm font-medium text-slate-500">
        {t('count', { n: shown.length })}
      </p>

      {/* Grid */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((game) => (
            <GameCard key={game.id} game={game} fixedWidth={false} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-12 text-center text-slate-500">
          {t('empty')}
        </div>
      )}
    </div>
  );
}
