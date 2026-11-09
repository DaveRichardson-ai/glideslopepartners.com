// Builds the raw RFC 5322 message for an enquiry.
export interface Enquiry {
  name: string;
  organisation: string;
  email: string;
  stage: string;
  message: string;
  source: string;
}

export const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
// RFC 2047 encoded-word, safe for any characters in a header.
const header = (s: string) => `=?UTF-8?B?${b64(s.replace(/[\r\n]+/g, ' '))}?=`;
const wrap76 = (s: string) => s.replace(/.{1,76}/g, '$&\r\n');

export function buildMessage(e: Enquiry, from: string, to: string, now = new Date()) {
  const subject = `Website enquiry: ${e.name}, ${e.organisation || 'no organisation given'}`;
  const body = [
    `Name: ${e.name}`,
    `Organisation: ${e.organisation || '(not given)'}`,
    `Email: ${e.email}`,
    `Transaction stage: ${e.stage}`,
    `Sent from: ${e.source === 'home' ? 'home page' : 'contact page'}`,
    '',
    e.message,
    '',
    '--',
    'Sent by the glideslopepartners.com contact form. Reply to this email to answer the enquirer.',
  ].join('\n');
  const domain = from.split('@')[1];
  return [
    `From: ${header('Glideslope website')} <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${header(e.name)} <${e.email}>`,
    `Subject: ${header(subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(body)),
  ].join('\r\n');
}

