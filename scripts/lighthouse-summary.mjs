// Summarises Lighthouse CI reports and enforces "no render-blocking third-party
// resources" (first-party CSS is expected to block render). Writes Markdown.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || '.lighthouseci/reports';
const out = process.argv[3];
const runs = readdirSync(dir).filter((f) => f.endsWith('.report.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const rows = [];
let bad = 0;
// Category scores are judged on the median run per page (as lhci's own
// assertions are), so one noisy run on a shared CI runner does not fail the build.
const scores = new Map();
for (const r of runs.sort((a, b) => a.requestedUrl.localeCompare(b.requestedUrl))) {
  const origin = new URL(r.finalDisplayedUrl || r.requestedUrl).origin;
  const s = (k) => Math.round((r.categories[k]?.score ?? 0) * 100);
  const a = r.audits;
  const blocking = ['render-blocking-insight', 'render-blocking-resources']
    .flatMap((k) => a[k]?.details?.items ?? [])
    .map((i) => i.url)
    .filter((u) => u && new URL(u).origin !== origin);
  if (blocking.length) bad++;
  const lcp = a['largest-contentful-paint']?.numericValue ?? 0;
  const cls = a['cumulative-layout-shift']?.numericValue ?? 0;
  const tbt = a['total-blocking-time']?.numericValue ?? 0;
  const path = new URL(r.requestedUrl).pathname;
  scores.set(path, [...(scores.get(path) ?? []), Math.min(s('performance'), s('accessibility'), s('best-practices'), s('seo'))]);
  rows.push(
    `| ${new URL(r.requestedUrl).pathname} | ${s('performance')} | ${s('accessibility')} | ${s('best-practices')} | ${s('seo')} | ${(lcp / 1000).toFixed(2)} s | ${cls.toFixed(3)} | ${Math.round(tbt)} ms | ${blocking.length ? blocking.join(', ') : 'none'} |`,
  );
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const [path, xs] of scores) {
  if (median(xs) < 95) {
    console.error(`${path}: median lowest category score ${median(xs)} is below 95`);
    bad++;
  }
}
const md = [
  '| Page | Perf | A11y | Best practice | SEO | LCP | CLS | TBT | Third-party render-blocking |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
].join('\n');
console.log(md);
if (out) writeFileSync(out, md + '\n');
process.exit(bad ? 1 : 0);
