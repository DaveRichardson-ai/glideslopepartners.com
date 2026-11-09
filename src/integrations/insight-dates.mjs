// Reads publish and update dates from insight front matter so the sitemap
// can carry an accurate lastmod for each article.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const insightsDir = () => process.env.INSIGHTS_DIR || 'src/content/insights';

function field(fm, name) {
  const m = fm.match(new RegExp(`^${name}:\\s*["']?([^"'#\\n]+?)["']?\\s*(#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

/** @returns {Record<string, string>} slug -> ISO lastmod */
export function insightDates() {
  const dir = insightsDir();
  /** @type {Record<string, string>} */
  const out = {};
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const fm = readFileSync(join(dir, name), 'utf8').split(/^---\s*$/m)[1] ?? '';
    const slug = field(fm, 'slug') ?? name.replace(/\.md$/, '');
    const date = field(fm, 'updatedDate') ?? field(fm, 'publishDate');
    if (date && date !== 'null') out[slug] = new Date(date).toISOString();
  }
  return out;
}
