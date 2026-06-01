import type { Game3D } from './types';

export const gameRegistry = new Map<string, Game3D>();

export function registerGame(game: Game3D): void {
  // Idempotent: re-registering the same id overwrites the entry rather than
  // throwing. The Map survives dev HMR while the module-level `registered`
  // flag in the catalog resets, so a throw here would break hot reloads.
  gameRegistry.set(game.meta.id, game);
}

export function getGame(id: string): Game3D | undefined {
  return gameRegistry.get(id);
}

export function listGames(): Game3D[] {
  return Array.from(gameRegistry.values());
}
