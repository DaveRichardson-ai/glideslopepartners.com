import { describe, expect, it } from 'vitest';
import { validate } from '../../functions/api/contact';
import { parseEvent } from '../../functions/api/event';
import { MESSAGES } from '../../functions/contact/_middleware';
import { buildMessage } from '../../workers/mailer/src/message';

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};
const now = 1_800_000_000_000;
const good = {
  name: 'Jane Citizen',
  organisation: 'Acme',
  email: 'jane@acme.com.au',
  stage: 'Pre-signing',
  message: 'We are separating a wealth platform.',
  t: String(now - 20_000),
  source: 'home',
};

describe('contact validation', () => {
  it('accepts a complete enquiry', () => {
    expect(validate(form(good), now)).toEqual({
      ok: true,
      data: {
        name: 'Jane Citizen',
        organisation: 'Acme',
        email: 'jane@acme.com.au',
        stage: 'Pre-signing',
        message: 'We are separating a wealth platform.',
        source: 'home',
      },
    });
  });
  it('flags the honeypot as spam', () => expect(validate(form({ ...good, website: 'x' }), now)).toEqual({ ok: 'spam' }));
  it('rejects a missing or stale start time', () => {
    expect(validate(form({ ...good, t: '' }), now)).toEqual({ ok: false, code: 'spam-check' });
    expect(validate(form({ ...good, t: String(now - 2 * 864e5) }), now)).toEqual({ ok: false, code: 'spam-check' });
  });
  it('rejects submissions under three seconds', () =>
    expect(validate(form({ ...good, t: String(now - 1000) }), now)).toEqual({ ok: false, code: 'too-fast' }));
  it('requires a name, a valid email and a 20 to 5,000 character message', () => {
    expect(validate(form({ ...good, name: ' ' }), now)).toMatchObject({ code: 'name' });
    expect(validate(form({ ...good, email: 'jane@acme' }), now)).toMatchObject({ code: 'email' });
    expect(validate(form({ ...good, email: 'a@b.com\r\nBcc: x@y.com' }), now)).toMatchObject({ code: 'email' });
    expect(validate(form({ ...good, message: 'short' }), now)).toMatchObject({ code: 'message' });
    expect(validate(form({ ...good, message: 'x'.repeat(5001) }), now)).toMatchObject({ code: 'message' });
  });
  it('strips line breaks from header fields and normalises unknown stages', () => {
    const r = validate(form({ ...good, name: 'Jane\r\nBcc: evil', stage: 'Hacked' }), now);
    expect(r).toMatchObject({ ok: true, data: { name: 'Jane Bcc: evil', stage: 'Not given' } });
  });
  it('has a message for every error code', () => {
    for (const code of ['name', 'email', 'message', 'spam-check', 'too-fast', 'send-failed', 'not-configured']) {
      expect(MESSAGES[code]).toBeTruthy();
    }
  });
});

describe('event beacon', () => {
  const ua = 'Mozilla/5.0 (Macintosh) Safari/605';
  it('accepts known events', () =>
    expect(parseEvent(JSON.stringify({ e: 'cta', p: '/services/', l: 'hero', b: 1 }), ua)).toEqual({
      event: 'cta',
      path: '/services/',
      label: 'hero',
    }));
  it('drops bots, unknown events, bad JSON and oversized bodies', () => {
    expect(parseEvent(JSON.stringify({ e: 'cta', p: '/' }), 'Googlebot/2.1')).toBeNull();
    expect(parseEvent(JSON.stringify({ e: 'cta', p: '/' }), null)).toBeNull();
    expect(parseEvent(JSON.stringify({ e: 'pageview', p: '/' }), ua)).toBeNull();
    expect(parseEvent('{', ua)).toBeNull();
    expect(parseEvent('x'.repeat(2000), ua)).toBeNull();
  });
  it('strips markup from labels', () => {
    const r = parseEvent(JSON.stringify({ e: 'mailto', p: '/', l: '<script>alert(1)</script>' }), ua);
    expect(r?.label).not.toMatch(/[<>()]/);
  });
});

describe('enquiry email', () => {
  const raw = buildMessage(
    { name: "Zoë O'Brien", organisation: 'Acme', email: 'zoe@acme.com.au', stage: 'Pre-signing', message: 'Hello there', source: 'contact' },
    'website@glideslopepartners.com',
    'owner@example.com',
    new Date('2026-11-09T00:00:00Z'),
  );
  const decode = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
  it('sets Reply-To to the enquirer and uses the subject from the brief', () => {
    expect(raw).toMatch(/^Reply-To: =\?UTF-8\?B\?[^?]+\?= <zoe@acme\.com\.au>\r$/m);
    const subject = raw.match(/^Subject: =\?UTF-8\?B\?([^?]+)\?=\r$/m)![1]!;
    expect(decode(subject)).toBe("Website enquiry: Zoë O'Brien, Acme");
    expect(raw).toContain('To: <owner@example.com>');
  });
});

import { parseRange } from '../../functions/media/[[path]]';

describe('video byte ranges (iOS Safari needs 206)', () => {
  it('parses the ranges Safari and Chrome send', () => {
    expect(parseRange('bytes=0-1', 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
  });
  it('rejects ranges outside the file and malformed headers', () => {
    expect(parseRange('bytes=1000-1001', 1000)).toBe('invalid');
    expect(parseRange('bytes=5-2', 1000)).toBe('invalid');
    expect(parseRange('items=0-1', 1000)).toBe('invalid');
    expect(parseRange(null, 1000)).toBeNull();
  });
});
