'use client';

import { useTranslations } from 'next-intl';

interface Props {
  onRetry: () => void;
}

export function GameLoadError({ onRetry }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
      <p className="text-lg">{t('gameLoadError')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
      >
        {t('retry')}
      </button>
    </div>
  );
}
