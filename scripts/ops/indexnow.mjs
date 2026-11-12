// Tells Bing (and the other IndexNow search engines) which pages changed, so
// they recrawl them quickly. ChatGPT search draws largely on Bing's index.
//
//   Before a deploy: list the pages whose built HTML differs from the live site
//     node scripts/ops/indexnow.mjs changed dist indexnow-urls.txt
//   After the deploy passes its live check: submit them
//     node scripts/ops/indexnow.mjs submit indexnow-urls.txt
//   Submit every page in the live sitemap (first run, or by hand):
//     node scripts/ops/indexnow.mjs submit --all
//
// The key is public by design: IndexNow proves ownership by fetching
// /<key>.txt from the site. Changing it means renaming that file too.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, summary, warn } from './lib.mjs';

export const KEY = 'd5768351a0ab8b16050a54556b60b791';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const [mode, ...rest] = process.argv.slice(2);
const host = new URL(SITE).host;

async function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

if (mode === 'changed') {
  const [dist = 'dist', out = 'indexnow-urls.txt'] = rest;
  const urls = await sitemapUrls(readFileSync(join(dist, 'sitemap.xml'), 'utf8'));
  const changed = [];
  for (const url of urls) {
    const path = new URL(url).pathname;
    const built = readFileSync(join(dist, path, 'index.html'), 'utf8');
    const res = await fetch(new URL(path, SITE), { headers: { 'User-Agent': 'GlideslopeIndexNow/1.0' } }).catch(() => null);
    const live = res && res.ok ? await res.text() : null;
    if (live !== built) changed.push(new URL(path, SITE).href);
  }
  writeFileSync(out, changed.join('\n') + (changed.length ? '\n' : ''));
  console.log(`${changed.length} of ${urls.length} pages new or changed`);
  for (const u of changed) console.log(`  ${u}`);
} else if (mode === 'submit') {
  let urls;
  if (rest.includes('--all')) {
    urls = await sitemapUrls(await (await fetch(`${SITE}/sitemap.xml`)).text());
  } else {
    const file = rest[0] || 'indexnow-urls.txt';
    urls = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  }
  if (!urls.length) {
    await summary('No pages changed; nothing sent to IndexNow.');
    process.exit(0);
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  });
  // 200 and 202 both mean accepted (202: key validation pending).
  if (res.status === 200 || res.status === 202) {
    await summary(`Sent ${urls.length} page(s) to IndexNow (HTTP ${res.status}).`);
  } else {
    // Never fail a deploy over this; Bing still finds pages through the sitemap.
    warn(`IndexNow returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
} else {
  console.error('Usage: indexnow.mjs changed <dist> <out> | submit [file | --all]');
  process.exit(2);
}
