// Scheduled publishing: an article with draft: false is live once its
// publishDate (a Sydney calendar date) has arrived.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Today's date in Sydney as YYYY-MM-DD. */
export function sydneyToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(now);
}

/**
 * True once the article's publishDate has arrived.
 * @param {Date | string} publishDate a Date (front matter dates parse as UTC midnight) or YYYY-MM-DD
 * @param {string} [today]
 */
export const isDue = (publishDate, today = sydneyToday()) =>
  (typeof publishDate === 'string' ? publishDate : publishDate.toISOString()).slice(0, 10) <= today;

/**
 * Slugs of the articles that are live today, read straight from the markdown
 * front matter (for build steps that run outside the content collection).
 * @param {string} dir
 * @param {string} [today]
 * @returns {Set<string>}
 */
export function liveSlugs(dir, today = sydneyToday()) {
  const live = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const fm = readFileSync(join(dir, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const get = (/** @type {string} */ key) => fm.match(new RegExp(`^${key}:\\s*"?([^"#\\r\\n]*?)"?\\s*(#.*)?$`, 'm'))?.[1];
    const date = get('publishDate');
    if (get('draft') === 'false' && date && /^\d{4}-\d{2}-\d{2}$/.test(date) && isDue(date, today)) {
      live.add(get('slug') || file.replace(/\.md$/, ''));
    }
  }
  return live;
}
