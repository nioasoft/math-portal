'use client';

import { useEffect, useRef } from 'react';
import {
  createSceneEngine,
  SceneEngineInstance,
  SceneEngineOptions,
} from '@/lib/games3d/engine/SceneEngine';
import type { Game3D, CompleteSummary, FeedbackEvent } from '@/lib/games3d/types';

interface Props {
  game: Game3D;
  locale: string;
  isRTL: boolean;
  onComplete?: (summary: CompleteSummary) => void;
  onScore?: (score: number) => void;
  onFeedback?: (event: FeedbackEvent) => void;
  onLoadProgress?: (fraction: number) => void;
  onError?: (err: unknown) => void;
  /** For testing: inject a fake engine factory. */
  engineFactory?: (opts: SceneEngineOptions) => SceneEngineInstance;
}

export function Canvas3D({
  game,
  locale,
  isRTL,
  onComplete,
  onScore,
  onFeedback,
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

    engine.start(game).catch((err) => onError?.(err));

    return () => {
      unsubScore();
      unsubFeedback();
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
