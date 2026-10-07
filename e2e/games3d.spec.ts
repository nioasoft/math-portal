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

test.describe('3D playfield sizing', () => {
  const viewports = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
  ];

  for (const viewport of viewports) {
    test(`canvas fills its container on ${viewport.name} portrait (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/play/multiplication-array');
      const practice = page.getByRole('button', { name: 'Practice' });
      await expect(practice).toBeVisible();
      await practice.click();

      const canvas = page.locator('canvas[role="application"]');
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      // The engine re-fits once `start()` resolves and on container resize.
      await expect
        .poll(async () => {
          const box = await canvas.evaluate((el) => {
            const parent = el.parentElement as HTMLElement;
            const c = el.getBoundingClientRect();
            const p = parent.getBoundingClientRect();
            return [c.top - p.top, c.left - p.left, c.width - p.width, c.height - p.height];
          });
          return Math.max(...box.map(Math.abs));
        })
        .toBeLessThanOrEqual(2);

      const height = await canvas.evaluate((el) => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThan(viewport.height * 0.6);
    });
  }
});

test.describe('zh locale catalog', () => {
  test('/zh/play renders a fully localized catalog', async ({ page }) => {
    await page.goto('/zh/play');

    // Bare "zh" is ambiguous (Simplified vs Traditional); toHreflang emits zh-Hans.
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('数学游戏');

    // Topic chips and card copy come from games3d.json. A missing key falls back
    // to English silently, so assert the zh labels render and the en ones don't —
    // across the whole visible page, which catches shelf headings too.
    const visible = (await page.locator('body').innerText()).replace(/\s+/g, '');
    for (const label of ['算术', '分数', '几何', '小数', '百分数', '应用题']) {
      expect(visible).toContain(label);
    }
    for (const leaked of ['Arithmetic', 'Fractions', 'Geometry', 'Decimals', 'Percentages']) {
      expect(visible).not.toContain(leaked);
    }

    // Per-game titles are localized too, and the links keep the /zh prefix.
    const card = page.locator('a[href="/zh/play/multiplication-array"]').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('乘法阵列');
  });
});

test.describe('zh content pages', () => {
  // The zh corpus is hand-authored and passes the depth gate, so these routes
  // must stay indexable with a self-canonical — a future content or gate
  // regression would silently flip them back to noindex + en fallback.
  test('/zh/blog and a post render localized, indexable content', async ({ page }) => {
    await page.goto('/zh/blog');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('我们的博客');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    await page.goto('/zh/blog/table-multiplication-hacks');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/zh\/blog\/table-multiplication-hacks$/,
    );
    // FAQ blocks use the fullwidth question mark the JSON-LD extractor matches.
    await expect(page.locator('article strong', { hasText: '？' }).first()).toBeVisible();
  });

  test('/zh/help renders localized, indexable topics', async ({ page }) => {
    await page.goto('/zh/help');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('家长指南');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    await page.goto('/zh/help/fractions');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('如何教分数');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
});

test.describe('cookie banner vs playfield', () => {
  // Regression guard for the bottom sheet landing on the Check/+/− control row.
  // The banner is suppressed by pathname on /play/<id> only, so this also pins
  // the scope: it must still appear on browsing pages, or consent silently breaks.
  test.use({ viewport: { width: 390, height: 844 } });

  test('never covers in-game controls, still shows on browsing pages', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/en/play');
    const acceptAll = page.getByRole('button', { name: 'Accept All' });
    // The banner mounts 500ms after hydration once there is no stored choice.
    await expect(acceptAll).toBeVisible();

    // Client-side navigation, the real path: CookieConsent lives in the root
    // layout and stays mounted, so only its pathname guard can hide it.
    await page.locator('a[href="/en/play/multiplication-array"]').first().click();
    await expect(page).toHaveURL(/\/en\/play\/multiplication-array$/);

    await page.getByRole('button', { name: 'Practice' }).click();
    const controls = page.locator('[data-testid="controls-bar"]');
    await expect(controls).toBeVisible({ timeout: 10_000 });
    await expect(acceptAll).toHaveCount(0);

    // Nothing painted over the controls: hit-testing their centre must land
    // inside the controls bar, not on a fixed overlay above it.
    const hitInsideControls = await controls.evaluate((bar) => {
      const r = bar.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && bar.contains(hit);
    });
    expect(hitInsideControls).toBe(true);
  });
});
