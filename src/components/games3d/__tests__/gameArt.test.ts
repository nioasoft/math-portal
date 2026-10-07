import { describe, it, expect } from 'vitest';
import { GAME_IDS } from '@/lib/games3d/games/loaders';
import { GAME_ART, gameArt } from '../gameArt';
import { TOPIC_ORDER } from '../topicMeta';

describe('gameArt', () => {
  it('has explicit art for every game, and none for a game that no longer exists', () => {
    // The map is hand-maintained; without this a new game would silently fall
    // back to its topic glyph and re-create the "every arithmetic game looks the
    // same" problem the per-game art exists to fix.
    const missing = [...GAME_IDS].filter((id) => !GAME_ART[id]).sort();
    const stale = Object.keys(GAME_ART).filter((id) => !GAME_IDS.includes(id)).sort();
    expect({ missing, stale }).toEqual({ missing: [], stale: [] });
  });

  it('gives every topic a fallback', () => {
    for (const topic of TOPIC_ORDER) {
      const art = gameArt('unknown-game', topic);
      expect(art.icon).toBeTruthy();
      expect(art.from).toMatch(/^#[0-9a-f]{6}$/i);
      expect(art.to).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to misc art for an unknown topic', () => {
    expect(gameArt('unknown-game', 'not-a-topic')).toEqual(gameArt('unknown-game', 'misc'));
  });
});
