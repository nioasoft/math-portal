import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { GameCard, type GameCardData } from './GameCard';
import { topicStyle } from './topicMeta';

interface TopicShelfProps {
  topic: string;
  topicLabel: string;
  games: GameCardData[];
  showAllLabel: string;
}

/**
 * A Netflix-style horizontal row of game cards for one topic. Scrolls
 * horizontally on every breakpoint; RTL-safe (flex follows `dir`, the
 * "show all" arrow mirrors in LTR via `ltr:-scale-x-100`).
 */
export function TopicShelf({ topic, topicLabel, games, showAllLabel }: TopicShelfProps) {
  if (games.length === 0) return null;
  const style = topicStyle(topic);
  const Icon = style.icon;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} shadow-sm`}>
            <Icon size={18} className="text-white" />
          </span>
          <h3 className="text-lg font-black text-slate-800">{topicLabel}</h3>
          <span className="text-sm font-medium text-slate-400">({games.length})</span>
        </div>
        <Link
          href="/play"
          className="group flex items-center gap-1 text-sm font-bold text-purple-600 transition-colors hover:text-purple-700"
        >
          {showAllLabel}
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5 ltr:-scale-x-100" />
        </Link>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}
