'use client';

import { useTranslations } from 'next-intl';
import { Gamepad2, Trophy } from 'lucide-react';
import type { GameMode3D } from '@/lib/games3d/types';

interface Props {
  supportedModes: GameMode3D[];
  onPick: (mode: GameMode3D) => void;
  /** Optional short how-to-play text shown under the heading. */
  instructions?: string;
}

const MODE_STYLES = {
  practice: {
    Icon: Gamepad2,
    gradient: 'from-indigo-600 to-indigo-700',
    hover: 'hover:from-indigo-500 hover:to-indigo-600',
    descKey: 'practiceDesc',
  },
  quiz: {
    Icon: Trophy,
    gradient: 'from-amber-500 to-amber-600',
    hover: 'hover:from-amber-400 hover:to-amber-500',
    descKey: 'quizDesc',
  },
} as const;

export function ModePicker({ supportedModes, onPick, instructions }: Props): React.ReactElement {
  const t = useTranslations('games3d.modes');
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-slate-900/95 px-6 text-center">
      <h2 className="text-xl font-bold text-white">{t('choose')}</h2>
      {instructions && (
        <p dir="auto" className="max-w-md text-sm text-slate-300">
          {instructions}
        </p>
      )}
      <div className="flex gap-4">
        {supportedModes.map((mode) => {
          const style = MODE_STYLES[mode];
          const Icon = style.Icon;
          let desc = '';
          try { desc = t(style.descKey); } catch { /* fallback below */ }
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onPick(mode)}
              className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${style.gradient} ${style.hover} px-8 py-5 text-white shadow-lg transition hover:shadow-xl active:scale-95`}
            >
              <Icon className="w-8 h-8" aria-hidden="true" />
              <span className="text-lg font-bold">{t(mode)}</span>
              {desc && <span className="text-xs opacity-80">{desc}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
