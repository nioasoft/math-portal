import { test, expect } from '@playwright/test';
import { GAME_IDS } from '../src/lib/games3d/games/loaders';

test.describe('3D games', () => {
  test('all games are listed on /play', async ({ page }) => {
    await page.goto('/en/play');
    for (const id of GAME_IDS) {
      await expect(page.locator(`a[href$="/play/${id}"]`)).toBeVisible();
    }
  });

  for (const id of GAME_IDS) {
    test(`${id}: loads, shows mode picker, enters practice`, async ({ page }) => {
      await page.goto(`/en/play/${id}`);
      const practice = page.getByRole('button', { name: 'Practice' });
      await expect(practice).toBeVisible();
      await practice.click();
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    });
  }

  test('game pages expose crawlable content and structured data', async ({ page }) => {
    await page.goto('/en/play/fraction-build');
    await expect(page.getByRole('heading', { level: 2, name: 'Fraction Builder' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What students practice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Common questions' })).toBeVisible();

    const structuredData = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
      nodes.map((node) => JSON.parse(node.textContent ?? '{}') as { '@type'?: string })
    );
    expect(structuredData.some((entry) => entry['@type'] === 'LearningResource')).toBe(true);
    expect(structuredData.some((entry) => entry['@type'] === 'FAQPage')).toBe(true);
  });
});
