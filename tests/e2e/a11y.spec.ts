import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { sitePaths, visit } from './pages';

test('axe: no WCAG 2.2 A/AA violations on any page', async ({ page, request }) => {
  test.setTimeout(300_000);
  const paths = await sitePaths(request);
  const found: string[] = [];
  for (const path of paths) {
    await visit(page, path);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      // The Turnstile widget is a third-party iframe we cannot change.
      .exclude('[data-turnstile-slot]')
      .analyze();
    for (const v of r.violations) found.push(`${path}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }
  expect(found).toEqual([]);
});

test('keyboard: skip link is first and moves focus to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('keyboard: focus is visible on links and buttons', async ({ page }) => {
  await page.goto('/services/');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
    });
    expect(outline).toBe(true);
  }
});

test('reduced motion: smooth scrolling is off', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(new URL('/', test.info().project.use.baseURL).href);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await ctx.close();
});
