'use client';

import { useTranslations } from 'next-intl';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  muted: boolean;
  onToggle: () => void;
}

export function MuteButton({ muted, onToggle }: Props): React.ReactElement {
  const t = useTranslations('games3d');
  const label = muted ? t('unmute') : t('mute');
  const Icon = muted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
