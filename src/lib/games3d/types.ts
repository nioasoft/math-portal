import * as THREE from 'three';

// =========== Topic & metadata ============

export type GameTopic3D =
  | 'geometry'
  | 'arithmetic'
  | 'fractions'
  | 'percentage'
  | 'decimals'
  | 'ratio'
  | 'series'
  | 'units'
  | 'wordProblems'
  | 'misc';

export type GameMode3D = 'practice' | 'quiz';

export interface AssetManifest {
  textures?: Record<string, string>;
  models?: Record<string, string>;
  audio?: Record<string, string>;
}

export interface GameMeta {
  id: string;
  i18nKey: string;
  topic: GameTopic3D;
  difficulty: 1 | 2 | 3 | 4 | 5;
  gradeRange: [number, number];
  estimatedSeconds: number;
  assets?: AssetManifest;
  supportedModes: GameMode3D[];
}

// =========== Game contract ============

export interface Game3D {
  meta: GameMeta;
  init(ctx: SceneContext): GameInstance;
}

export interface GameInstance {
  onFrame?(dt: number, elapsed: number): void;
  onResize?(width: number, height: number): void;
  onPause?(): void;
  onResume?(): void;
  onQualityDowngrade?(level: 'low'): void;
  dispose(): void;
}

// =========== SceneContext ============

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  input: InputAdapter;
  audio: AudioManager;
  assets: AssetCache;
  locale: string;
  isRTL: boolean;
  mode: GameMode3D;
  prefersReducedMotion: boolean;
  score: ScoreController;
  feedback: FeedbackController;
  /** Persistent question prompt — stays on screen until replaced/cleared. */
  prompt: PromptController;
  complete(summary: CompleteSummary): void;
  presets: {
    camera: CameraPresetsAPI;
    lighting: LightingPresetsAPI;
  };
  debug: DebugAPI | null;
}

export interface CompleteSummary {
  totalPoints: number;
  accuracy: number;
  durationSec: number;
  streak?: number;
}

// =========== Controllers ============

export interface ScoreController {
  add(points: number): void;
  set(value: number): void;
  reset(): void;
  get(): number;
}

export type FeedbackKind = 'correct' | 'wrong' | 'hint';

export interface FeedbackEvent {
  kind: FeedbackKind;
  message?: string;
  at: number;
}

export interface FeedbackController {
  correct(message?: string): void;
  wrong(message?: string): void;
  hint(message: string): void;
}

/**
 * Persistent prompt channel — unlike {@link FeedbackController}, the text set
 * here stays on screen until replaced or cleared (not auto-dismissed).
 */
export interface PromptController {
  set(text: string): void;
  clear(): void;
}

// =========== Input ============

export type Unsubscribe = () => void;

export interface PointerInfo {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  picked: THREE.Object3D | null;
}

export type InputEventMap = {
  tap: PointerInfo;
  dragStart: PointerInfo;
  drag: PointerInfo;
  dragEnd: PointerInfo;
  pinch: number;
  rotate: number;
  key: string;
};

export interface InputAdapter {
  on<K extends keyof InputEventMap>(
    event: K,
    handler: (payload: InputEventMap[K]) => void
  ): Unsubscribe;
  pickAt(x: number, y: number): THREE.Intersection[];
}

// =========== Audio ============

export type SharedSfxKey = 'success' | 'fail' | 'click';

export interface AudioManager {
  play(key: SharedSfxKey): void;
  play(key: string, url: string): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  preload(key: string, url: string): Promise<void>;
}

// =========== Assets ============

export interface AssetCache {
  texture(key: string): THREE.Texture;
  model(key: string): THREE.Object3D;
  has(key: string): boolean;
}

// =========== Presets ============

export interface CameraPresetsAPI {
  orbit(target: THREE.Vector3, distance: number): void;
  topDown(target: THREE.Vector3, distance: number): void;
  locked(position: THREE.Vector3, lookAt: THREE.Vector3): void;
}

export interface LightingPresetsAPI {
  daylight(scene: THREE.Scene): void;
  soft(scene: THREE.Scene): void;
  dramatic(scene: THREE.Scene): void;
}

// =========== Debug ============

export interface DebugAPI {
  logTrackedResources(): void;
}

// =========== Performance ============

export type QualityLevel = 'high' | 'medium' | 'low';

export interface PerformanceSample {
  fps: number;
  timestamp: number;
}
