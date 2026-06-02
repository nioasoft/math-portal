import * as THREE from 'three';
import type { Game3D, GameInstance, CompleteSummary, ScoreController } from '../types';
import { createInputAdapter, InputAdapterInstance } from './InputAdapter';
import { createAudioManager, preloadSharedSfx } from './AudioManager';
import { createAssetLoader, AssetLoaderInstance } from './AssetLoader';
import { createCameraPresets } from './CameraPresets';
import { createLightingPresets } from './LightingPresets';
import {
  createSceneContext,
  createScoreController,
  createFeedbackController,
  createPromptController,
  createControlsController,
  createStatusController,
  ObservableScore,
  ObservableFeedback,
  ObservablePrompt,
  ObservableControls,
  ObservableStatus,
} from './SceneContext';
import { createPerformanceMonitor } from './PerformanceMonitor';
import { tweenGroup } from '../kit/juice';

export interface SceneEngineOptions {
  canvas: HTMLCanvasElement;
  /** Allow renderer injection for testing; in production omit and let engine create one. */
  renderer?: THREE.WebGLRenderer;
  locale: string;
  isRTL: boolean;
  mode?: import('../types').GameMode3D;
  prefersReducedMotion?: boolean;
  /** In-game translator (scoped to the `games3d` namespace) threaded from the React shell. */
  t: (key: string, params?: Record<string, string | number>) => string;
  onComplete?: (summary: CompleteSummary) => void;
  onLoadProgress?: (fraction: number) => void;
}

export interface SceneEngineInstance {
  start(game: Game3D): Promise<void>;
  pause(): void;
  resume(): void;
  dispose(): void;
  getScoreController(): ScoreController;
  subscribeScore(observer: (newValue: number) => void): () => void;
  subscribeFeedback: ObservableFeedback['subscribe'];
  subscribePrompt: ObservablePrompt['subscribe'];
  subscribeControls: ObservableControls['subscribe'];
  subscribeStatus: ObservableStatus['subscribe'];
  _debug(): {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  };
}

export function createSceneEngine(opts: SceneEngineOptions): SceneEngineInstance {
  const scene = new THREE.Scene();
  const width = opts.canvas.clientWidth || opts.canvas.width || 800;
  const height = opts.canvas.clientHeight || opts.canvas.height || 600;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

  const renderer =
    opts.renderer ??
    new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Soft shadows + filmic tone mapping for the warm "clay" look. The kit sets up
  // a single shadow-casting light to keep this cheap (see kit/scene.ts).
  // Guarded so injected fake renderers (tests) without these fields don't break.
  if ('shadowMap' in renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  if ('toneMapping' in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }

  const input: InputAdapterInstance = createInputAdapter(opts.canvas, camera, scene);
  const audio = createAudioManager();
  const assetLoader: AssetLoaderInstance = createAssetLoader();
  const cameraPresets = createCameraPresets(camera);
  const lightingPresets = createLightingPresets();
  const score: ObservableScore = createScoreController();
  const feedback: ObservableFeedback = createFeedbackController();
  const prompt: ObservablePrompt = createPromptController();
  const controls: ObservableControls = createControlsController();
  const status: ObservableStatus = createStatusController();

  let game: Game3D | null = null;
  let instance: GameInstance | null = null;
  let rafId: number | null = null;
  let lastTime = 0;
  let startTime = 0;
  let isRunning = false;
  let isPaused = false;
  let disposed = false;
  let pixelRatio = renderer.getPixelRatio?.() ?? 1;

  const perfMonitor = createPerformanceMonitor({
    onLowFps: () => {
      instance?.onQualityDowngrade?.('low');
      if (pixelRatio > 0.75) {
        pixelRatio = 0.75;
        renderer.setPixelRatio?.(pixelRatio);
      }
    },
  });

  function loop(now: number): void {
    if (!isRunning || isPaused || disposed) return;
    const dt = lastTime > 0 ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    const elapsed = (now - startTime) / 1000;
    // Advance kit tweens (popIn/punch/shake/tweenTo) before the game's own frame
    // logic, using the same high-res timestamp the loop already receives.
    tweenGroup.update(now);
    instance?.onFrame?.(dt, elapsed);
    renderer.render(scene, camera);
    perfMonitor.tick();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    if (rafId !== null) return;
    lastTime = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function onVisibility(): void {
    if (document.hidden) pause();
    else resume();
  }

  function onResize(): void {
    const w = opts.canvas.clientWidth || opts.canvas.width;
    const h = opts.canvas.clientHeight || opts.canvas.height;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    instance?.onResize?.(w, h);
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', pause);
  window.addEventListener('focus', resume);
  window.addEventListener('resize', onResize);

  async function start(g: Game3D): Promise<void> {
    if (game) throw new Error('SceneEngine.start: a game is already running. Dispose first.');
    game = g;

    if (g.meta.assets) {
      const manifest = g.meta.assets;
      const total =
        (manifest.textures ? Object.keys(manifest.textures).length : 0) +
        (manifest.models ? Object.keys(manifest.models).length : 0) +
        (manifest.audio ? Object.keys(manifest.audio).length : 0);
      let done = 0;
      const reportProgress = () => {
        done++;
        opts.onLoadProgress?.(total > 0 ? done / total : 1);
      };
      if (manifest.textures) {
        await assetLoader.loadTextures(manifest.textures, { onProgress: reportProgress });
      }
      if (manifest.models) {
        await assetLoader.loadModels(manifest.models, { onProgress: reportProgress });
      }
      if (manifest.audio) {
        await Promise.all(
          Object.entries(manifest.audio).map(async ([k, url]) => {
            await audio.preload(k, url);
            reportProgress();
          })
        );
      }
    }
    await preloadSharedSfx(audio);

    const ctx = createSceneContext({
      scene, camera, renderer,
      input, audio,
      assets: assetLoader.cache,
      locale: opts.locale,
      isRTL: opts.isRTL,
      mode: opts.mode ?? 'practice',
      prefersReducedMotion: opts.prefersReducedMotion ?? false,
      score, feedback, prompt, controls, status,
      t: opts.t,
      onComplete: (summary) => {
        pause();
        opts.onComplete?.(summary);
      },
      cameraPresets, lightingPresets,
    });

    instance = g.init(ctx);
    isRunning = true;
    isPaused = false;
    startTime = performance.now();
    startLoop();
    // Signal "fully loaded" once the scene is initialized. Games without an asset
    // manifest never trigger per-asset progress, so report completion here to clear
    // the loading overlay.
    opts.onLoadProgress?.(1);
  }

  function pause(): void {
    if (!isRunning || isPaused) return;
    isPaused = true;
    stopLoop();
    instance?.onPause?.();
  }

  function resume(): void {
    if (!isRunning || !isPaused) return;
    isPaused = false;
    instance?.onResume?.();
    startLoop();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    isRunning = false;
    stopLoop();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', pause);
    window.removeEventListener('focus', resume);
    window.removeEventListener('resize', onResize);
    instance?.dispose();
    instance = null;
    // Drop any in-flight kit tweens so a disposed game's objects aren't kept alive.
    tweenGroup.getAll().forEach((tw) => tw.stop());
    tweenGroup.removeAll();
    input.dispose?.();
    assetLoader.evict();
    if (!opts.renderer) renderer.dispose?.();
    game = null;
  }

  return {
    start, pause, resume, dispose,
    getScoreController: () => score,
    subscribeScore: (o) => score.subscribe(o),
    subscribeFeedback: (o) => feedback.subscribe(o),
    subscribePrompt: (o) => prompt.subscribe(o),
    subscribeControls: (o) => controls.subscribe(o),
    subscribeStatus: (o) => status.subscribe(o),
    _debug: () => ({ renderer, scene, camera }),
  };
}
