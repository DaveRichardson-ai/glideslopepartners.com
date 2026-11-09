// Cross-browser and device checks: runs in Chromium, Firefox, WebKit (Safari's
// engine) and emulated iPhone, iPhone SE, iPad and Android devices.
import { expect, test } from '@playwright/test';
import { sitePaths, visit } from './pages';

test('every page renders and works in this browser', async ({ page, request }, info) => {
  test.setTimeout(300_000);
  const paths = await sitePaths(request);
  const problems: string[] = [];
  let target = '';
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Messages from inside Cloudflare's Turnstile iframe are third-party; we
    // cannot change that code. Anything from our own pages still fails.
    if (m.location().url.startsWith('https://challenges.cloudflare.com/')) return;
    const t = m.text();
    // The 404 page is served with status 404 by design; browsers log that status.
    if (target.includes('a-page-that-does-not-exist') && /404/.test(t)) return;
    problems.push(`${page.url()} console.error: ${t}`);
  });

  for (const path of paths) {
    target = path;
    const res = await visit(page, path);
    expect(res?.status(), path).toBe(path.includes('does-not-exist') ? 404 : 200);
    // Fonts, stylesheet and logo actually loaded and applied.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.site-header img')).toBeVisible();
    const styled = await page.evaluate(() => getComputedStyle(document.querySelector('.site-header')!).backgroundColor);
    expect(styled, `${path} stylesheet applied`).toBe('rgb(15, 28, 46)');
    const fontOk = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('600 32px "Inter Tight"') && document.fonts.check('400 17px Inter');
    });
    expect(fontOk, `${path} brand fonts loaded`).toBe(true);
    // Nothing wider than the screen.
    const vw = page.viewportSize()!.width;
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} horizontal scroll at ${vw}px in ${info.project.name}`).toBeLessThanOrEqual(vw);
    // Primary navigation is visible and tappable without JavaScript tricks.
    for (const name of ['Services', 'About', 'Talk to a partner']) {
      await expect(page.locator('header nav').getByRole('link', { name, exact: true })).toBeVisible();
    }
  }
  expect(problems).toEqual([]);
});

test('touch targets in the header and footer are at least 24 px', async ({ page }) => {
  await page.goto('/');
  const small = await page.$$eval('header a, footer a, form button', (els) =>
    els
      .map((el) => ({ t: el.textContent?.trim(), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 24 || r.width < 24))
      .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

test('form inputs are 16 px or larger, so iOS Safari does not zoom on focus', async ({ page }) => {
  await page.goto('/contact/');
  const sizes = await page.$$eval('.field input, .field select, .field textarea', (els) =>
    els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
});

test('contact form submits successfully in this browser', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 30_000 });
  await page.fill('#contact-name', 'Browser Test');
  await page.fill('#contact-email', 'test@example.com');
  await page.fill('#contact-message', 'Cross-browser check of the contact form.');
  await page.waitForTimeout(3100);
  await page.locator('form[data-contact-form] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/contact\/thanks\/$/, { timeout: 20_000 });
});

test('brand sting video is served in a format this browser can play', async ({ page, request }, info) => {
  await page.goto('/about/');
  const video = page.locator('#name video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('playsinline', '');
  const src = await page.locator('#name video source').getAttribute('src');
  // Byte-range support is required for video on iOS Safari (served by functions/media).
  const ranged = await request.get(src!, { headers: { Range: 'bytes=0-1023' } });
  expect(ranged.status()).toBe(206);
  expect(ranged.headers()['content-type']).toBe('video/mp4');
  expect(ranged.headers()['content-range']).toMatch(/^bytes 0-1023\/\d+$/);
  expect((await ranged.body()).length).toBe(1024);
  // Playwright's own Firefox and Windows/Linux WebKit builds ship without the
  // licensed H.264 decoder that real Firefox, Safari and iOS include, so only
  // engines with it are asked to play.
  const canPlay = await page.evaluate(() =>
    document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'),
  );
  if (!canPlay) {
    test.info().annotations.push({ type: 'note', description: `${info.project.name}: test build lacks H.264; playback not exercised` });
    return;
  }
  const state = await page.evaluate(async () => {
    const v = document.querySelector<HTMLVideoElement>('#name video')!;
    v.muted = true;
    let err = '';
    try {
      await v.play();
    } catch (e) {
      err = String(e);
    }
    await new Promise((r) => setTimeout(r, 1500));
    return { t: v.currentTime, ready: v.readyState, err, media: v.error?.message ?? '' };
  });
  // Every engine must decode the file with no media error.
  expect(state.media, JSON.stringify(state)).toBe('');
  expect(state.err, JSON.stringify(state)).toBe('');
  expect(state.ready, JSON.stringify(state)).toBeGreaterThanOrEqual(3);
  // Headless WebKit decodes but does not advance the media clock, so playback
  // progress is checked in Chromium-based browsers only.
  if (info.project.use.defaultBrowserType === 'chromium') expect(state.t, JSON.stringify(state)).toBeGreaterThan(0.5);
});
