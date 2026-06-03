import { Link } from '@/i18n/navigation';
import { topicStyle } from './topicMeta';

export interface GameCardData {
  id: string;
  title: string;
  topic: string;
  topicLabel: string;
  gradeLabel: string;
}

interface GameCardProps {
  game: GameCardData;
  /** Fixed-width card for horizontal shelves (default); set false to flex in a grid. */
  fixedWidth?: boolean;
}

/**
 * A single 3D-game card used by the home Games Hub shelves and reusable in the
 * /play catalog. Server component — links straight to the game runner.
 * RTL-safe: logical properties only, no left/right.
 */
export function GameCard({ game, fixedWidth = true }: GameCardProps) {
  const style = topicStyle(game.topic);
  const Icon = style.icon;

  return (
    <Link
      href={`/play/${game.id}`}
      className={`group relative flex flex-col rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-transparent hover:shadow-xl card-lift overflow-hidden ${
        fixedWidth ? 'w-[200px] shrink-0 snap-start' : 'w-full'
      }`}
    >
      {/* Gradient wash on hover */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.05]`} />

      <div className="relative z-10">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={24} className="text-white" />
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-slate-800 group-hover:text-slate-900">
          {game.title}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}>
            {game.topicLabel}
          </span>
          <span className="inline-block rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {game.gradeLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
