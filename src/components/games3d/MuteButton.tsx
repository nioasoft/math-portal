'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  muted: boolean;
  onToggle: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

export function MuteButton({ muted, onToggle, volume = 1, onVolumeChange }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const label = muted ? t('unmute') : t('mute');
  const Icon = muted ? VolumeX : Volume2;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange?.(Number(e.target.value));
    },
    [onVolumeChange]
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center bg-slate-700/50 hover:bg-slate-700 rounded-lg transition"
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </button>
      {onVolumeChange && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleSliderChange}
          aria-label={t('volume')}
          className="h-11 w-24 accent-toy-sky cursor-pointer"
        />
      )}
    </div>
  );
}
