'use client';

import { useEffect, useRef } from 'react';
import {
  createSceneEngine,
  SceneEngineInstance,
  SceneEngineOptions,
} from '@/lib/games3d/engine/SceneEngine';
import type {
  Game3D,
  GameMode3D,
  CompleteSummary,
  FeedbackEvent,
  ControlButton,
  GameStatus,
} from '@/lib/games3d/types';

type Translator = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  game: Game3D;
  locale: string;
  isRTL: boolean;
  mode: GameMode3D;
  /** In-game translator (scoped to the `games3d` namespace). */
  t: Translator;
  /** Human-readable game title for accessibility. */
  gameTitle?: string;
  /** Mirrored into the engine's audio bus so the header mute button works mid-game. */
  muted?: boolean;
  volume?: number;
  onComplete?: (summary: CompleteSummary) => void;
  onScore?: (score: number) => void;
  onFeedback?: (event: FeedbackEvent) => void;
  onPrompt?: (text: string) => void;
  onControls?: (buttons: ControlButton[]) => void;
  onStatus?: (status: GameStatus) => void;
  onLoadProgress?: (fraction: number) => void;
  onError?: (err: unknown) => void;
  /** For testing: inject a fake engine factory. */
  engineFactory?: (opts: SceneEngineOptions) => SceneEngineInstance;
}

export function Canvas3D({
  game,
  locale,
  isRTL,
  mode,
  t,
  gameTitle,
  muted,
  volume,
  onComplete,
  onScore,
  onFeedback,
  onPrompt,
  onControls,
  onStatus,
  onLoadProgress,
  onError,
  engineFactory,
}: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngineInstance | null>(null);
  // The engine captures the translator once, so route it through a ref: an in-app
  // locale switch then reaches live strings instead of tearing the scene down.
  const tRef = useRef<Translator>(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    const factory = engineFactory ?? createSceneEngine;
    let engine: SceneEngineInstance;
    try {
      engine = factory({
        canvas,
        locale,
        isRTL,
        mode,
        t: (key, params) => tRef.current(key, params),
        prefersReducedMotion,
        onComplete,
        onLoadProgress,
      });
    } catch (err) {
      onError?.(err);
      return;
    }
    engineRef.current = engine;

    const unsubScore = onScore ? engine.subscribeScore(onScore) : () => {};
    const unsubFeedback = onFeedback ? engine.subscribeFeedback(onFeedback) : () => {};
    const unsubPrompt = onPrompt ? engine.subscribePrompt(onPrompt) : () => {};
    const unsubControls = onControls ? engine.subscribeControls(onControls) : () => {};
    const unsubStatus = onStatus ? engine.subscribeStatus(onStatus) : () => {};

    let cancelled = false;
    engine
      .start(game)
      .then(() => {
        // Layout has settled by now, so fit the drawing buffer to the real CSS box.
        if (!cancelled) engine.resize();
      })
      .catch((err) => {
        if (!cancelled) onError?.(err);
      });

    // The canvas is sized by CSS, so its container — not the window — is the source
    // of truth: mobile URL-bar collapse, on-screen keyboards, orientation changes
    // and shell growth all resize the playfield without a window resize event.
    const parent = canvas.parentElement;
    const observer =
      parent && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;
            if (box && box.width > 0 && box.height > 0) engine.resize(box.width, box.height);
          })
        : null;
    if (parent && observer) observer.observe(parent);

    return () => {
      cancelled = true;
      observer?.disconnect();
      unsubScore();
      unsubFeedback();
      unsubPrompt();
      unsubControls();
      unsubStatus();
      engine.dispose();
      engineRef.current = null;
    };
  }, [
    game,
    locale,
    isRTL,
    mode,
    engineFactory,
    onComplete,
    onLoadProgress,
    onError,
    onScore,
    onFeedback,
    onPrompt,
    onControls,
    onStatus,
  ]);

  // The engine owns the audio graph and outlives a single render, so mirror the
  // shell's mute/volume state into it whenever the child changes either.
  useEffect(() => {
    const audio = engineRef.current?.getAudio();
    if (!audio) return;
    if (muted !== undefined) audio.setMuted(muted);
    if (volume !== undefined) audio.setVolume(volume);
  }, [muted, volume]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none select-none"
      role="application"
      aria-label={gameTitle ? `${gameTitle} - interactive math game` : `Game canvas: ${game.meta.id}`}
      tabIndex={0}
    />
  );
}
