'use client';

import { useTranslations } from 'next-intl';
import type { GameMode3D } from '@/lib/games3d/types';

interface Props {
  supportedModes: GameMode3D[];
  onPick: (mode: GameMode3D) => void;
  /** Optional short how-to-play text shown under the heading. */
  instructions?: string;
}

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
        {supportedModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPick(mode)}
            className="rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-500 active:scale-95"
          >
            {t(mode)}
          </button>
        ))}
      </div>
    </div>
  );
}
