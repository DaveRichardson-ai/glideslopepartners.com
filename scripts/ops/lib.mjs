// Shared helpers for the scheduled jobs. Every integration skips with a
// warning when its secret is missing, so CI stays green during setup.
import { createSign } from 'node:crypto';
import { appendFileSync } from 'node:fs';

export const SITE = process.env.SITE_URL || 'https://glideslopepartners.com';
export const env = (k) => (process.env[k] && process.env[k].trim()) || undefined;

export function warn(msg) {
  console.log(`::warning::${msg}`);
}

/* ---------------- GitHub ---------------- */

const GH = 'https://api.github.com';
const repo = () => env('GITHUB_REPOSITORY');

export async function gh(path, init = {}) {
  const token = env('GITHUB_TOKEN');
  if (!token || !repo()) {
    warn(`GITHUB_TOKEN/GITHUB_REPOSITORY not set; skipped GitHub call ${path}`);
    return null;
  }
  const res = await fetch(`${GH}${path.replace('{repo}', repo())}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method || 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function ensureLabel(name, color, description) {
  try {
    await gh(`/repos/{repo}/labels`, { method: 'POST', body: JSON.stringify({ name, color, description }) });
  } catch (e) {
    if (!String(e).includes('already_exists') && !String(e).includes('422')) throw e;
  }
}

/** Opens an issue, or comments on an open one with the same title. Assigns the repo owner. */
export async function openIssue(title, body, labels = ['needs-human']) {
  for (const l of labels) await ensureLabel(l, LABEL_COLOURS[l] ?? 'D9A441', LABEL_TEXT[l] ?? '');
  const open = (await gh(`/repos/{repo}/issues?state=open&per_page=100&labels=${encodeURIComponent(labels[0])}`)) ?? [];
  const existing = open.find((i) => i.title === title);
  if (existing) {
    await gh(`/repos/{repo}/issues/${existing.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    return existing;
  }
  const owner = repo()?.split('/')[0];
  return gh(`/repos/{repo}/issues`, { method: 'POST', body: JSON.stringify({ title, body, labels, assignees: owner ? [owner] : [] }) });
}

const LABEL_COLOURS = { 'needs-human': 'A63D2A', 'auto-fix': '2F6E50', 'weekly-report': '0F1C2E', 'uptime-incident': 'A63D2A' };
const LABEL_TEXT = {
  'needs-human': 'Automation could not fix this; the owner needs to act',
  'auto-fix': 'Opened automatically by a scheduled job',
  'weekly-report': 'Weekly site report',
  'uptime-incident': 'Uptime check failed twice in a row',
};

/* ---------------- Email ---------------- */

export async function sendMail({ to, subject, text, html }) {
  const host = env('SMTP_HOST');
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASSWORD');
  const recipients = to ?? env('REPORT_RECIPIENTS');
  if (!host || !user || !pass || !recipients) {
    warn('SMTP_HOST, SMTP_USER, SMTP_PASSWORD or REPORT_RECIPIENTS not set; email skipped');
    return false;
  }
  const { default: nodemailer } = await import('nodemailer');
  const t = nodemailer.createTransport({ host, port: Number(env('SMTP_PORT') ?? 465), secure: (env('SMTP_PORT') ?? '465') === '465', auth: { user, pass } });
  await t.sendMail({ from: `Glideslope website <${user}>`, to: recipients, subject, text, html });
  return true;
}

/* ---------------- Cloudflare ---------------- */

const CF = 'https://api.cloudflare.com/client/v4';
export const cfReady = () => Boolean(env('CLOUDFLARE_API_TOKEN') && env('CLOUDFLARE_ACCOUNT_ID'));

export async function cf(path, init = {}) {
  const res = await fetch(`${CF}${path.replace('{account}', env('CLOUDFLARE_ACCOUNT_ID'))}`, {
    ...init,
    headers: { Authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(`Cloudflare ${path}: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  return json;
}

export async function cfGraphQL(query, variables) {
  const res = await fetch(`${CF}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Cloudflare GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

/** Workers Analytics Engine SQL API. */
export async function aeSql(sql) {
  const res = await fetch(`${CF}/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}` },
    body: sql,
  });
  if (!res.ok) throw new Error(`Analytics Engine SQL: ${res.status} ${await res.text()}`);
  return (await res.json()).data ?? [];
}

export const PAGES_PROJECT = env('CF_PAGES_PROJECT') ?? 'glideslope';

/* ---------------- Google Search Console ---------------- */

const b64url = (b) => Buffer.from(b).toString('base64url');

export async function googleToken(scope = 'https://www.googleapis.com/auth/webmasters') {
  const raw = env('GSC_SERVICE_ACCOUNT_JSON');
  if (!raw) return null;
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

/** The Search Console property: a domain property by default. */
export const GSC_PROPERTY = env('GSC_PROPERTY') ?? 'sc-domain:glideslopepartners.com';

export async function gsc(token, path, body) {
  const res = await fetch(`https://searchconsole.googleapis.com${path}`, {
    method: body === undefined ? 'GET' : body === null ? 'PUT' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Search Console ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/* ---------------- Site ---------------- */

export async function sitemapUrls(base = SITE) {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export const REQUIRED_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
};

export function checkHeaders(headers) {
  const problems = [];
  for (const [k, v] of Object.entries(REQUIRED_HEADERS)) if (headers.get(k) !== v) problems.push(`${k}: expected "${v}", got "${headers.get(k)}"`);
  const csp = headers.get('content-security-policy') ?? '';
  if (!csp.includes("default-src 'self'") || csp.includes('unsafe-inline')) problems.push(`content-security-policy missing or weakened: "${csp}"`);
  return problems;
}

export const REDIRECTS = {
  '/what-we-do': '/services/',
  '/who-we-are': '/about/',
  '/get-in-touch': '/contact/',
  '/privacy_policy': '/privacy/',
  '/index.html': '/',
};

export function setOutput(name, value) {
  const f = env('GITHUB_OUTPUT');
  if (f) appendFileSync(f, `${name}<<__EOF__\n${value}\n__EOF__\n`);
}

export async function summary(md) {
  const f = env('GITHUB_STEP_SUMMARY');
  if (f) appendFileSync(f, md + '\n');
  console.log(md);
}
