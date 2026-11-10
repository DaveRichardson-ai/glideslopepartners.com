// Runs against the build with fixture articles published (dist-published).
import { expect, test } from '@playwright/test';

test('published: Insights appears in nav, footer, home, sitemap and RSS', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('header a[href="/insights/"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/insights/"]')).toHaveCount(1);
  await expect(page.locator('#insights .card')).toHaveCount(3);
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const p of ['/insights/', '/insights/wealth-re-entry/', '/insights/topic/regulation/']) {
    expect(xml).toContain(`https://glideslopepartners.com${p}`);
  }
  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain('<title>Putting wealth back into a bank');
});

test('published: index features the newest article; topic chips are real links', async ({ page }) => {
  await page.goto('/insights/');
  await expect(page.locator('a.feature h2')).toHaveText(/Putting wealth back into a bank/);
  await page.click('nav[aria-label="Topics"] >> text=Regulation');
  await expect(page).toHaveURL(/\/insights\/topic\/regulation\/$/);
  await expect(page.locator('a.feature h2')).toHaveText('Your TSA is a material arrangement now');
  await expect(page.locator('nav[aria-label="Topics"] [aria-current="page"]')).toHaveText('Regulation');
});

test('published: article has byline, reading time, scrollable tables, author box, related and JSON-LD', async ({ page }) => {
  await page.goto('/insights/wealth-re-entry/');
  await expect(page.locator('.byline')).toContainText('David Richardson');
  await expect(page.locator('.byline')).toContainText('3 November 2026');
  await expect(page.locator('.byline')).toContainText(/\d+ min read/);
  await expect(page.locator('figure.table-scroll')).toHaveCount(2);
  await expect(page.locator('.author-box')).toContainText('Led the AMP Advice separation');
  await expect(page.locator('.related .card')).toHaveCount(2);
  await expect(page.locator('.disclaimer')).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = ld.map((s) => JSON.parse(s)['@type']);
  expect(types).toEqual(['Article', 'BreadcrumbList']);
});
