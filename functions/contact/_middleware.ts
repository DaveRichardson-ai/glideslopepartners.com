// Shows the contact form's error summary without JavaScript. When the form
// handler redirects back to /contact/?error=…, this fills in and reveals the
// summary in the static page before it is sent.
import type { Env } from '../_lib/env';
import { secure } from '../_lib/headers';

export const MESSAGES: Record<string, string> = {
  name: 'Please enter your name.',
  email: 'Please enter a valid work email address, for example jane@company.com.au.',
  message: 'Please tell us what you are working on, in 20 to 5,000 characters.',
  'spam-check': 'The spam check did not complete. Please wait for it to finish, then send again.',
  'too-fast': 'That was sent very quickly, so our spam check stopped it. Please send it again.',
  'send-failed': 'Your message did not reach us. Please try again, or email hello@glideslopepartners.com.',
  'not-configured': 'The form is not taking messages yet. Please email hello@glideslopepartners.com.',
};

export const onRequestGet: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('error');
  const res = await next();
  if (url.pathname !== '/contact/' || !code) return res;
  const text = MESSAGES[code] ?? MESSAGES['send-failed']!;
  const field = { name: 'contact-name', email: 'contact-email', message: 'contact-message' }[code];

  let rewriter = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.prepend('Error: ');
      },
    })
    .on('#form-errors', {
      element(el) {
        el.removeAttribute('hidden');
      },
    })
    .on('#form-errors-text', {
      element(el) {
        el.setInnerContent(text);
      },
    });
  if (field) {
    rewriter = rewriter.on(`#${field}`, {
      element(el) {
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', 'form-errors-text');
      },
    });
  }
  const out = rewriter.transform(res);
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex');
  return secure(new Response(out.body, { status: out.status, headers }));
};
