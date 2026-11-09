// Weekly report for the previous Monday–Sunday (Sydney time), compared with
// the week before. Every number comes from an API response; anything that is
// unavailable is reported as unavailable, never estimated.
//   node scripts/ops/weekly-report.mjs [lighthouse-summary.md]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveTxt } from 'node:dns/promises';
import { aeSql, cfGraphQL, cfReady, env, gh, googleToken, gsc, GSC_PROPERTY, openIssue, sendMail, SITE, sitemapUrls, summary } from './lib.mjs';

/* ---------- dates (Australia/Sydney) ---------- */
const sydToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()); // YYYY-MM-DD
const day = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dow = new Date(`${sydToday}T00:00:00Z`).getUTCDay(); // 1 = Monday
const thisMonday = day(sydToday, -((dow + 6) % 7));
const week = { start: day(thisMonday, -7), end: day(thisMonday, -1) };
const prior = { start: day(thisMonday, -14), end: day(thisMonday, -8) };
const fmt = (iso) =>
  new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const label = `${fmt(week.start)} to ${fmt(week.end)}`;

const n = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toLocaleString('en-AU'));
const delta = (a, b) => {
  if (a === null || b === null || a === undefined || b === undefined) return '';
  if (b === 0) return a === 0 ? ' (no change)' : ' (new)';
  const pct = Math.round(((a - b) / b) * 100);
  return ` (${pct > 0 ? '+' : ''}${pct}% on ${n(b)})`;
};
const unavailable = [];
const note = (what, why) => unavailable.push(`${what}: ${why}`);
const table = (head, rows) =>
  rows.length ? [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n') : '_No data._';

/* ---------- Cloudflare Web Analytics ---------- */
async function webAnalytics(range) {
  const siteTag = env('CF_WEB_ANALYTICS_SITE_TAG');
  if (!cfReady() || !siteTag) return null;
  const q = `query($a:String!,$s:String!,$from:Date!,$to:Date!){viewer{accounts(filter:{accountTag:$a}){
    total:rumPageloadEventsAdaptiveGroups(limit:1,filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count sum{visits}}
    pages:rumPageloadEventsAdaptiveGroups(limit:10,orderBy:[count_DESC],filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count dimensions{requestPath}}
    refs:rumPageloadEventsAdaptiveGroups(limit:10,orderBy:[count_DESC],filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count dimensions{refererHost}}
    countries:rumPageloadEventsAdaptiveGroups(limit:10,orderBy:[count_DESC],filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count dimensions{countryName}}
    devices:rumPageloadEventsAdaptiveGroups(limit:10,orderBy:[count_DESC],filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count dimensions{deviceType}}
  }}}`;
  const d = await cfGraphQL(q, { a: env('CLOUDFLARE_ACCOUNT_ID'), s: siteTag, from: range.start, to: range.end });
  const acc = d.viewer.accounts[0];
  let vitals = null;
  try {
    const v = await cfGraphQL(
      `query($a:String!,$s:String!,$from:Date!,$to:Date!){viewer{accounts(filter:{accountTag:$a}){
        rumWebVitalsEventsAdaptiveGroups(limit:1,filter:{siteTag:$s,date_geq:$from,date_leq:$to}){count
          quantiles{largestContentfulPaintP75 cumulativeLayoutShiftP75 interactionToNextPaintP75}}}}}`,
      { a: env('CLOUDFLARE_ACCOUNT_ID'), s: siteTag, from: range.start, to: range.end },
    );
    vitals = v.viewer.accounts[0].rumWebVitalsEventsAdaptiveGroups[0] ?? null;
  } catch (e) {
    note('Core Web Vitals', e.message.slice(0, 200));
  }
  return {
    pageViews: acc.total[0]?.count ?? 0,
    visits: acc.total[0]?.sum?.visits ?? 0,
    pages: acc.pages.map((p) => [p.dimensions.requestPath, n(p.count)]),
    refs: acc.refs.map((p) => [p.dimensions.refererHost || '(direct)', n(p.count)]),
    countries: acc.countries.map((p) => [p.dimensions.countryName, n(p.count)]),
    devices: acc.devices.map((p) => [p.dimensions.deviceType, n(p.count)]),
    vitals,
  };
}

/* ---------- Analytics Engine click events ---------- */
async function events(range) {
  if (!cfReady()) return null;
  const from = `${range.start} 00:00:00`;
  const to = `${day(range.end, 1)} 00:00:00`;
  // Timestamps are UTC; the 10-hour Sydney offset is accepted for weekly counts.
  const rows = await aeSql(
    `SELECT blob1 AS event, blob2 AS path, SUM(_sample_interval) AS n FROM glideslope_events
     WHERE timestamp >= toDateTime('${from}') AND timestamp < toDateTime('${to}')
     GROUP BY event, path ORDER BY n DESC FORMAT JSON`,
  );
  const by = (e) => rows.filter((r) => r.event === e).reduce((s, r) => s + Number(r.n), 0);
  return {
    cta: by('cta'),
    mailto: by('mailto'),
    outbound: by('outbound'),
    insight: by('insight-card'),
    video: by('video'),
    submissions: by('contact_submit'),
    rejected: by('contact_rejected'),
    rows: rows.filter((r) => !r.event.startsWith('contact_')).slice(0, 15).map((r) => [r.event, r.path, n(r.n)]),
  };
}

/* ---------- Search Console ---------- */
async function search(token, range) {
  const base = `/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`;
  const totals = await gsc(token, base, { startDate: range.start, endDate: range.end });
  const t = totals.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const queries = await gsc(token, base, { startDate: range.start, endDate: range.end, dimensions: ['query'], rowLimit: 10 });
  const pages = await gsc(token, base, { startDate: range.start, endDate: range.end, dimensions: ['page'], rowLimit: 10 });
  const row = (r) => [r.keys[0].replace(SITE, '') || '/', n(r.clicks), n(r.impressions), `${(r.ctr * 100).toFixed(1)}%`, r.position.toFixed(1)];
  return { ...t, queries: (queries.rows ?? []).map(row), pages: (pages.rows ?? []).map(row) };
}

async function notIndexed(token) {
  const urls = await sitemapUrls();
  const out = [];
  for (const u of urls.slice(0, 200)) {
    const r = await gsc(token, '/v1/urlInspection/index:inspect', { inspectionUrl: u, siteUrl: GSC_PROPERTY, languageCode: 'en-AU' });
    const s = r.inspectionResult?.indexStatusResult;
    if (s?.verdict !== 'PASS') out.push([u.replace(SITE, '') || '/', s?.coverageState ?? 'unknown', s?.verdict ?? 'unknown']);
  }
  return { checked: urls.length, out };
}

/* ---------- Health from GitHub ---------- */
async function health(range) {
  if (!env('GITHUB_TOKEN') || !env('GITHUB_REPOSITORY')) {
    note('Health', 'GITHUB_TOKEN not available (runs inside GitHub Actions)');
    return null;
  }
  const since = `${range.start}T00:00:00+10:00`;
  const until = `${day(range.end, 1)}T00:00:00+10:00`;
  const inRange = (t) => t >= new Date(since).toISOString() && t < new Date(until).toISOString();
  const runs = async (wf) =>
    ((await gh(`/repos/{repo}/actions/workflows/${wf}/runs?per_page=200&created=${range.start}..${range.end}`))?.workflow_runs ?? []).filter((r) =>
      inRange(r.created_at),
    );
  const up = await runs('uptime.yml');
  const upDone = up.filter((r) => ['success', 'failure'].includes(r.conclusion));
  // The uptime job only fails its own run on errors; read pass/fail from the run name set by the job.
  const upFail = upDone.filter((r) => r.conclusion === 'failure' || /FAILED/.test(r.display_title ?? ''));
  const daily = await runs('daily-checks.yml');
  const search = async (q) => (await gh(`/search/issues?q=${encodeURIComponent(`repo:${env('GITHUB_REPOSITORY')} ${q}`)}&per_page=100`))?.items ?? [];
  const autoOpened = await search(`is:pr label:auto-fix created:${range.start}..${range.end}`);
  const autoMerged = await search(`is:pr label:auto-fix is:merged merged:${range.start}..${range.end}`);
  const deps = await search(`is:pr author:app/dependabot is:merged merged:${range.start}..${range.end}`);
  const needsHuman = await search('is:issue is:open label:needs-human');
  return {
    uptime: upDone.length ? (((upDone.length - upFail.length) / upDone.length) * 100).toFixed(2) : null,
    uptimeChecks: upDone.length,
    dailyFailed: daily.filter((r) => r.conclusion === 'failure').length,
    dailyRuns: daily.length,
    autoOpened: autoOpened.length,
    autoMerged: autoMerged.length,
    deps: deps.map((p) => p.title),
    needsHuman: needsHuman.map((i) => `#${i.number} ${i.title}`),
  };
}

async function dmarc() {
  try {
    const recs = (await resolveTxt('_dmarc.glideslopepartners.com')).map((r) => r.join(''));
    return recs.find((r) => r.startsWith('v=DMARC1')) ?? null;
  } catch {
    return null;
  }
}

/* ---------- gather ---------- */
const safe = async (what, fn) => {
  try {
    return await fn();
  } catch (e) {
    note(what, e.message.slice(0, 300));
    return null;
  }
};

if (!cfReady()) note('Visits, page views and click events', 'CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set');
else if (!env('CF_WEB_ANALYTICS_SITE_TAG')) note('Visits and page views', 'CF_WEB_ANALYTICS_SITE_TAG not set');
const [wa, waPrev] = [await safe('Web Analytics', () => webAnalytics(week)), await safe('Web Analytics (prior week)', () => webAnalytics(prior))];
const [ev, evPrev] = [await safe('Click events', () => events(week)), await safe('Click events (prior week)', () => events(prior))];
const token = await safe('Search Console auth', () => googleToken());
if (!token) note('Search Console', 'GSC_SERVICE_ACCOUNT_JSON not set or invalid');
// Search Console data lags by about two days; the most recent days may be incomplete.
const sc = token ? await safe('Search Console', () => search(token, week)) : null;
const scPrev = token ? await safe('Search Console (prior week)', () => search(token, prior)) : null;
const idx = token ? await safe('URL Inspection', () => notIndexed(token)) : null;
const hl = await safe('GitHub health', () => health(week));
const dm = await dmarc();
const lhFile = process.argv[2];
const lighthouse = lhFile && existsSync(lhFile) ? readFileSync(lhFile, 'utf8').trim() : null;
if (!lighthouse) note('Lighthouse', 'no production Lighthouse run this week');

/* ---------- narrative (from the numbers only) ---------- */
const story = [];
if (wa && waPrev) {
  const dir = wa.pageViews > waPrev.pageViews ? 'up' : wa.pageViews < waPrev.pageViews ? 'down' : 'flat';
  story.push(`Page views were ${dir === 'flat' ? 'unchanged' : dir} at ${n(wa.pageViews)}, against ${n(waPrev.pageViews)} the week before.`);
  if (wa.refs[0]) story.push(`The largest referrer was ${wa.refs[0][0]} with ${wa.refs[0][1]} page views.`);
}
if (ev) story.push(`${n(ev.submissions)} enquir${ev.submissions === 1 ? 'y was' : 'ies were'} sent through the contact form, and ${n(ev.cta)} "talk to a partner" style buttons were clicked.`);
if (sc && scPrev) story.push(`Google showed the site ${n(sc.impressions)} times in search (${n(scPrev.impressions)} the week before) for ${n(sc.clicks)} clicks.`);
if (hl?.needsHuman?.length) story.push(`${hl.needsHuman.length} issue${hl.needsHuman.length === 1 ? ' needs' : 's need'} a person to act.`);
else if (hl) story.push('Nothing is waiting on a person.');

const actions = [];
for (const i of hl?.needsHuman ?? []) actions.push(`Resolve ${i}.`);
for (const [u, state] of idx?.out ?? []) actions.push(`Check why ${u} is not indexed (${state}).`);
if (dm && /p=none/.test(dm)) {
  const launched = env('LAUNCH_DATE');
  const weeks = launched ? Math.floor((Date.now() - new Date(launched).getTime()) / (7 * 864e5)) : null;
  actions.push(
    weeks !== null && weeks >= 4
      ? `DMARC has been at p=none for ${weeks} weeks. If the DMARC reports to hello@ show only your own mail services passing, change the _dmarc record to p=quarantine.`
      : `DMARC is at p=none (monitoring). Move it to p=quarantine after four clean weeks of reports.`,
  );
} else if (!dm) actions.push('No DMARC record found for glideslopepartners.com. Add one (see SETUP.md, step 9).');
if (unavailable.length) actions.push('Finish the setup steps for the data marked unavailable below (SETUP.md).');
if (!actions.length) actions.push('None this week.');

/* ---------- render ---------- */
const md = [
  `# Weekly report: ${label}`,
  '',
  '## Headlines',
  '',
  `- **Page views:** ${wa ? n(wa.pageViews) + delta(wa.pageViews, waPrev?.pageViews) : 'unavailable'}`,
  `- **Visits:** ${wa ? n(wa.visits) + delta(wa.visits, waPrev?.visits) : 'unavailable'}`,
  `- **Unique visitors:** not measured. Cloudflare Web Analytics is cookieless and does not count unique visitors.`,
  `- **Contact form enquiries:** ${ev ? n(ev.submissions) + delta(ev.submissions, evPrev?.submissions) : 'unavailable'}`,
  `- **Search clicks / impressions:** ${sc ? `${n(sc.clicks)}${delta(sc.clicks, scPrev?.clicks)} / ${n(sc.impressions)}${delta(sc.impressions, scPrev?.impressions)}` : 'unavailable'}`,
  `- **Uptime:** ${hl?.uptime ? `${hl.uptime}% of ${hl.uptimeChecks} hourly checks` : 'unavailable'}`,
  `- **Open issues needing a person:** ${hl ? hl.needsHuman.length : 'unavailable'}`,
  '',
  '## Traffic',
  '',
  wa ? `**Top pages**\n\n${table(['Page', 'Views'], wa.pages)}\n\n**Top referrers**\n\n${table(['Referrer', 'Views'], wa.refs)}\n\n**Countries**\n\n${table(['Country', 'Views'], wa.countries)}\n\n**Devices**\n\n${table(['Device', 'Views'], wa.devices)}` : '_Unavailable._',
  '',
  '## Real-visitor Core Web Vitals (p75)',
  '',
  wa?.vitals
    ? table(['Metric', 'p75', 'Budget'], [
        ['LCP', `${(wa.vitals.quantiles.largestContentfulPaintP75 / 1000).toFixed(2)} s`, '< 1.5 s'],
        ['CLS', Number(wa.vitals.quantiles.cumulativeLayoutShiftP75).toFixed(3), '< 0.02'],
        ['INP', `${Math.round(wa.vitals.quantiles.interactionToNextPaintP75)} ms`, '< 100 ms'],
      ]) + `\n\nFrom ${n(wa.vitals.count)} page loads.`
    : '_Unavailable._',
  '',
  '## Clicks',
  '',
  ev
    ? table(['Event', 'This week', 'Week before'], [
        ['"Talk to a partner" and other CTAs', n(ev.cta), n(evPrev?.cta)],
        ['Email (mailto) links', n(ev.mailto), n(evPrev?.mailto)],
        ['Outbound (LinkedIn, ClarityIntel, sources)', n(ev.outbound), n(evPrev?.outbound)],
        ['Insight cards', n(ev.insight), n(evPrev?.insight)],
        ['Brand video plays', n(ev.video), n(evPrev?.video)],
        ['Contact form enquiries sent', n(ev.submissions), n(evPrev?.submissions)],
        ['Contact form attempts stopped (spam or errors)', n(ev.rejected), n(evPrev?.rejected)],
      ]) + `\n\n**By page**\n\n${table(['Event', 'Page', 'Count'], ev.rows)}`
    : '_Unavailable._',
  '',
  '## Search (Google Search Console)',
  '',
  sc
    ? `${table(['Measure', 'This week', 'Week before'], [
        ['Clicks', n(sc.clicks), n(scPrev?.clicks)],
        ['Impressions', n(sc.impressions), n(scPrev?.impressions)],
        ['CTR', `${(sc.ctr * 100).toFixed(1)}%`, scPrev ? `${(scPrev.ctr * 100).toFixed(1)}%` : 'n/a'],
        ['Average position', sc.position ? sc.position.toFixed(1) : 'n/a', scPrev?.position ? scPrev.position.toFixed(1) : 'n/a'],
      ])}\n\n**Top queries**\n\n${table(['Query', 'Clicks', 'Impressions', 'CTR', 'Position'], sc.queries)}\n\n**Top pages**\n\n${table(['Page', 'Clicks', 'Impressions', 'CTR', 'Position'], sc.pages)}\n\nSearch Console data lags by about two days, so the last days of the week may still rise.`
    : '_Unavailable._',
  '',
  idx ? `**Not indexed** (${idx.checked} sitemap URLs inspected)\n\n${table(['URL', 'Coverage', 'Verdict'], idx.out)}` : '',
  '',
  '## Health',
  '',
  hl
    ? table(['Measure', 'Value'], [
        ['Uptime', hl.uptime ? `${hl.uptime}% (${hl.uptimeChecks} checks)` : 'n/a'],
        ['Daily check runs failed', `${hl.dailyFailed} of ${hl.dailyRuns}`],
        ['Auto-fix PRs opened / merged', `${hl.autoOpened} / ${hl.autoMerged}`],
        ['Dependency updates merged', hl.deps.length ? hl.deps.join('; ') : 'none'],
        ['Open needs-human issues', hl.needsHuman.length ? hl.needsHuman.join('; ') : 'none'],
        ['DMARC policy', dm ?? 'no record'],
      ])
    : '_Unavailable._',
  '',
  '## Lighthouse (production, mobile)',
  '',
  lighthouse ?? '_Unavailable._',
  '',
  '## What changed and why it matters',
  '',
  story.length ? story.slice(0, 5).join(' ') : 'There is not enough data yet to compare weeks.',
  '',
  '## Actions',
  '',
  ...actions.map((a) => `- ${a}`),
  '',
  unavailable.length ? `<details><summary>Unavailable data</summary>\n\n${unavailable.map((u) => `- ${u}`).join('\n')}\n</details>` : '',
].join('\n');

writeFileSync('weekly-report.md', md);
await summary(md);
await openIssue(`Weekly report: ${label}`, md, ['weekly-report']);
await sendMail({ subject: `Glideslope website: weekly report, ${label}`, text: md });
