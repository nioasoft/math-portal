import type { Game3D } from './types';

export const gameRegistry = new Map<string, Game3D>();

export function registerGame(game: Game3D): void {
  if (gameRegistry.has(game.meta.id)) {
    throw new Error(
      `Game with id "${game.meta.id}" is already registered`
    );
  }
  gameRegistry.set(game.meta.id, game);
}

export function getGame(id: string): Game3D | undefined {
  return gameRegistry.get(id);
}

export function listGames(): Game3D[] {
  return Array.from(gameRegistry.values());
}
