import { describe, expect, it } from 'vitest';
import sitemap from '../sitemap';
import { GAME_IDS } from '@/lib/games3d/games/loaders';

describe('sitemap', () => {
  it('includes every 3D game page in the default and English locales', async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));

    for (const gameId of GAME_IDS) {
      expect(urls.has(`https://www.tirgul.net/play/${gameId}`)).toBe(true);
      expect(urls.has(`https://www.tirgul.net/en/play/${gameId}`)).toBe(true);
    }
  });
});
