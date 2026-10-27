import { expect, test } from '@playwright/test';

test.use({ locale: 'he-IL' });
for (const locale of ['', '/en', '/ar', '/de', '/es', '/ru', '/zh']) {
    test(`home ${locale || 'he'}: direct activity choices and grade discovery on mobile`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${locale}/`);
        const worksheets = page.locator('main [data-discovery-target="worksheets"]');
        const games = page.locator('main [data-discovery-target="games"]');
        await expect(worksheets).toHaveAttribute('href', `${locale}/worksheet`);
        await expect(games).toHaveAttribute('href', `${locale}/play`);
        await expect(page.locator('main [data-discovery-target^="grade-"]')).toHaveCount(6);
        const gradePosition = await page.locator('main [data-discovery-target="grade-1"]').evaluate(el => el.getBoundingClientRect().top);
        const topicsPosition = await page.locator('#generators').evaluate(el => el.getBoundingClientRect().top);
        expect(gradePosition).toBeLessThan(topicsPosition);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await worksheets.click();
        await expect(page).toHaveURL(new RegExp(`${locale}/worksheet$`));
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test('home starts games and arithmetic without an intermediate grade page', async ({ page }) => {
    await page.goto('/');
    await page.locator('main [data-discovery-target="games"]').click();
    await expect(page).toHaveURL(/\/play$/);
    await page.goto('/');
    await page.locator('main [data-discovery-target="worksheet-topic-0"]').click();
    await expect(page).toHaveURL(/\/worksheet\/math\?op=add&range=20$/);
    await expect(page.locator('.worksheet-problem').first()).toBeVisible();
});
