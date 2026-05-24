import { describe, it, expect, afterEach } from 'vitest';
import { gameRegistry, registerGame, getGame, listGames } from '../registry';
import type { Game3D } from '../types';

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

  it('throws when registering duplicate id', () => {
    const g: Game3D = {
      meta: {
        id: 'dup',
        i18nKey: 'x',
        topic: 'misc',
        difficulty: 1,
        gradeRange: [1, 6],
        estimatedSeconds: 10,
        supportedModes: ['practice'],
      },
      init: () => ({ dispose: () => {} }),
    };
    registerGame(g);
    expect(() => registerGame(g)).toThrow(/already registered/);
  });
});
