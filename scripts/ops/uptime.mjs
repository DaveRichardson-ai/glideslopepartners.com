// Hourly uptime check of / and /contact/: status 200, expected text present,
// response under 1 second. Two consecutive failures open an issue and email
// the owner. The previous run's result is passed in as a file.
//   node scripts/ops/uptime.mjs previous/uptime.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { openIssue, sendMail, SITE, summary } from './lib.mjs';

const CHECKS = [
  { path: '/', text: 'Deal value is decided between the data room and Day 1.' },
  { path: '/contact/', text: 'Talk to a partner.' },
];
const LIMIT_MS = 1000;

async function check({ path, text }) {
  // One retry for a single slow or dropped request, so a blip is not an outage.
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = performance.now();
    try {
      const res = await fetch(SITE + path, { headers: { 'User-Agent': 'GlideslopeUptime/1.0', 'Cache-Control': 'no-cache' } });
      const body = await res.text();
      const ms = Math.round(performance.now() - t0);
      last = { path, status: res.status, ms, textFound: body.includes(text) };
      last.ok = res.status === 200 && last.textFound && ms < LIMIT_MS;
    } catch (e) {
      last = { path, status: 0, ms: Math.round(performance.now() - t0), textFound: false, ok: false, error: e.message };
    }
    if (last.ok) break;
  }
  return last;
}

const results = await Promise.all(CHECKS.map(check));
const ok = results.every((r) => r.ok);
const prevFile = process.argv[2];
const previous = prevFile && existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, 'utf8')) : null;
const consecutive = ok ? 0 : (previous?.consecutiveFailures ?? 0) + 1;
writeFileSync('uptime.json', JSON.stringify({ at: new Date().toISOString(), ok, consecutiveFailures: consecutive, results }, null, 2));

const table = [
  '| Page | Status | Time | Text present | Result |',
  '| --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.path} | ${r.status || r.error} | ${r.ms} ms | ${r.textFound ? 'yes' : 'no'} | ${r.ok ? 'OK' : 'FAIL'} |`),
].join('\n');
await summary(`### Uptime ${ok ? 'OK' : `FAILED (${consecutive} in a row)`}\n\n${table}`);

if (consecutive === 2) {
  const body = `${SITE} failed its uptime check twice in a row (an hour apart).\n\n${table}\n\nCheck the Cloudflare Pages dashboard and the latest deploy. This issue closes itself when the site recovers.`;
  await openIssue('Uptime: site failing checks', body, ['uptime-incident', 'needs-human']);
  await sendMail({ to: process.env.ALERT_RECIPIENTS || process.env.REPORT_RECIPIENTS, subject: `Glideslope website is failing uptime checks`, text: body });
}
if (ok && (previous?.consecutiveFailures ?? 0) >= 2) {
  const { gh } = await import('./lib.mjs');
  const open = (await gh('/repos/{repo}/issues?state=open&labels=uptime-incident')) ?? [];
  for (const i of open) {
    await gh(`/repos/{repo}/issues/${i.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `Recovered at ${new Date().toISOString()}.\n\n${table}` }) });
    await gh(`/repos/{repo}/issues/${i.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
  }
}
process.exit(ok ? 0 : 1);
