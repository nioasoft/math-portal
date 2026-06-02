import type { Game3D } from '../types';
import { registerGame, listGames } from '../registry';
import { multiplicationArrayGame } from './multiplication-array/MultiplicationArrayGame';
import { measureFillGame } from './measure-fill/MeasureFillGame';
import { fractionBuildGame } from './fraction-build/FractionBuildGame';
import { areaPerimeterGame } from './area-perimeter/AreaPerimeterGame';
import { tenFrameFillGame } from './ten-frame-fill/TenFrameFillGame';

/**
 * Server/registry-side catalog: the static `games` array + registration helpers.
 * This statically imports every game module (and therefore three), so it must
 * NOT be imported from the client bundle. The client uses `./loaders` (lazy
 * `() => import(...)` only) instead. Adding a game = add an entry here AND in
 * `./loaders.ts`.
 */

// Statically-imported game definitions (meta + init fn). Registered for the catalog.
const games: Game3D[] = [
  multiplicationArrayGame,
  measureFillGame,
  fractionBuildGame,
  areaPerimeterGame,
  tenFrameFillGame,
];

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
