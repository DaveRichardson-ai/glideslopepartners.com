import { expect, test } from '@playwright/test';

const fill = async (page: import('@playwright/test').Page, prefix: string) => {
  await page.fill(`#${prefix}-name`, 'Test Person');
  await page.fill(`#${prefix}-organisation`, 'Test Co');
  await page.fill(`#${prefix}-email`, 'test@example.com');
  await page.selectOption(`#${prefix}-stage`, 'Pre-signing');
  await page.fill(`#${prefix}-message`, 'This is an automated test of the contact form.');
};

test('contact form: a valid enquiry reaches the thank-you page', async ({ page }) => {
  await page.goto('/contact/');
  // Cloudflare's always-pass test key renders and resolves the widget.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await fill(page, 'contact');
  await page.waitForTimeout(3100); // minimum time-to-submit
  await page.click('form[data-contact-form] button[type="submit"]');
  await expect(page).toHaveURL(/\/contact\/thanks\/$/);
  await expect(page.locator('h1')).toHaveText('Thank you. A partner will reply.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});

test('contact form: without JavaScript it shows an accessible error summary', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const base = test.info().project.use.baseURL!;
  await page.goto(new URL('/contact/', base).href);
  await expect(page.locator('#form-errors')).toBeHidden();
  await fill(page, 'contact');
  await page.click('form[data-contact-form] button[type="submit"]');
  await expect(page).toHaveURL(/\/contact\/\?error=spam-check/);
  const summary = page.locator('#form-errors');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('role', 'alert');
  await expect(page.locator('#form-errors-text')).toContainText('spam check');
  expect(await page.title()).toMatch(/^Error: /);
  await ctx.close();
});

test('contact API: honeypot submissions are dropped quietly', async ({ request }) => {
  const res = await request.post('/api/contact', {
    form: { name: 'Bot', email: 'bot@example.com', message: 'x'.repeat(30), website: 'http://spam', t: String(Date.now() - 10_000) },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers()['location']).toContain('/contact/thanks/');
});

test('contact API: validation errors redirect back with a code', async ({ request }) => {
  const t = String(Date.now() - 10_000);
  const cases: [Record<string, string>, string][] = [
    [{ name: '', email: 'a@b.co', message: 'x'.repeat(30), t }, 'error=name'],
    [{ name: 'A', email: 'not-an-email', message: 'x'.repeat(30), t }, 'error=email'],
    [{ name: 'A', email: 'a@b.co', message: 'too short', t }, 'error=message'],
    [{ name: 'A', email: 'a@b.co', message: 'x'.repeat(30), t: String(Date.now()) }, 'error=too-fast'],
    [{ name: 'A', email: 'a@b.co', message: 'x'.repeat(30), t }, 'error=spam-check'],
  ];
  for (const [form, expected] of cases) {
    const res = await request.post('/api/contact', { form, maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()['location']).toContain(expected);
  }
  expect((await request.get('/api/contact')).status()).toBe(405);
});

test('home page form loads the spam check only when someone starts filling it in', async ({ page }) => {
  const turnstile: string[] = [];
  page.on('request', (r) => r.url().includes('challenges.cloudflare.com') && turnstile.push(r.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(turnstile).toEqual([]);
  await page.focus('#home-name');
  await expect(page.locator('#contact input[name="cf-turnstile-response"]')).toHaveCount(1, { timeout: 20_000 });
});

test('event beacon accepts tracked clicks and rejects junk', async ({ request }) => {
  const ua = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 Safari/537.36' };
  const ok = await request.post('/api/event', { headers: ua, data: { e: 'cta', p: '/', l: 'hero', b: 1 } });
  expect(ok.status()).toBe(204);
  const junk = await request.post('/api/event', { headers: ua, data: 'not json' });
  expect(junk.status()).toBe(204);
});
