import * as THREE from 'three';
import type {
  SceneContext,
  ScoreController,
  FeedbackController,
  FeedbackEvent,
  PromptController,
  ControlsController,
  ControlButton,
  CompleteSummary,
  AudioManager,
  InputAdapter,
  AssetCache,
  CameraPresetsAPI,
  LightingPresetsAPI,
  DebugAPI,
} from '../types';

// =========== ScoreController ============

export interface ObservableScore extends ScoreController {
  subscribe(observer: (newValue: number) => void): () => void;
}

export function createScoreController(): ObservableScore {
  let value = 0;
  const observers = new Set<(v: number) => void>();
  const notify = () => observers.forEach((o) => o(value));
  return {
    add(points) {
      value += points;
      notify();
    },
    set(v) {
      value = v;
      notify();
    },
    reset() {
      value = 0;
      notify();
    },
    get() {
      return value;
    },
    subscribe(o) {
      observers.add(o);
      return () => observers.delete(o);
    },
  };
}

// =========== FeedbackController ============

export interface ObservableFeedback extends FeedbackController {
  subscribe(observer: (event: FeedbackEvent) => void): () => void;
}

export function createFeedbackController(): ObservableFeedback {
  const observers = new Set<(e: FeedbackEvent) => void>();
  const emit = (e: FeedbackEvent) => observers.forEach((o) => o(e));
  return {
    correct(message) {
      emit({ kind: 'correct', message, at: Date.now() });
    },
    wrong(message) {
      emit({ kind: 'wrong', message, at: Date.now() });
    },
    hint(message) {
      emit({ kind: 'hint', message, at: Date.now() });
    },
    subscribe(o) {
      observers.add(o);
      return () => observers.delete(o);
    },
  };
}

// =========== PromptController ============

export interface ObservablePrompt extends PromptController {
  get(): string;
  subscribe(observer: (text: string) => void): () => void;
}

export function createPromptController(): ObservablePrompt {
  let text = '';
  const observers = new Set<(t: string) => void>();
  const notify = () => observers.forEach((o) => o(text));
  return {
    set(t) {
      text = t;
      notify();
    },
    clear() {
      text = '';
      notify();
    },
    get() {
      return text;
    },
    subscribe(o) {
      observers.add(o);
      return () => observers.delete(o);
    },
  };
}

// =========== ControlsController ============

export interface ObservableControls extends ControlsController {
  get(): ControlButton[];
  subscribe(observer: (buttons: ControlButton[]) => void): () => void;
}

export function createControlsController(): ObservableControls {
  let buttons: ControlButton[] = [];
  const observers = new Set<(b: ControlButton[]) => void>();
  const notify = () => observers.forEach((o) => o(buttons));
  return {
    set(b) {
      buttons = b;
      notify();
    },
    clear() {
      buttons = [];
      notify();
    },
    get() {
      return buttons;
    },
    subscribe(o) {
      observers.add(o);
      return () => observers.delete(o);
    },
  };
}

// =========== SceneContext factory ============

export interface CreateContextArgs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  input: InputAdapter;
  audio: AudioManager;
  assets: AssetCache;
  locale: string;
  isRTL: boolean;
  mode: import('../types').GameMode3D;
  prefersReducedMotion: boolean;
  score: ObservableScore;
  feedback: ObservableFeedback;
  prompt: ObservablePrompt;
  controls: ObservableControls;
  t: (key: string, params?: Record<string, string | number>) => string;
  onComplete: (summary: CompleteSummary) => void;
  cameraPresets: CameraPresetsAPI;
  lightingPresets: LightingPresetsAPI;
  debug?: DebugAPI | null;
}

export function createSceneContext(args: CreateContextArgs): SceneContext {
  return {
    scene: args.scene,
    camera: args.camera,
    renderer: args.renderer,
    input: args.input,
    audio: args.audio,
    assets: args.assets,
    locale: args.locale,
    isRTL: args.isRTL,
    mode: args.mode,
    prefersReducedMotion: args.prefersReducedMotion,
    score: args.score,
    feedback: args.feedback,
    prompt: args.prompt,
    controls: args.controls,
    t: args.t,
    complete: args.onComplete,
    presets: { camera: args.cameraPresets, lighting: args.lightingPresets },
    debug: args.debug ?? null,
  };
}
