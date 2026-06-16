'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  progress: number;
}

export function LoadingScene({ progress }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  const tipsCount = 10;
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * tipsCount));
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % tipsCount);
        setTipVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  let tipText = '';
  try {
    tipText = t(`loadingTips.${tipIndex}`);
  } catch {
    // Tips may not be translated in all locales yet
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
      <p className="text-lg">{t('loading')}</p>
      <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-150"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-slate-300" role="status">
        {t('loadProgress', { percent: pct })}
      </p>
      {tipText && (
        <p
          className={`max-w-sm text-center text-sm text-slate-400 transition-opacity duration-300 ${tipVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {tipText}
        </p>
      )}
    </div>
  );
}
