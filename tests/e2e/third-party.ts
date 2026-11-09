// Console messages and page errors that come from Cloudflare Turnstile, the
// third-party spam check on the pages that load it. We cannot change its code,
// and it logs these while working normally (more so in headless WebKit, which
// does not attach the frame's address to the message). Anything else fails.
const TURNSTILE_PAGES = new Set(['/', '/contact/']);
const TURNSTILE_NOISE = [
  /challenges\.cloudflare\.com/,
  /cloudflarecaptcha\.com/,
  /connect to data:,|Connecting to 'data:,'|Fetch API cannot load data:,/,
  /^%c%[do] font-size:0;color:transparent/,
];

export function isTurnstileNoise(path: string, text: string, sourceUrl = '') {
  if (sourceUrl.startsWith('https://challenges.cloudflare.com/')) return true;
  return TURNSTILE_PAGES.has(path) && TURNSTILE_NOISE.some((re) => re.test(text));
}
