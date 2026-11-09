// Finds dead external links in the built site (from a lychee JSON report) and
// fixes the source: swaps each for a Wayback Machine snapshot if one exists,
// otherwise removes the link and keeps its text. The workflow turns any
// changes into a pull request labelled auto-fix.
//   node scripts/ops/dead-links.mjs lychee.json
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setOutput, summary } from './lib.mjs';

const report = JSON.parse(readFileSync(process.argv[2] || 'lychee.json', 'utf8'));
const failing = new Set();
for (const list of Object.values(report.error_map ?? report.fail_map ?? {})) {
  for (const e of list) {
    const url = e.url ?? e.uri;
    // Only hard failures: 404/410, or the host no longer resolves.
    const code = e.status?.code;
    const text = JSON.stringify(e.status ?? '');
    if (/^https?:\/\//.test(url) && !url.includes('glideslopepartners.com') && (code === 404 || code === 410 || /dns|resolve|No such host|certificate/i.test(text))) {
      failing.add(url);
    }
  }
}

if (!failing.size) {
  await summary('No dead external links.');
  setOutput('changed', 'false');
  process.exit(0);
}

async function snapshot(url) {
  try {
    const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
    const j = await res.json();
    const s = j.archived_snapshots?.closest;
    return s?.available && s.status === '200' ? s.url.replace(/^http:/, 'https:') : null;
  } catch {
    return null;
  }
}

const sources = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(md|astro|ts)$/.test(p)) sources.push(p);
  }
};
walk('src');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lines = [];
for (const url of failing) {
  const archived = await snapshot(url);
  let touched = 0;
  for (const f of sources) {
    let s = readFileSync(f, 'utf8');
    if (!s.includes(url)) continue;
    const before = s;
    if (archived) {
      s = s.split(url).join(archived);
    } else {
      // Markdown [text](url) -> text ; HTML <a href="url" ...>text</a> -> text
      s = s.replace(new RegExp(`\\[([^\\]]+)\\]\\(${esc(url)}\\)`, 'g'), '$1');
      s = s.replace(new RegExp(`<a[^>]*href="${esc(url)}"[^>]*>([\\s\\S]*?)</a>`, 'g'), '$1');
    }
    if (s !== before) {
      writeFileSync(f, s);
      touched++;
    }
  }
  lines.push(`- ${url} → ${archived ? `archived copy ${archived}` : 'no archived copy; link removed, text kept'} (${touched} file${touched === 1 ? '' : 's'})`);
}

const body = `Dead external links found by the daily check:\n\n${lines.join('\n')}\n\nCI checks this pull request like any other. Review the replacements before merging.`;
writeFileSync('dead-links-pr.md', body);
await summary(body);
setOutput('changed', 'true');
