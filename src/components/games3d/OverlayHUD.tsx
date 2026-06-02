'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Check, X, Lightbulb } from 'lucide-react';
import type { ControlButton, FeedbackEvent, GameStatus } from '@/lib/games3d/types';

interface Props {
  score: number;
  feedback: FeedbackEvent | null;
  /** Persistent question prompt — stays visible until replaced (distinct from the transient feedback toast). */
  prompt?: string;
  /** On-screen HTML control buttons (−/+, Check, Reset, …). */
  controls?: ControlButton[];
  /** Reward/progress snapshot (stars, streak, progress) shown in the top status bar. */
  status?: GameStatus;
}

/** True when the status object carries anything worth rendering. */
function hasStatus(s?: GameStatus): s is GameStatus {
  if (!s) return false;
  return (
    (typeof s.maxStars === 'number' && s.maxStars > 0) ||
    (typeof s.streak === 'number' && s.streak > 1) ||
    s.progress != null
  );
}

const FEEDBACK_STYLES = {
  correct: { Icon: Check, bg: 'bg-emerald-500/90', text: 'text-white' },
  wrong:   { Icon: X,     bg: 'bg-rose-500/90',    text: 'text-white' },
  hint:    { Icon: Lightbulb, bg: 'bg-amber-400/90', text: 'text-slate-900' },
} as const;

const CONTROL_VARIANT_STYLES = {
  default: 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95',
  confirm: 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95',
  reset:   'bg-transparent text-slate-200 border border-slate-400/70 hover:bg-slate-700/60 active:scale-95',
} as const;

export function OverlayHUD({ score, feedback, prompt, controls, status }: Props): React.ReactElement {
  const t = useTranslations('games');
  const showStatus = hasStatus(status);
  const stars = status?.stars ?? 0;
  const maxStars = status?.maxStars ?? 0;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-stretch p-4">
      <div className="flex items-center justify-between gap-2">
        {showStatus ? (
          <div
            data-testid="status-bar"
            className="flex items-center gap-3 bg-slate-800/70 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm"
            dir="auto"
          >
            {maxStars > 0 && (
              <span className="flex items-center gap-0.5" aria-label={`${stars}/${maxStars}`}>
                {Array.from({ length: maxStars }, (_, i) => (
                  <span key={i} className={i < stars ? 'text-amber-300' : 'text-slate-500'} aria-hidden="true">
                    {i < stars ? '★' : '☆'}
                  </span>
                ))}
              </span>
            )}
            {typeof status?.streak === 'number' && status.streak > 1 && (
              <span data-testid="status-streak" className="font-semibold tabular-nums">
                🔥 ×{status.streak}
              </span>
            )}
            {status?.progress && (
              <span
                data-testid="status-progress"
                className="rounded-full bg-slate-700/80 px-2 py-0.5 font-semibold tabular-nums"
              >
                {status.progress.current}/{status.progress.total}
              </span>
            )}
          </div>
        ) : (
          <span />
        )}
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
          className={`self-center mb-4 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg ${FEEDBACK_STYLES[feedback.kind].bg} ${FEEDBACK_STYLES[feedback.kind].text} ${controls && controls.length > 0 ? 'mt-2' : 'mt-auto'}`}
          role="status"
        >
          {(() => {
            const Icon = FEEDBACK_STYLES[feedback.kind].Icon;
            return <Icon className="w-5 h-5" aria-hidden="true" />;
          })()}
          {feedback.message && <span>{feedback.message}</span>}
        </div>
      )}

      {controls && controls.length > 0 && (
        <div
          data-testid="controls-bar"
          className="pointer-events-auto mt-auto flex flex-wrap items-center justify-center gap-2 pt-3"
        >
          {controls.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={btn.onPress}
              className={`min-h-[44px] min-w-[44px] rounded-xl px-4 py-2.5 text-base font-bold shadow-lg backdrop-blur transition-transform ${CONTROL_VARIANT_STYLES[btn.variant ?? 'default']}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
