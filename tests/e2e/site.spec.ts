import { expect, test } from '@playwright/test';

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
};

test('security headers on every response type', async ({ request }) => {
  // Static files, pages behind a Function (contact), and responses a Function creates.
  const cases: [string, 'get' | 'post'][] = [
    ['/', 'get'], ['/services/', 'get'], ['/contact/', 'get'], ['/contact/?error=email', 'get'], ['/sitemap.xml', 'get'],
    ['/robots.txt', 'get'], ['/favicon.svg', 'get'], ['/media/glideslope-brand-sting-v1.mp4', 'get'], ['/api/event', 'get'], ['/api/contact', 'post'],
  ];
  for (const [path, method] of cases) {
    const res = method === 'get' ? await request.get(path, { maxRedirects: 0 }) : await request.post(path, { form: { name: '' }, maxRedirects: 0 });
    const h = res.headers();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(h[name], `${path} ${name}`).toBe(value);
    expect(h['content-security-policy'], path).toContain("default-src 'self'");
    expect(h['content-security-policy'], path).not.toContain('unsafe-inline');
  }
});

test('old Figma Sites URLs redirect with 301', async ({ request }) => {
  const map = {
    '/what-we-do': '/services/',
    '/who-we-are': '/about/',
    '/get-in-touch': '/contact/',
    '/privacy_policy': '/privacy/',
    '/index.html': '/',
  };
  for (const [from, to] of Object.entries(map)) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(new URL(res.headers()['location']!, 'http://x').pathname, from).toBe(to);
  }
});

test('hashed assets are cached for a year', async ({ request, page }) => {
  await page.goto('/');
  const css = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
  const res = await request.get(css!);
  expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

test('robots.txt points at the sitemap; noindex pages are not in it', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://glideslopepartners.com/sitemap.xml');
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).not.toContain('/contact/thanks/');
  expect(xml).not.toContain('404');
  for (const p of ['/', '/services/', '/about/', '/contact/', '/privacy/']) {
    expect(xml).toContain(`<loc>https://glideslopepartners.com${p}</loc>`);
  }
});

test('security.txt is served', async ({ request }) => {
  const txt = await (await request.get('/.well-known/security.txt')).text();
  expect(txt).toContain('Contact: mailto:hello@glideslopepartners.com');
  const exp = new Date(txt.match(/Expires: (.+)/)![1]!);
  expect(exp.getTime()).toBeGreaterThan(Date.now() + 300 * 864e5);
});

test('Insights lists published articles; scheduled ones wait for their date', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('header a[href="/insights/"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/insights/"]')).toHaveCount(1);
  expect((await request.get('/insights/')).status()).toBe(200);
  expect((await request.get('/insights/wealth-re-entry/')).status()).toBe(200);
  expect((await request.get('/rss.xml')).status()).toBe(200);
  expect((await request.get('/insights/tsa-material-arrangement/')).status()).toBe(200);
  expect((await request.get('/insights/stranded-cost/')).status()).toBe(200);
  // Scheduled for 12 November 2026: not built before then.
  if (new Date() < new Date('2026-11-11T13:00:00Z')) {
    expect((await request.get('/insights/advice-reforms-bank-re-entry/')).status()).toBe(404);
  }
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('/insights/wealth-re-entry/');
});

test('every page has a unique title of 60 characters or fewer and a description of 155 or fewer', async ({ page, request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  const titles = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    const title = await page.title();
    const desc = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(title.length, `${p} title "${title}"`).toBeLessThanOrEqual(60);
    expect(title, p).toMatch(/ — Glideslope Partners$/);
    expect(desc.length, `${p} description`).toBeGreaterThan(50);
    expect(desc.length, `${p} description`).toBeLessThanOrEqual(155);
    expect(titles.has(title), `${p} duplicate title`).toBe(false);
    titles.add(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://glideslopepartners.com${p}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-AU');
  }
});
