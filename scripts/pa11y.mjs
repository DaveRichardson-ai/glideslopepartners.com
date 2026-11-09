// Runs pa11y-ci (axe + HTML_CodeSniffer, WCAG 2 AA) over every sitemap URL of both builds.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const bases = (process.env.PA11Y_BASES || 'http://127.0.0.1:8788,http://127.0.0.1:8789').split(',');
const urls = [];
for (const base of bases) {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(base + new URL(m[1]).pathname);
  urls.push(`${base}/contact/thanks/`);
}
const config = {
  defaults: {
    standard: 'WCAG2AA',
    // axe marks text over a background image as 'needs review' (it cannot
    // compute contrast). Report those as warnings; real violations stay errors.
    // The home hero's text sits on ink at 15:1 or better (checked by hand).
    levelCapWhenNeedsReview: 'warning',
    runners: ['axe', 'htmlcs'],
    timeout: 60000,
    wait: 500,
    // Third-party Turnstile iframe content is outside our control.
    hideElements: '[data-turnstile-slot]',
    chromeLaunchConfig: {
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  urls: [...new Set(urls)],
};
writeFileSync('.pa11yci.json', JSON.stringify(config, null, 2));
const r = spawnSync('npx', ['pa11y-ci', '--config', '.pa11yci.json'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
