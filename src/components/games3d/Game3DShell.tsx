'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import GameShell from '@/components/game/GameShell';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { Canvas3D } from './Canvas3D';
import { OverlayHUD } from './OverlayHUD';
import { MuteButton } from './MuteButton';
import { WebGLFallback } from './WebGLFallback';
import { LoadingScene } from './LoadingScene';
import { GameLoadError } from './GameLoadError';
import { ModePicker } from './ModePicker';
import { recordCompletion } from './completion';
import { computeStars } from '@/lib/games3d/kit';
import type { CompleteSummary, ControlButton, FeedbackEvent, Game3D, GameMeta, GameMode3D, GameStatus } from '@/lib/games3d/types';
import { gameLoaders } from '@/lib/games3d/games/loaders';
import { getAudioPrefs, getServerAudioPrefs, setAudioPrefs, subscribeAudioPrefs } from '@/lib/game/storage';
import { hasWebGL } from '@/lib/games3d/engine/WebGLCheck';
import { isRtlLocale } from '@/i18n/config';
import { trackGameStart, trackGameComplete } from '@/lib/analytics';

interface Props {
  /** Game id — resolved to the actual Game3D module on the client (the game object
   * holds functions and cannot cross the server→client boundary). */
  gameId: string;
  /** Serializable metadata needed before the game module loads (modes, etc.). */
  meta: GameMeta;
  title: string;
  /** Test/override hook. Omitted in the app — the shell probes WebGL on the client. */
  webGLAvailable?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  /** Short how-to-play text shown on the mode-picker screen (first-time UX). */
  instructions?: string;
  /** Pre-select a mode (e.g. from a `?mode=` deep link) and skip the picker. */
  initialMode?: GameMode3D;
  /** Override the registry lookup with an explicit client-side loader (e.g. the dev canary). */
  gameLoader?: () => Promise<{ default: Game3D }>;
  /** Same-topic games offered on the completion overlay so a finished round leads
   * somewhere instead of dead-ending. Resolved on the server (titles are localized). */
  relatedGames?: { id: string; title: string }[];
  onComplete?: (summary: CompleteSummary) => void;
  onExit?: () => void;
}

type ShellSummary = CompleteSummary & { isNewBest?: boolean; bestScore?: number };

const noop = (): void => undefined;
/** WebGL support never changes mid-session, so the store has nothing to subscribe to. */
const neverSubscribe = (): (() => void) => noop;
/** Server/hydration snapshot: `null` means "not probed yet", which keeps the loading
 * overlay up instead of flashing the wrong branch before the browser is asked. */
const webGLUnknown = (): boolean | null => null;

export function Game3DShell({
  gameId, meta, title, webGLAvailable, breadcrumbItems, instructions, initialMode, gameLoader, relatedGames, onComplete, onExit,
}: Props): React.ReactElement {
  const locale = useLocale();
  const isRTL = isRtlLocale(locale);
  const t = useTranslations('games3d');
  /** The 2D-quiz copy block, reused here so the round-summary labels ("Score",
   * "Accuracy", the warm sign-off) stay translated in one place. */
  const tg = useTranslations('games');

  const [game, setGame] = useState<Game3D | null>(null);
  // Both live outside React: audio prefs in localStorage, WebGL support in the
  // browser. `useSyncExternalStore` reads the server snapshot during SSR and
  // swaps in the real values after hydration, so there is no mismatch to guard.
  const { muted, volume } = useSyncExternalStore(subscribeAudioPrefs, getAudioPrefs, getServerAudioPrefs);
  const probedWebGL = useSyncExternalStore<boolean | null>(neverSubscribe, hasWebGL, webGLUnknown);
  const webGLOk = webGLAvailable ?? probedWebGL;
  const supportedModes = meta.supportedModes;
  const [mode, setMode] = useState<GameMode3D | null>(
    initialMode ?? (supportedModes.length === 1 ? supportedModes[0] : null)
  );
  const [summary, setSummary] = useState<ShellSummary | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [controls, setControls] = useState<ControlButton[]>([]);
  const [status, setStatus] = useState<GameStatus>({});
  const [progress, setProgress] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  // Guard so game_start fires exactly once per play; resets when the scene reloads (replay/retry).
  const startedRef = useRef<boolean>(false);

  // Load the game module on the client (it carries functions, so it can't be
  // passed from the server component). Only needed once a mode is chosen.
  useEffect(() => {
    if (mode === null || game || webGLOk !== true) return;
    let cancelled = false;
    const loader = gameLoader ?? gameLoaders[gameId];
    // Resolve the loader (or reject for a missing one) inside the promise chain so
    // error state is only ever set from an async callback, never synchronously in
    // the effect body (avoids React cascading-render lint rule).
    Promise.resolve()
      .then(() => {
        if (!loader) throw new Error(`No loader registered for game "${gameId}"`);
        return loader();
      })
      .then((m) => {
        if (!cancelled) setGame(m.default);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, mode, game, gameLoader, webGLOk]);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  // Fire game_start once the scene is loaded (per play). Ref resets when `loaded`
  // flips back to false on replay/retry, so each new play re-fires.
  useEffect(() => {
    if (!loaded) {
      startedRef.current = false;
      return;
    }
    if (mode && !startedRef.current) {
      startedRef.current = true;
      trackGameStart(gameId, mode);
    }
  }, [loaded, mode, gameId]);

  const toggleMute = useCallback(() => {
    setAudioPrefs({ muted: !muted });
  }, [muted]);

  const handleVolumeChange = useCallback((v: number) => {
    // Dragging the volume up is an explicit "I want sound" gesture, so unmute too.
    setAudioPrefs(v > 0 ? { volume: v, muted: false } : { volume: v });
  }, []);

  const handleLoadProgress = useCallback((f: number) => {
    setProgress(f);
    if (f >= 1) setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoaded(false);
    setProgress(0);
    setReloadKey((k) => k + 1);
  }, []);

  const handleComplete = useCallback((s: CompleteSummary) => {
    const result = recordCompletion(gameId, s);
    trackGameComplete({
      gameId,
      score: s.totalPoints,
      accuracy: s.accuracy,
      durationSec: s.durationSec,
    });
    setSummary({ ...s, isNewBest: result.isNewBest, bestScore: result.record.bestScore });
    onComplete?.(s);
  }, [gameId, onComplete]);

  /** Restart the same round in the same mode — a child should never be thrown back
   * to the mode picker after finishing a game they just chose. */
  const playAgain = useCallback(() => {
    setSummary(null);
    setScore(0);
    setControls([]);
    setStatus({});
    setFeedback(null);
    setPrompt('');
    setLoaded(false);
    setProgress(0);
    setReloadKey((k) => k + 1);
  }, []);

  const topBar = webGLOk === false ? undefined : (
    <MuteButton
      muted={muted}
      onToggle={toggleMute}
      volume={volume}
      onVolumeChange={handleVolumeChange}
    />
  );

  return (
    <GameShell title={title} breadcrumbItems={breadcrumbItems} onExit={onExit} topBar={topBar}>
      {webGLOk === false ? (
        <WebGLFallback />
      ) : error ? (
        <GameLoadError onRetry={handleRetry} />
      ) : (
        <div className="relative flex-1 min-h-0 bg-[linear-gradient(to_bottom,#cfe8ff,#fef6e4)]">
          {mode === null ? (
            <ModePicker supportedModes={supportedModes} onPick={setMode} instructions={instructions} />
          ) : (
            <>
              {(webGLOk === null || !game || !loaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                  <LoadingScene progress={game ? progress : 0} />
                </div>
              )}
              {game && webGLOk && (
                <Canvas3D
                  key={`${reloadKey}-${mode}`}
                  game={game}
                  mode={mode}
                  locale={locale}
                  isRTL={isRTL}
                  t={t}
                  gameTitle={title}
                  muted={muted}
                  volume={volume}
                  onScore={setScore}
                  onFeedback={setFeedback}
                  onPrompt={setPrompt}
                  onControls={setControls}
                  onStatus={setStatus}
                  onComplete={handleComplete}
                  onLoadProgress={handleLoadProgress}
                  onError={handleError}
                />
              )}
              <OverlayHUD score={score} feedback={feedback} prompt={prompt} instructions={instructions} controls={controls} status={status} />
              {summary && (() => {
                // Trust the game's own star count when it published one; only fall
                // back to the accuracy mapping for games that don't.
                const starCount = status.stars && status.stars > 0 ? status.stars : computeStars(summary.accuracy);
                return (
                  <div className="absolute inset-0 z-50 overflow-y-auto bg-slate-900/95 text-white animate-[fade-in_300ms_ease-out]">
                    {/* `min-h-full` + scroll on the wrapper: a landscape phone cannot fit
                        the stars, the score and the related-games row, and `justify-center`
                        on a scrolling box would clip whatever overflows the top. */}
                    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-8">
                      {summary.isNewBest && (
                        <div className="rounded-full bg-amber-500 px-4 py-1 text-sm font-bold text-slate-900 animate-bounce-in">
                          {t('newBest')}
                        </div>
                      )}
                      <p className="text-center text-xl font-black text-white md:text-2xl">
                        {tg('summary.greatJob')}
                      </p>
                      <div
                        className="flex items-center gap-1"
                        aria-label={t('stars', { count: starCount })}
                      >
                        {Array.from({ length: 3 }, (_, i) => (
                          <span
                            key={i}
                            className={`text-3xl transition-transform duration-300 ${i < starCount ? 'text-amber-300 scale-110' : 'text-slate-600 scale-100'}`}
                            aria-hidden="true"
                          >
                            {i < starCount ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-300">{tg('summary.score')}</div>
                        <div className="text-4xl font-black tabular-nums md:text-5xl">{summary.totalPoints}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm opacity-80">
                        <span>
                          {tg('summary.accuracy')}: <span className="font-semibold tabular-nums">{Math.round(summary.accuracy * 100)}%</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{Math.round(summary.durationSec)}s</span>
                        {summary.streak && summary.streak > 1 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>🔥 {t('bestStreak')}: {summary.streak}</span>
                          </>
                        )}
                      </div>
                      {!summary.isNewBest && typeof summary.bestScore === 'number' && summary.bestScore > 0 && (
                        <div className="text-sm opacity-80">
                          {t('bestScore')}: <span className="font-semibold tabular-nums">{summary.bestScore}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={playAgain}
                        aria-label={t('playAgain')}
                        className="mt-2 min-h-11 rounded-2xl bg-indigo-600 px-8 py-3 font-bold shadow-lg hover:bg-indigo-500 active:scale-95"
                      >
                        ↻ {t('playAgain')}
                      </button>
                      {relatedGames && relatedGames.length > 0 && (
                        <div className="mt-3 w-full max-w-md">
                          <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                            {t('relatedTitle')}
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {relatedGames.map((related) => (
                              <Link
                                key={related.id}
                                href={`/play/${related.id}`}
                                className="inline-flex min-h-11 items-center rounded-full border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition-colors hover:border-indigo-400 hover:bg-slate-700"
                              >
                                {related.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
