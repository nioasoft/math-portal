'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Check, X, Lightbulb, HelpCircle } from 'lucide-react';
import type { ControlButton, FeedbackEvent, GameStatus } from '@/lib/games3d/types';

interface Props {
  score: number;
  feedback: FeedbackEvent | null;
  /** Persistent question prompt — stays visible until replaced (distinct from the transient feedback toast). */
  prompt?: string;
  /** Short, persistent "how to play" subtitle rendered under the prompt banner. */
  instructions?: string;
  /** On-screen HTML control buttons (−/+, Check, Reset, …). */
  controls?: ControlButton[];
  /** Reward/progress snapshot (stars, streak, progress) shown in the top status bar. */
  status?: GameStatus;
}

/** Instructions auto-collapse after this long so the playfield stays visible. */
const HELP_AUTO_COLLAPSE_MS = 6000;

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
  reset:   'bg-slate-600 text-white border border-white/25 hover:bg-slate-500 active:scale-95',
} as const;

export function OverlayHUD({ score, feedback, prompt, instructions, controls, status }: Props): React.ReactElement {
  const t = useTranslations('games');
  const [helpOpen, setHelpOpen] = useState(true);
  const [trackedInstructions, setTrackedInstructions] = useState(instructions);
  const showStatus = hasStatus(status);
  const stars = status?.stars ?? 0;
  const maxStars = status?.maxStars ?? 0;

  // A different game/mode means a different how-to-play text, so start expanded again.
  if (instructions !== trackedInstructions) {
    setTrackedInstructions(instructions);
    setHelpOpen(true);
  }

  useEffect(() => {
    if (!instructions) return;
    const id = setTimeout(() => setHelpOpen(false), HELP_AUTO_COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [instructions]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-stretch p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-2">
        {showStatus ? (
          <div
            data-testid="status-bar"
            className="flex items-center gap-3 bg-slate-800/85 backdrop-blur px-3 py-1.5 rounded-lg text-white text-base"
            dir="auto"
          >
            {maxStars > 0 && (
              <span className="flex items-center gap-0.5" aria-label={`${stars}/${maxStars}`}>
                {Array.from({ length: maxStars }, (_, i) => (
                  <span
                    key={i}
                    className={`inline-block transition-transform duration-300 ${i < stars ? 'text-amber-300 scale-110' : 'text-slate-300 scale-100'}`}
                    aria-hidden="true"
                  >
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
        <div className="flex items-center gap-2">
          {instructions && !helpOpen && (
            <button
              type="button"
              data-testid="help-toggle"
              onClick={() => setHelpOpen(true)}
              aria-expanded={false}
              aria-label={t('hud.help')}
              className="pointer-events-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-800/85 text-white backdrop-blur transition hover:bg-slate-700"
            >
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-800/85 backdrop-blur px-3 py-1.5 rounded-lg text-white text-lg">
            <Trophy className="h-6 w-6 text-amber-300" aria-hidden="true" />
            <span className="sr-only">{t('score.score')}: </span>
            <span className="font-bold tabular-nums">{score}</span>
          </div>
        </div>
      </div>

      {/* Top band: prompt + how-to-play live here so they never cover the playfield
          centre or the bottom control row. */}
      {(prompt || (instructions && helpOpen)) && (
        <div className="mx-auto mt-2 flex w-full max-w-[min(92%,34rem)] flex-col items-center gap-1.5">
          {prompt && (
            <div
              data-testid="prompt-banner"
              className="w-full rounded-xl bg-slate-900 px-5 py-2 text-center text-2xl font-bold tabular-nums text-white shadow-lg md:text-3xl"
              dir="auto"
              role="status"
              aria-live="polite"
            >
              {prompt}
            </div>
          )}

          {instructions && helpOpen && (
            <div
              data-testid="prompt-instructions"
              className="relative w-full rounded-lg bg-slate-900 px-9 py-2 text-center text-base text-white shadow"
              dir="auto"
            >
              {instructions}
              <button
                type="button"
                data-testid="help-close"
                onClick={() => setHelpOpen(false)}
                aria-expanded
                aria-label={t('hud.hideHelp')}
                className="pointer-events-auto absolute end-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 transition hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div
          data-testid="feedback-toast"
          className={`self-center mb-4 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg text-base font-semibold animate-[toastIn_200ms_ease-out] ${FEEDBACK_STYLES[feedback.kind].bg} ${FEEDBACK_STYLES[feedback.kind].text} ${controls && controls.length > 0 ? 'mt-2' : 'mt-auto'}`}
          role="status"
          aria-live="polite"
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
              disabled={btn.disabled}
              className={`min-h-[44px] min-w-[44px] rounded-xl px-4 py-2.5 text-base font-bold shadow-lg backdrop-blur transition-transform ${CONTROL_VARIANT_STYLES[btn.variant ?? 'default']} ${btn.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
