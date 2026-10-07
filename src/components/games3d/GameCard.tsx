'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { topicStyle } from './topicMeta';
import { gameArt } from './gameArt';
import { GameProgressBadge } from './GameProgressBadge';

export interface GameCardData {
  id: string;
  title: string;
  topic: string;
  topicLabel: string;
  gradeLabel: string;
  /** GameMeta.difficulty, 1–5 — rendered as dots, so it is not translated. */
  difficulty: number;
  estimatedSeconds: number;
  /** GameMeta.gradeRange — kept numeric so the catalog can filter by grade. */
  grades: [number, number];
}

interface GameCardProps {
  game: GameCardData;
  /** Fixed-width card for horizontal shelves (default); set false to flex in a grid. */
  fixedWidth?: boolean;
}

const MAX_DIFFICULTY = 5;

/**
 * A single 3D-game card used by the home Games Hub shelves and the /play
 * catalog. Art is per game (not per topic) so the four arithmetic games no
 * longer share one blue calculator. RTL-safe: logical properties only.
 */
export function GameCard({ game, fixedWidth = true }: GameCardProps) {
  const t = useTranslations('games3d');
  const style = topicStyle(game.topic);
  const art = gameArt(game.id, game.topic);
  const Icon = art.icon;
  const gradient = { backgroundImage: `linear-gradient(135deg, ${art.from}, ${art.to})` };
  const minutes = Math.max(1, Math.round(game.estimatedSeconds / 60));

  return (
    <Link
      href={`/play/${game.id}`}
      className={`group relative flex flex-col rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-transparent hover:shadow-xl card-lift overflow-hidden ${
        fixedWidth ? 'w-[200px] shrink-0 snap-start' : 'w-full h-full'
      }`}
    >
      {/* Gradient wash on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]"
        style={gradient}
      />

      <GameProgressBadge gameId={game.id} />

      <div className="relative z-10 flex h-full flex-col">
        <div
          className="mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={gradient}
        >
          <Icon size={28} strokeWidth={2.2} className="text-white" />
        </div>

        <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-slate-800 group-hover:text-slate-900">
          {game.title}
        </h3>

        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: MAX_DIFFICULTY }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < game.difficulty ? 'bg-brand' : 'bg-slate-200'}`}
              />
            ))}
          </span>
          <span className="sr-only">
            {t('difficultyLevel', { level: game.difficulty, max: MAX_DIFFICULTY })}
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('duration', { minutes })}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}>
            {game.topicLabel}
          </span>
          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {game.gradeLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
