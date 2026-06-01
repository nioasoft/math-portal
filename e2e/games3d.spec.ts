import { test, expect } from '@playwright/test';

const GAMES = ['multiplication-array', 'measure-fill', 'fraction-build', 'area-perimeter'];

test.describe('3D games', () => {
  test('all games are listed on /play', async ({ page }) => {
    await page.goto('/en/play');
    for (const id of GAMES) {
      await expect(page.locator(`a[href$="/play/${id}"]`)).toBeVisible();
    }
  });

  for (const id of GAMES) {
    test(`${id}: loads, shows mode picker, enters practice`, async ({ page }) => {
      await page.goto(`/en/play/${id}`);
      // Mode picker
      const practice = page.getByRole('button', { name: 'Practice' });
      await expect(practice).toBeVisible();
      await practice.click();
      // Canvas mounts
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    });
  }
});
