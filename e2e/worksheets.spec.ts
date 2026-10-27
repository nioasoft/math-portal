import { expect, test } from '@playwright/test';

test.use({ locale: 'he-IL' });

const routes = ['worksheet/math?range=1000000', 'fractions', 'geometry', 'series', 'ratio', 'units', 'word-problems', 'decimals', 'percentage'];
for (const route of routes) {
    test(`${route}: printable pages, separate answers, mobile preview`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`/${route}`);
        await expect(page.locator('.worksheet-problem').first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(errors).toEqual([]);
        const studentPages = page.locator('.worksheet-page[data-answers="false"]');
        const initialCount = await studentPages.count();
        const before = await studentPages.allTextContents();
        await page.getByRole('button', { name: 'צרף דפי תשובות' }).click();
        await expect(page.locator('.worksheet-page[data-answers="true"]')).toHaveCount(initialCount);
        expect(await studentPages.allTextContents()).toEqual(before);
        await page.emulateMedia({ media: 'print' });
        await expect(page.getByRole('button', { name: 'הדפס', exact: true })).toBeHidden();
        const overflow = await page.locator('.worksheet-page').evaluateAll(pages => pages.flatMap(sheet => {
            const sheetRect = sheet.getBoundingClientRect();
            return [...sheet.querySelectorAll('.worksheet-problem')].filter(card => {
                const rect = card.getBoundingClientRect();
                return card.scrollWidth > card.clientWidth + 2 || rect.bottom > sheetRect.bottom || rect.right > sheetRect.right + 1;
            }).map(card => card.textContent);
        }));
        expect(overflow).toEqual([]);
        const pdf = await page.pdf({ preferCSSPageSize: true });
        expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(initialCount * 2);
        await page.emulateMedia({ media: 'screen' });
        await page.getByRole('button', { name: 'הסר דפי תשובות' }).click();
        await page.getByLabel('מספר תרגילים').selectOption({ index: 1 });
        await expect(studentPages).toHaveCount(1);
        await page.setViewportSize({ width: 390, height: 844 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await expect(page.getByRole('button', { name: 'הדפס', exact: true })).toBeVisible();
    });
}

test('invalid arithmetic URL falls back to a valid worksheet', async ({ page }) => {
    await page.goto('/worksheet/math?range=invalid&op=bad');
    await expect(page.locator('.worksheet-problem').first()).toBeVisible();
    await expect(page.locator('.worksheet-document')).not.toContainText('NaN');
    await expect(page.locator('select[aria-labelledby="range-label"]')).toHaveValue('10');
});

test('personalization, extra space, answers-only and print errors', async ({ page }) => {
    await page.goto('/worksheet/math');
    await expect(page.locator('.worksheet-problem').first()).toBeVisible();
    await page.getByLabel('כותרת אישית').fill('התרגול של נועה');
    await page.getByLabel('שם הילד או הילדה').fill('נועה');
    await expect(page.locator('.worksheet-page-header h2').first()).toHaveText('התרגול של נועה');
    await expect(page.locator('.worksheet-personal').first()).toContainText('נועה');
    const before = await page.locator('.worksheet-page').count();
    await page.getByLabel('צפיפות ההדפסה').selectOption('spacious');
    expect(await page.locator('.worksheet-page').count()).toBeGreaterThan(before);
    await page.getByRole('button', { name: 'צרף דפי תשובות' }).click();
    await page.getByLabel('הדפסת תשובות בלבד').check();
    await expect(page.locator('.worksheet-page[data-answers="false"]')).toHaveCount(0);
    await page.evaluate(() => { window.print = () => { throw new Error('Test print failure'); }; });
    await page.getByRole('button', { name: 'הדפס', exact: true }).click();
    await expect(page.locator('.worksheet-workspace [role="alert"]')).toContainText('לא הצלחנו לפתוח');
});

test('catalog and existing arithmetic bookmarks', async ({ page }) => {
    await page.goto('/worksheet');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('דפי עבודה');
    await expect(page.locator('main a[href="/fractions"]')).toHaveCount(1);
    await page.goto('/worksheet?op=sub&range=20');
    await expect(page).toHaveURL(/\/worksheet\/math\?op=sub&range=20/);
    await expect(page.locator('select[aria-labelledby="range-label"]')).toHaveValue('20');
});

for (const locale of ['en', 'ar', 'de', 'es', 'ru', 'zh']) {
    test(`${locale}: long labels, RTL/LTR and separate answer layout`, async ({ page }) => {
        await page.goto(`/${locale}/word-problems`);
        await expect(page.locator('.worksheet-problem').first()).toBeVisible();
        await expect(page.locator('.worksheet-problem').first()).not.toContainText(/[א-ת]/);
        await page.setViewportSize({ width: 390, height: 844 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await page.emulateMedia({ media: 'print' });
        expect(await page.locator('.worksheet-page').evaluateAll(pages => pages.every(p => p.scrollHeight <= p.clientHeight + 1))).toBe(true);
    });
}

for (const route of ['fractions', 'geometry', 'series', 'units']) for (const density of ['standard', 'compact']) {
    test(`${route} ${density}: all difficulty/topic variants fit their printed pages`, async ({ page }) => {
        await page.goto(`/${route}`);
        await expect(page.locator('.worksheet-problem').first()).toBeVisible();
        await page.getByRole('button', { name: 'צרף דפי תשובות' }).click();
        await page.getByLabel('מספר תרגילים').selectOption('0');
        await page.getByLabel('צפיפות ההדפסה').selectOption(density);
        const tabs = page.locator('[role="tab"]');
        const selector = page.locator('select').first();
        const isTabs = await tabs.count() > 0;
        const values = isTabs ? await tabs.allTextContents() : await selector.locator('option').evaluateAll(options => options.map(option => option.getAttribute('value') || ''));
        for (let index = 0; index < values.length; index++) {
            await page.emulateMedia({ media: 'screen' });
            if (isTabs) await tabs.nth(index).click();
            else await selector.selectOption(values[index]);
            await page.emulateMedia({ media: 'print' });
            expect(await page.locator('.worksheet-problem').evaluateAll(cards => cards.every(card => card.scrollWidth <= card.clientWidth + 2 && card.scrollHeight <= card.clientHeight + 2))).toBe(true);
            expect(await page.locator('.worksheet-page').evaluateAll(sheets => sheets.every(sheet => sheet.scrollHeight <= sheet.clientHeight + 1))).toBe(true);
        }
    });
}

test('all arithmetic operations and ranges print within page bounds', async ({ page }) => {
    for (const op of ['add', 'sub', 'mul', 'div']) {
        for (const range of [10, 20, 100, 1000, 10000, 100000, 1000000]) {
            await page.goto(`/worksheet/math?op=${op}&range=${range}`);
            await expect(page.locator('.worksheet-problem').first()).toBeVisible();
            await page.emulateMedia({ media: 'print' });
            expect(await page.locator('.worksheet-problem').evaluateAll(cards => cards.every(card => card.scrollWidth <= card.clientWidth + 2 && card.scrollHeight <= card.clientHeight + 2))).toBe(true);
        }
    }
});

for (const route of routes) {
    test(`${route}: compact density fits more exercises without print overlap`, async ({ page }) => {
        await page.goto(`/${route}`);
        await expect(page.locator('.worksheet-problem').first()).toBeVisible();
        await page.getByLabel('מספר תרגילים').selectOption('0');
        const standardCount = await page.locator('.worksheet-page').first().locator('.worksheet-problem').count();
        await page.getByLabel('צפיפות ההדפסה').selectOption('compact');
        expect(await page.locator('.worksheet-page').first().locator('.worksheet-problem').count()).toBeGreaterThan(standardCount);
        await page.getByRole('button', { name: 'צרף דפי תשובות' }).click();
        await page.emulateMedia({ media: 'print' });
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.locator('.worksheet-page').evaluateAll(sheets => sheets.flatMap(sheet => {
            const footer = sheet.querySelector('footer')!.getBoundingClientRect();
            return [...sheet.querySelectorAll('.worksheet-problem')].filter(card => {
                const rect = card.getBoundingClientRect();
                return card.scrollWidth > card.clientWidth + 2 || card.scrollHeight > card.clientHeight + 2 || rect.bottom > footer.top;
            }).map(card => card.textContent);
        }));
        expect(issues).toEqual([]);
        const pdf = await page.pdf({ preferCSSPageSize: true });
        expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(await page.locator('.worksheet-page').count());
    });
}
