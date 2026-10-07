'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid } from 'lucide-react';
import { GameCard, type GameCardData } from './GameCard';
import { ScrollRow } from './ScrollRow';
import { topicStyle } from './topicMeta';

interface GamesCatalogProps {
  games: GameCardData[];
  /** Ordered topic keys, without the "all" entry — added here. */
  topics: string[];
}

const GRADES = [1, 2, 3, 4, 5, 6];

/**
 * Filterable catalog of the 3D games: sticky topic + grade chip rows driving a
 * single responsive grid. Client component (holds the filter state); RTL-safe
 * (logical flow, no left/right).
 */
export function GamesCatalog({ games, topics }: GamesCatalogProps) {
  const t = useTranslations('games.play.catalog');
  const tTopics = useTranslations('games3d');
  const tGrades = useTranslations('common.grades');
  const [topic, setTopic] = useState('all');
  const [grade, setGrade] = useState(0);

  const inGrade = (g: GameCardData, n: number) => n === 0 || (g.grades[0] <= n && n <= g.grades[1]);
  const inTopic = (g: GameCardData, key: string) => key === 'all' || g.topic === key;

  const shown = games.filter((g) => inTopic(g, topic) && inGrade(g, grade));
  // Counts follow the *other* filter so a chip never advertises games that the
  // grid then hides.
  const chips = [
    { key: 'all', count: games.filter((g) => inGrade(g, grade)).length },
    ...topics.map((key) => ({
      key,
      count: games.filter((g) => inTopic(g, key) && inGrade(g, grade)).length,
    })),
  ];

  const chipBase =
    'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition-all';
  const chipOff = 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800';

  return (
    <div>
      {/* Sticky filters. `top-16` clears the site header, which is `sticky top-0 h-16 z-50`. */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-slate-200/70 bg-slate-50/90 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6">
        <ScrollRow className="flex gap-2">
          {chips.map((chip) => {
            const isActive = chip.key === topic;
            const style = topicStyle(chip.key === 'all' ? 'misc' : chip.key);
            const Icon = chip.key === 'all' ? LayoutGrid : style.icon;
            const label = chip.key === 'all' ? t('all') : tTopics(`topics.${chip.key}`);
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setTopic(chip.key)}
                aria-pressed={isActive}
                className={`${chipBase} ${
                  isActive
                    ? `border-transparent bg-gradient-to-br ${style.gradient} text-white shadow-md`
                    : chipOff
                }`}
              >
                <Icon size={16} />
                {label}
                <span className={`text-xs font-semibold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </ScrollRow>

        <ScrollRow className="mt-1.5 flex gap-2">
          <button
            type="button"
            onClick={() => setGrade(0)}
            aria-pressed={grade === 0}
            className={`${chipBase} ${grade === 0 ? 'border-transparent bg-brand text-white shadow-md' : chipOff}`}
          >
            {t('allGrades')}
          </button>
          {GRADES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setGrade(grade === n ? 0 : n)}
              aria-pressed={grade === n}
              className={`${chipBase} ${grade === n ? 'border-transparent bg-brand text-white shadow-md' : chipOff}`}
            >
              {tGrades(`grade${n}`)}
            </button>
          ))}
        </ScrollRow>
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
