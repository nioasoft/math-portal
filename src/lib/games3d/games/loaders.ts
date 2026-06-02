import type { Game3D } from '../types';

/**
 * Lazy loaders only — NO static game imports. Importing this module (e.g. from
 * the client `Game3DShell`) must NOT pull any game's Three.js code into the
 * initial chunk; each game is its own code-split chunk fetched on demand.
 */
export const gameLoaders: Record<string, () => Promise<{ default: Game3D }>> = {
  'multiplication-array': () =>
    import('./multiplication-array/MultiplicationArrayGame').then((m) => ({ default: m.multiplicationArrayGame })),
  'measure-fill': () =>
    import('./measure-fill/MeasureFillGame').then((m) => ({ default: m.measureFillGame })),
  'fraction-build': () =>
    import('./fraction-build/FractionBuildGame').then((m) => ({ default: m.fractionBuildGame })),
  'area-perimeter': () =>
    import('./area-perimeter/AreaPerimeterGame').then((m) => ({ default: m.areaPerimeterGame })),
  'ten-frame-fill': () =>
    import('./ten-frame-fill/TenFrameFillGame').then((m) => ({ default: m.tenFrameFillGame })),
};

export const GAME_IDS = Object.keys(gameLoaders);
