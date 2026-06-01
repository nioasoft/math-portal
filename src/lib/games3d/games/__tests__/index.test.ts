import { describe, it, expect } from 'vitest';
import { GAME_IDS, gameLoaders } from '../loaders';
import { getRegisteredGames } from '../index';

describe('games index', () => {
  it('exposes a loader for every registered game id', () => {
    for (const id of GAME_IDS) {
      expect(typeof gameLoaders[id]).toBe('function');
    }
  });

  it('GAME_IDS matches the registered games', () => {
    const registeredIds = getRegisteredGames().map((g) => g.meta.id).sort();
    expect([...GAME_IDS].sort()).toEqual(registeredIds);
  });
});
