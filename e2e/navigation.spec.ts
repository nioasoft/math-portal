import { expect, test } from '@playwright/test';

test.use({ locale: 'he-IL' });

test('keyboard skip link moves focus into the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'דלגו לתוכן הראשי' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
});

test('mobile menu traps focus, restores it on Escape, and offers worksheets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'פתח תפריט' });
    await opener.click();
    const drawer = page.getByRole('dialog', { name: 'תפריט', exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'סגור תפריט' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(drawer.getByRole('button', { name: 'בחירת שפה' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(drawer.getByRole('button', { name: 'סגור תפריט' })).toBeFocused();
    await expect(drawer.getByRole('link', { name: 'דפי עבודה', exact: true })).toHaveAttribute('href', '/worksheet');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('resizing an open mobile menu restores desktop scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'פתח תפריט' }).click();
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect(page.locator('header nav').first().getByRole('link', { name: 'דפי עבודה', exact: true })).toBeVisible();
});

test('desktop location and grade disclosure expose their state', async ({ page }) => {
    await page.goto('/play');
    const nav = page.locator('header nav').first();
    await expect(nav.getByRole('link', { name: 'משחקים', exact: true })).toHaveAttribute('aria-current', 'page');
    const grades = nav.getByRole('button', { name: 'לפי כיתה' });
    await expect(grades).toHaveAttribute('aria-expanded', 'false');
    await grades.click();
    await expect(grades).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(grades).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('footer a[href="/worksheet"]')).toBeVisible();
});

for (const locale of ['', '/en', '/ar', '/de', '/es', '/ru', '/zh']) {
    test(`${locale || 'he'}: tablet navigation fits and exposes both activity types`, async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto(`${locale}/`);
        const nav = page.locator('header nav').first();
        await expect(nav.locator('a[data-discovery-target="worksheets"]')).toBeVisible();
        await expect(nav.locator('a[data-discovery-target="games"]')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const overlap = await page.locator('header').evaluate(header => {
            const nav = header.querySelector('nav')!.getBoundingClientRect();
            const logo = header.querySelector('a[aria-label]')!.getBoundingClientRect();
            return nav.left < logo.right && nav.right > logo.left;
        });
        expect(overlap).toBe(false);
    });
}
