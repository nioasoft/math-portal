import type { Game3D } from '../types';
import { registerGame, listGames } from '../registry';
import { multiplicationArrayGame } from './multiplication-array/MultiplicationArrayGame';
import { measureFillGame } from './measure-fill/MeasureFillGame';

/**
 * The single source of truth for which 3D games exist.
 * Adding a game = add one entry to BOTH maps below (id -> static game meta module
 * for the catalog, and id -> lazy loader for the dynamic route). No route files,
 * no listing edits.
 */

// Statically-imported game definitions (small — meta + init fn). Registered for the catalog.
const games: Game3D[] = [
  multiplicationArrayGame,
  measureFillGame,
];

// Lazy loaders so each game's Three.js code is its own code-split chunk.
export const gameLoaders: Record<string, () => Promise<{ default: Game3D }>> = {
  'multiplication-array': () =>
    import('./multiplication-array/MultiplicationArrayGame').then((m) => ({ default: m.multiplicationArrayGame })),
  'measure-fill': () =>
    import('./measure-fill/MeasureFillGame').then((m) => ({ default: m.measureFillGame })),
};

export const GAME_IDS = Object.keys(gameLoaders);

let registered = false;
export function ensureRegistered(): void {
  if (registered) return;
  registered = true;
  for (const g of games) registerGame(g);
}

export function getRegisteredGames(): Game3D[] {
  ensureRegistered();
  return listGames();
}
