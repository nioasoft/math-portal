'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import GameShell from '@/components/game/GameShell';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { Canvas3D } from './Canvas3D';
import { OverlayHUD } from './OverlayHUD';
import { MuteButton } from './MuteButton';
import { WebGLFallback } from './WebGLFallback';
import { LoadingScene } from './LoadingScene';
import { GameLoadError } from './GameLoadError';
import { ModePicker } from './ModePicker';
import { recordBestScore } from './completion';
import type { CompleteSummary, ControlButton, FeedbackEvent, Game3D, GameMeta, GameMode3D, GameStatus } from '@/lib/games3d/types';
import { gameLoaders } from '@/lib/games3d/games/loaders';
import { getMutePreference, setMutePreference } from '@/lib/game/storage';

interface Props {
  /** Game id — resolved to the actual Game3D module on the client (the game object
   * holds functions and cannot cross the server→client boundary). */
  gameId: string;
  /** Serializable metadata needed before the game module loads (modes, etc.). */
  meta: GameMeta;
  title: string;
  webGLAvailable: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  /** Short how-to-play text shown on the mode-picker screen (first-time UX). */
  instructions?: string;
  /** Pre-select a mode (e.g. from a `?mode=` deep link) and skip the picker. */
  initialMode?: GameMode3D;
  /** Override the registry lookup with an explicit client-side loader (e.g. the dev canary). */
  gameLoader?: () => Promise<{ default: Game3D }>;
  onComplete?: (summary: CompleteSummary) => void;
  onExit?: () => void;
}

const RTL_LOCALES = new Set(['he', 'ar']);

export function Game3DShell({
  gameId, meta, title, webGLAvailable, breadcrumbItems, instructions, initialMode, gameLoader, onComplete, onExit,
}: Props): React.ReactElement {
  const locale = useLocale();
  const isRTL = RTL_LOCALES.has(locale);
  const t = useTranslations('games3d');

  const [game, setGame] = useState<Game3D | null>(null);
  const [muted, setMuted] = useState<boolean>(() => getMutePreference());
  const supportedModes = meta.supportedModes;
  const [mode, setMode] = useState<GameMode3D | null>(
    initialMode ?? (supportedModes.length === 1 ? supportedModes[0] : null)
  );
  const [summary, setSummary] = useState<CompleteSummary | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [controls, setControls] = useState<ControlButton[]>([]);
  const [status, setStatus] = useState<GameStatus>({});
  const [progress, setProgress] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Load the game module on the client (it carries functions, so it can't be
  // passed from the server component). Only needed once a mode is chosen.
  useEffect(() => {
    if (mode === null || game) return;
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
  }, [gameId, mode, game, gameLoader]);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setMutePreference(next);
      return next;
    });
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
    recordBestScore(gameId, s.totalPoints);
    setSummary(s);
    onComplete?.(s);
  }, [gameId, onComplete]);

  const playAgain = useCallback(() => {
    setSummary(null);
    setScore(0);
    setControls([]);
    setStatus({});
    setLoaded(false);
    setProgress(0);
    setMode(initialMode ?? (supportedModes.length === 1 ? supportedModes[0] : null));
    setReloadKey((k) => k + 1);
  }, [supportedModes, initialMode]);

  const topBar = webGLAvailable ? (
    <MuteButton muted={muted} onToggle={toggleMute} />
  ) : undefined;

  return (
    <GameShell title={title} breadcrumbItems={breadcrumbItems} onExit={onExit} topBar={topBar}>
      {!webGLAvailable ? (
        <WebGLFallback />
      ) : error ? (
        <GameLoadError onRetry={handleRetry} />
      ) : (
        <div className="relative flex-1 min-h-[60vh]">
          {mode === null ? (
            <ModePicker supportedModes={supportedModes} onPick={setMode} instructions={instructions} />
          ) : (
            <>
              {(!game || !loaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                  <LoadingScene progress={game ? progress : 0} />
                </div>
              )}
              {game && (
                <Canvas3D
                  key={`${reloadKey}-${mode}`}
                  game={game}
                  mode={mode}
                  locale={locale}
                  isRTL={isRTL}
                  t={t}
                  gameTitle={title}
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
              {summary && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-900/95 text-white">
                  <div className="text-3xl font-bold">{summary.totalPoints}</div>
                  <div className="text-sm opacity-80">
                    {Math.round(summary.accuracy * 100)}% · {Math.round(summary.durationSec)}s
                  </div>
                  <button
                    type="button"
                    onClick={playAgain}
                    aria-label={t('playAgain')}
                    className="rounded-2xl bg-indigo-600 px-8 py-3 font-bold shadow-lg hover:bg-indigo-500 active:scale-95"
                  >
                    ↻
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
