// POST /api/contact — the contact form. Works without JavaScript: it always
// answers with a 303 redirect, to /contact/thanks/ or back to /contact/?error=…
import { type Env, TURNSTILE_TEST_SECRET, track } from '../_lib/env';
import { redirect, secure } from '../_lib/headers';

export const STAGES = ['Pre-signing', 'Signed, pre-completion', 'Post-completion', 'Not deal-related'];
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

export type ErrorCode =
  | 'name'
  | 'email'
  | 'message'
  | 'spam-check'
  | 'too-fast'
  | 'send-failed'
  | 'not-configured';

export interface Enquiry {
  name: string;
  organisation: string;
  email: string;
  stage: string;
  message: string;
  source: string;
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

export function validate(form: FormData, now = Date.now()): { ok: true; data: Enquiry } | { ok: false; code: ErrorCode } | { ok: 'spam' } {
  if (clean(form.get('website'), 200)) return { ok: 'spam' };

  const started = Number(form.get('t'));
  if (!started || now - started > MAX_FILL_MS) return { ok: false, code: 'spam-check' };
  if (now - started < MIN_FILL_MS) return { ok: false, code: 'too-fast' };

  const name = oneLine(clean(form.get('name'), 120));
  const organisation = oneLine(clean(form.get('organisation'), 160));
  const email = oneLine(clean(form.get('email'), 254));
  const stageRaw = clean(form.get('stage'), 60);
  const message = clean(form.get('message'), 5000);
  const source = clean(form.get('source'), 20) === 'home' ? 'home' : 'contact';

  if (!name) return { ok: false, code: 'name' };
  if (!EMAIL_RE.test(email)) return { ok: false, code: 'email' };
  const rawLen = typeof form.get('message') === 'string' ? (form.get('message') as string).trim().length : 0;
  if (message.length < 20 || rawLen > 5000) return { ok: false, code: 'message' };
  const stage = STAGES.includes(stageRaw) ? stageRaw : 'Not given';
  return { ok: true, data: { name, organisation, email, stage, message, source } };
}

async function verifyTurnstile(token: string, secret: string, ip: string | null) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

const back = (url: URL, code: ErrorCode) => redirect(new URL(`/contact/?error=${code}#form-errors`, url).href);
const thanks = (url: URL) => redirect(new URL('/contact/thanks/', url).href);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(url, 'message');
  }

  const result = validate(form);
  if (result.ok === 'spam') {
    track(env, 'contact_rejected', ['honeypot']);
    return thanks(url); // Do not tell bots they were caught.
  }
  if (result.ok === false) {
    track(env, 'contact_rejected', [result.code]);
    return back(url, result.code);
  }

  let secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY is not set; using the Cloudflare test secret.');
    secret = TURNSTILE_TEST_SECRET;
  }
  const human = await verifyTurnstile(
    String(form.get('cf-turnstile-response') ?? ''),
    secret,
    request.headers.get('CF-Connecting-IP'),
  );
  if (!human) {
    track(env, 'contact_rejected', ['turnstile']);
    return back(url, 'spam-check');
  }

  if (env.DEV_SKIP_EMAIL === '1') {
    console.log('DEV_SKIP_EMAIL=1: enquiry accepted without sending email.');
  } else if (!env.MAILER) {
    console.error('MAILER service binding is missing; enquiry not sent.');
    track(env, 'contact_failed', ['not-configured']);
    return back(url, 'not-configured');
  } else {
    const res = await env.MAILER.fetch('https://mailer.internal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });
    if (!res.ok) {
      console.error('Mailer returned', res.status, await res.text());
      // 503 means the mailer has no verified destination yet (SETUP.md step 6).
      const code: ErrorCode = res.status === 503 ? 'not-configured' : 'send-failed';
      track(env, 'contact_failed', [code]);
      return back(url, code);
    }
  }

  track(env, 'contact_submit', [result.data.source]);
  return thanks(url);
};

export const onRequest: PagesFunction<Env> = async () =>
  secure(new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } }));
