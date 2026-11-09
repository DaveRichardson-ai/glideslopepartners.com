// glideslope-mailer: sends website enquiries through Cloudflare Email Routing.
// Reachable only through the Pages project's MAILER service binding
// (workers_dev and routes are off), so it has no public URL.
import { EmailMessage } from 'cloudflare:email';

interface Env {
  EMAIL: SendEmail;
  /** Verified Email Routing destination address. Secret. */
  CONTACT_DESTINATION: string;
  /** Sender on the routing domain. */
  FROM_ADDRESS: string;
}

import { buildMessage, type Enquiry } from './message';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (!env.CONTACT_DESTINATION) return new Response('CONTACT_DESTINATION not set', { status: 503 });
    let e: Enquiry;
    try {
      e = await request.json();
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (!e?.name || !EMAIL_RE.test(e.email ?? '') || !e.message) return new Response('Bad request', { status: 400 });
    const raw = buildMessage(e, env.FROM_ADDRESS, env.CONTACT_DESTINATION);
    try {
      await env.EMAIL.send(new EmailMessage(env.FROM_ADDRESS, env.CONTACT_DESTINATION, raw));
    } catch (err) {
      return new Response(`Send failed: ${(err as Error).message}`, { status: 502 });
    }
    return new Response('sent', { status: 200 });
  },
};
