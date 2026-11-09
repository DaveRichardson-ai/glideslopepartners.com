import type { APIRequestContext } from '@playwright/test';

/** Every indexable URL from the sitemap, as paths, plus the noindex pages. */
export async function sitePaths(request: APIRequestContext) {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  return [...paths, '/contact/thanks/', '/a-page-that-does-not-exist/'];
}

/** Load a page; on pages with an eager spam check, wait for it to finish. */
export async function visit(page: import('@playwright/test').Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'load' });
  if (path === '/contact/') {
    await page.locator('input[name="cf-turnstile-response"]').waitFor({ state: 'attached', timeout: 20_000 });
    await page.waitForTimeout(1500);
  } else {
    await page.waitForLoadState('networkidle');
  }
  return res;
}
