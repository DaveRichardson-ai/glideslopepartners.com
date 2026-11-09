import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { sitePaths, visit } from './pages';
import { isTurnstileNoise } from './third-party';

const WIDTHS = [320, 375, 768, 1024, 1440];

test('every page loads with no console errors or warnings, no failed requests', async ({ page, request }) => {
  test.setTimeout(300_000);
  const paths = await sitePaths(request);
  const problems: string[] = [];
  let target = '';
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    // Third-party Turnstile noise (see third-party.ts).
    if (isTurnstileNoise(target, m.text(), m.location().url)) return;
    // Chrome always logs the 404 status of a page served as a 404. That page must be a 404.
    if (target.includes('a-page-that-does-not-exist') && m.text().includes('status of 404')) return;
    problems.push(`${page.url()} console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    if (isTurnstileNoise(target, e.message)) return;
    problems.push(`${page.url()} pageerror: ${e.message}`);
  });
  page.on('requestfailed', (r) => {
    // Turnstile's own requests (blob: workers, challenge servers) are not page faults.
    if (/^(blob:)?https:\/\/[a-z0-9.-]*challenges\.cloudflare\.com\//.test(r.url())) return;
    problems.push(`${page.url()} request failed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    const own = new URL(r.url()).origin === new URL(page.url()).origin;
    if (own && r.status() >= 400 && !r.url().includes('a-page-that-does-not-exist')) {
      problems.push(`${page.url()} HTTP ${r.status()}: ${r.url()}`);
    }
  });

  for (const path of paths) {
    target = path;
    const res = await visit(page, path);
    const expected = path.includes('does-not-exist') ? 404 : 200;
    expect(res?.status(), path).toBe(expected);
    await expect(page.locator('h1'), `${path} has exactly one h1`).toHaveCount(1);
  }
  expect(problems).toEqual([]);
});

test('no horizontal scroll at 320, 375, 768, 1024 and 1440 px', async ({ page, request }, info) => {
  test.setTimeout(300_000);
  const paths = await sitePaths(request);
  const overflow: string[] = [];
  const shots = process.env.SCREENSHOTS === '1';
  const dir = `docs/screenshots/${info.project.name}`;
  if (shots) mkdirSync(dir, { recursive: true });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await visit(page, path);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scroll > width) overflow.push(`${path} at ${width}px: scrollWidth ${scroll}`);
      if (shots && (width === 375 || width === 1440)) {
        const name = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
        await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
      }
    }
  }
  expect(overflow).toEqual([]);
});

test('JavaScript shipped stays under 15 KB on every page except Contact', async ({ page, request }) => {
  test.setTimeout(300_000);
  const paths = (await sitePaths(request)).filter((p) => p !== '/contact/');
  const over: string[] = [];
  for (const path of paths) {
    let bytes = 0;
    const onResponse = async (r: import('@playwright/test').Response) => {
      if (r.request().resourceType() === 'script') bytes += (await r.body().catch(() => Buffer.alloc(0))).length;
    };
    page.on('response', onResponse);
    await visit(page, path);
    page.off('response', onResponse);
    if (bytes >= 15 * 1024) over.push(`${path}: ${bytes} bytes`);
  }
  expect(over).toEqual([]);
});

test('every page is reachable within two clicks of home', async ({ page, request }) => {
  const paths = (await sitePaths(request)).filter((p) => !p.includes('does-not-exist') && p !== '/contact/thanks/');
  const linksFrom = async (path: string) => {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname));
    return new Set(hrefs);
  };
  const one = await linksFrom('/');
  const two = new Set(one);
  for (const p of one) for (const q of await linksFrom(p)) two.add(q);
  const unreachable = paths.filter((p) => p !== '/' && !two.has(p));
  expect(unreachable).toEqual([]);
});
