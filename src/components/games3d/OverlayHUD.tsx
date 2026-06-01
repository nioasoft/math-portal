'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Check, X, Lightbulb } from 'lucide-react';
import type { FeedbackEvent } from '@/lib/games3d/types';

interface Props {
  score: number;
  feedback: FeedbackEvent | null;
  /** Persistent question prompt — stays visible until replaced (distinct from the transient feedback toast). */
  prompt?: string;
}

const FEEDBACK_STYLES = {
  correct: { Icon: Check, bg: 'bg-emerald-500/90', text: 'text-white' },
  wrong:   { Icon: X,     bg: 'bg-rose-500/90',    text: 'text-white' },
  hint:    { Icon: Lightbulb, bg: 'bg-amber-400/90', text: 'text-slate-900' },
} as const;

export function OverlayHUD({ score, feedback, prompt }: Props): React.ReactElement {
  const t = useTranslations('games');
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-stretch p-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 bg-slate-800/70 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">{t('score.score')}: </span>
          <span className="font-semibold tabular-nums">{score}</span>
        </div>
      </div>

      {prompt && (
        <div
          data-testid="prompt-banner"
          className="mx-auto mt-2 px-5 py-2 rounded-xl bg-slate-900/80 backdrop-blur text-white text-lg font-bold tabular-nums shadow-lg text-center"
          dir="auto"
          role="status"
          aria-live="polite"
        >
          {prompt}
        </div>
      )}

      {feedback && (
        <div
          data-testid="feedback-toast"
          className={`mt-auto self-center mb-4 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg ${FEEDBACK_STYLES[feedback.kind].bg} ${FEEDBACK_STYLES[feedback.kind].text}`}
          role="status"
        >
          {(() => {
            const Icon = FEEDBACK_STYLES[feedback.kind].Icon;
            return <Icon className="w-5 h-5" aria-hidden="true" />;
          })()}
          {feedback.message && <span>{feedback.message}</span>}
        </div>
      )}
    </div>
  );
}
