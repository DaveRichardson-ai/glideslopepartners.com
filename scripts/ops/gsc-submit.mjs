// Submits the sitemap to Google Search Console, if it changed since the last
// production deploy (pass the old sitemap file), or always with --force.
//   node scripts/ops/gsc-submit.mjs previous-sitemap.xml dist/sitemap.xml
import { existsSync, readFileSync } from 'node:fs';
import { googleToken, gsc, GSC_PROPERTY, SITE, summary, warn } from './lib.mjs';

const [oldFile, newFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
const strip = (s) => s.replace(/<lastmod>[^<]*<\/lastmod>/g, '');
const changed =
  force || !oldFile || !existsSync(oldFile) || !newFile || strip(readFileSync(oldFile, 'utf8')) !== strip(readFileSync(newFile, 'utf8'));

if (!changed) {
  await summary('Sitemap URLs unchanged; not resubmitted to Search Console.');
  process.exit(0);
}
const token = await googleToken();
if (!token) {
  warn('GSC_SERVICE_ACCOUNT_JSON not set; sitemap not submitted to Search Console.');
  process.exit(0);
}
const feed = `${SITE}/sitemap.xml`;
await gsc(token, `/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/sitemaps/${encodeURIComponent(feed)}`, null);
await summary(`Submitted ${feed} to Search Console (${GSC_PROPERTY}).`);
