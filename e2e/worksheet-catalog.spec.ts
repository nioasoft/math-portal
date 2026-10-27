import { expect, test } from '@playwright/test';

test.use({ locale: 'he-IL' });
const cards = 'main a[data-discovery-source="worksheet_catalog"]:not([data-discovery-target="parent-help"])';
for (const [locale, query] of [['he', 'שברים'], ['en', 'fractions'], ['ar', 'الكسور'], ['de', 'Brüche'], ['es', 'fracciones'], ['ru', 'дроби'], ['zh', '分数']]) {
    test(`${locale}: search, categories, empty recovery and mobile catalog`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${locale === 'he' ? '' : `/${locale}`}/worksheet`);
        await expect(page.locator(cards)).toHaveCount(12);
        await page.locator('main summary').click();
        await expect(page.locator('main details ol')).toBeVisible();
        await page.locator('main summary').click();
        const group = page.locator('main [role="group"]');
        await group.getByRole('button').nth(1).click();
        await expect(page.locator(cards)).toHaveCount(4);
        await expect(group.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
        await page.locator('#worksheet-search').fill('zz-no-topic-987');
        await expect(page.locator(cards)).toHaveCount(0);
        await page.locator('main button').last().click();
        await expect(page.locator(cards)).toHaveCount(12);
        await expect(page.locator('#worksheet-search')).toBeFocused();
        await page.locator('#worksheet-search').fill(query);
        await expect(page.locator('main a[data-discovery-target="fractions"]')).toBeVisible();
        await expect(page.locator('main a[data-discovery-target="addition"]')).toHaveCount(0);
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        expect(errors).toEqual([]);
    });
}

test('discovery records only static identifiers after a search', async ({ page }) => {
    await page.route(/google-analytics|googletagmanager|googlesyndication/, route => route.abort());
    await page.goto('/worksheet');
    await page.evaluate(() => {
        document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: true }))};path=/`;
        window.dispatchEvent(new Event('cookieConsentUpdate'));
    });
    await page.locator('script#google-analytics').waitFor({ state: 'attached' });
    await page.evaluate(() => {
        const calls: unknown[][] = [];
        Object.assign(window, { discoveryCalls: calls, gtag: (...args: unknown[]) => calls.push(args) });
    });
    await page.locator('#worksheet-search').fill('שברים');
    await page.locator('main a[data-discovery-target="fractions"]').click();
    await expect(page).toHaveURL(/\/fractions$/);
    const events = await page.evaluate(() => (window as unknown as { discoveryCalls: unknown[][] }).discoveryCalls.filter(call => call[1] === 'discover_activity'));
    expect(events).toEqual([['event', 'discover_activity', { source: 'worksheet_catalog', target: 'fractions' }]]);
});


test('revoking consent stops activity events even when the analytics tag remains loaded', async ({ page }) => {
    await page.route(/google-analytics|googletagmanager|googlesyndication/, route => route.abort());
    await page.goto('/worksheet');
    await page.evaluate(() => {
        document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: true }))};path=/`;
        window.dispatchEvent(new Event('cookieConsentUpdate'));
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-PL0WLGMMHH'])).toBe(false);
    await page.locator('script#google-analytics').waitFor({ state: 'attached' });
    await page.evaluate(() => {
        const calls: unknown[][] = [];
        Object.assign(window, { discoveryCalls: calls, gtag: (...args: unknown[]) => calls.push(args) });
        document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: false }))};path=/`;
        window.dispatchEvent(new Event('cookieConsentUpdate'));
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-PL0WLGMMHH'])).toBe(true);
    await page.locator('main a[data-discovery-target="fractions"]').click();
    await expect(page).toHaveURL(/\/fractions$/);
    expect(await page.evaluate(() => (window as unknown as { discoveryCalls: unknown[][] }).discoveryCalls)).toEqual([]);
});
