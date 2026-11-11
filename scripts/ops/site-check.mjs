// Checks a deployed site: every sitemap URL returns 200, old URLs 301 to the
// right place, no internal link 404s, security headers on every response,
// robots.txt and sitemap.xml reachable, and (with --tls) the certificate has
// more than 14 days to run.
//   node scripts/ops/site-check.mjs https://glideslopepartners.com --tls
import { connect } from 'node:tls';
import { checkHeaders, REDIRECTS, SITE, summary, writeResult } from './site-check-lib.mjs';

const base = (process.argv.find((a) => a.startsWith('http')) ?? SITE).replace(/\/$/, '');
const withTls = process.argv.includes('--tls');
const problems = [];
const seen = new Map();

// A fresh Pages deployment can answer 404 from a Function route (/contact/)
// for a few seconds while it warms up, so an error is retried before it counts.
async function get(url, { retries = 3, ...opts } = {}) {
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now();
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'GlideslopeSiteCheck/1.0' }, ...opts });
    if (res.status < 400 || attempt >= retries) return { res, ms: Date.now() - t0 };
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// robots and sitemap
for (const p of ['/robots.txt', '/sitemap.xml', '/.well-known/security.txt']) {
  const { res } = await get(base + p);
  if (res.status !== 200) problems.push(`${p} returned ${res.status}`);
  problems.push(...checkHeaders(res.headers).map((h) => `${p} header ${h}`));
}
const robots = await (await fetch(base + '/robots.txt')).text();
if (!robots.includes('Sitemap: https://glideslopepartners.com/sitemap.xml')) problems.push('robots.txt does not reference the sitemap');

const xml = await (await fetch(base + '/sitemap.xml')).text();
const pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!pages.length) problems.push('sitemap.xml lists no URLs');

// every page, its headers and its internal links
const links = new Set();
for (const p of pages) {
  const { res } = await get(base + p);
  seen.set(p, res.status);
  if (res.status !== 200) {
    problems.push(`${p} returned ${res.status}`);
    continue;
  }
  problems.push(...checkHeaders(res.headers).map((h) => `${p} header ${h}`));
  const html = await res.text();
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) if (!m[1].startsWith('//')) links.add(m[1]);
}
for (const l of links) {
  if (seen.has(l) || l === '/api/contact') continue;
  const { res } = await get(base + l, { method: 'HEAD' });
  seen.set(l, res.status);
  if (res.status >= 400) problems.push(`internal link ${l} returned ${res.status}`);
}

// old Figma Sites URLs
for (const [from, to] of Object.entries(REDIRECTS)) {
  const { res } = await get(base + from);
  const loc = res.headers.get('location');
  const target = loc ? new URL(loc, base).pathname : '';
  if (res.status !== 301 || target !== to) problems.push(`${from} should 301 to ${to}; got ${res.status} ${loc ?? ''}`);
}

// unknown paths are a real 404
const { res: missing } = await get(base + '/this-page-should-not-exist-' + Date.now() + '/', { retries: 0 });
if (missing.status !== 404) problems.push(`unknown path returned ${missing.status}, not 404`);

// TLS certificate
let certDays = null;
if (withTls) {
  const host = new URL(base).hostname;
  certDays = await new Promise((resolve) => {
    const s = connect({ host, port: 443, servername: host }, () => {
      const c = s.getPeerCertificate();
      s.end();
      resolve(Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 864e5));
    });
    s.on('error', () => resolve(-1));
  });
  if (certDays < 14) problems.push(`TLS certificate for ${host} has ${certDays} days left`);
}

await summary(
  [
    `### Site check: ${base}`,
    `Pages in sitemap: ${pages.length}. Internal links checked: ${links.size}. Redirects checked: ${Object.keys(REDIRECTS).length}.`,
    certDays !== null ? `TLS certificate: ${certDays} days to expiry.` : '',
    problems.length ? `**${problems.length} problem(s):**\n${problems.map((p) => `- ${p}`).join('\n')}` : '**All checks passed.**',
  ]
    .filter(Boolean)
    .join('\n\n'),
);
writeResult('site-check.json', { base, at: new Date().toISOString(), pages: pages.length, certDays, problems });
process.exit(problems.length ? 1 : 0);
