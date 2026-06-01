import { describe, it, expect, afterEach } from 'vitest';
import { gameRegistry, registerGame, getGame, listGames } from '../registry';
import type { Game3D, GameMeta } from '../types';

describe('gameRegistry', () => {
  afterEach(() => {
    gameRegistry.clear();
  });

  it('starts empty', () => {
    expect(listGames()).toEqual([]);
  });

  it('registers and retrieves a game', () => {
    const g: Game3D = {
      meta: {
        id: 'foo',
        i18nKey: 'foo',
        topic: 'misc',
        difficulty: 1,
        gradeRange: [1, 6],
        estimatedSeconds: 10,
        supportedModes: ['practice'],
      },
      init: () => ({ dispose: () => {} }),
    };
    registerGame(g);
    expect(getGame('foo')).toBe(g);
    expect(listGames()).toContain(g);
  });

  it('is idempotent: re-registering the same id overwrites without throwing', () => {
    const meta: GameMeta = {
      id: 'dup',
      i18nKey: 'x',
      topic: 'misc',
      difficulty: 1,
      gradeRange: [1, 6],
      estimatedSeconds: 10,
      supportedModes: ['practice'],
    };
    const g1: Game3D = { meta, init: () => ({ dispose: () => {} }) };
    const g2: Game3D = { meta, init: () => ({ dispose: () => {} }) };
    registerGame(g1);
    expect(() => registerGame(g2)).not.toThrow();
    // Last registration wins; still only one entry for the id.
    expect(getGame('dup')).toBe(g2);
    expect(listGames().filter((g) => g.meta.id === 'dup')).toHaveLength(1);
  });
});
