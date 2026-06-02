'use client';

import { useEffect, useRef } from 'react';
import {
  createSceneEngine,
  SceneEngineInstance,
  SceneEngineOptions,
} from '@/lib/games3d/engine/SceneEngine';
import type { Game3D, CompleteSummary, FeedbackEvent, ControlButton, GameStatus } from '@/lib/games3d/types';

interface Props {
  game: Game3D;
  locale: string;
  isRTL: boolean;
  mode: import('@/lib/games3d/types').GameMode3D;
  /** In-game translator (scoped to the `games3d` namespace). */
  t: (key: string, params?: Record<string, string | number>) => string;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
        : false;

    const factory = engineFactory ?? createSceneEngine;
    let engine: SceneEngineInstance;
    try {
      engine = factory({
        canvas,
        locale,
        isRTL,
        mode,
        t,
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

    engine.start(game).catch((err) => onError?.(err));

    return () => {
      unsubScore();
      unsubFeedback();
      unsubPrompt();
      unsubControls();
      unsubStatus();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none select-none"
      aria-label={`Game canvas: ${game.meta.id}`}
    />
  );
}
