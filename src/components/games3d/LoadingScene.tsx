'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  progress: number;
}

const TIPS_COUNT = 10;
const TIP_ROTATE_MS = 3000;
const TIP_FADE_MS = 300;

export function LoadingScene({ progress }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS_COUNT));
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setTipVisible(false);
      swapTimer = setTimeout(() => {
        setTipIndex((i) => (i + 1) % TIPS_COUNT);
        setTipVisible(true);
      }, TIP_FADE_MS);
    }, TIP_ROTATE_MS);
    return () => {
      clearInterval(interval);
      if (swapTimer !== undefined) clearTimeout(swapTimer);
    };
  }, []);

  let tipText = '';
  try {
    tipText = t(`loadingTips.${tipIndex}`);
  } catch {
    // Tips may not be translated in all locales yet
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
      <p className="text-lg font-semibold">{t('loading')}</p>
      <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-toy-sky transition-all duration-150"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-slate-200" role="status">
        {t('loadProgress', { percent: pct })}
      </p>
      {tipText && (
        <p
          className={`max-w-sm text-center text-sm text-slate-300 transition-opacity duration-300 ${tipVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {tipText}
        </p>
      )}
    </div>
  );
}
