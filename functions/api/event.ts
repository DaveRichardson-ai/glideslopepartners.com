// POST /api/event — count-only click events from the tracking beacon.
// Stores event name, page path, label and a 10-minute bucket. No cookies,
// no IP addresses, no identifiers.
import { type Env, track } from '../_lib/env';
import { secure } from '../_lib/headers';

export const EVENTS = new Set(['cta', 'mailto', 'outbound', 'insight-card', 'video']);
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|http-client|axios|node-fetch/i;

export function parseEvent(raw: string, ua: string | null) {
  if (!ua || BOT_UA.test(ua)) return null;
  if (raw.length > 1024) return null;
  let d: { e?: unknown; p?: unknown; l?: unknown; b?: unknown };
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof d.e !== 'string' || !EVENTS.has(d.e)) return null;
  const path = typeof d.p === 'string' && d.p.startsWith('/') ? d.p.slice(0, 200) : '/';
  const label = typeof d.l === 'string' ? d.l.replace(/[^\w .:/@-]/g, '').slice(0, 80) : '';
  return { event: d.e, path, label };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parsed = parseEvent(await request.text(), request.headers.get('User-Agent'));
  if (parsed) track(env, parsed.event, [parsed.path, parsed.label]);
  return secure(new Response(null, { status: 204 }));
};

export const onRequest: PagesFunction<Env> = async () =>
  secure(new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } }));
