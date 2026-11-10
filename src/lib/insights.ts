import { getCollection, type CollectionEntry } from 'astro:content';
export { readingTime } from './reading-time';
import { isDue } from './schedule';

export type Insight = CollectionEntry<'insights'> & { data: { publishDate: Date } };

// Markers that must never reach a published article.
const BLOCKED = [/\[verify/i, /\[check/i, /\[Date\]/, /\[Name\]/, /\bTODO\b/];

export function assertPublishable(entry: CollectionEntry<'insights'>) {
  if (entry.data.draft) return;
  const where = `src/content/insights/${entry.id}.md`;
  if (!entry.data.publishDate) {
    throw new Error(`${where} is set to draft: false but has no publishDate.`);
  }
  for (const re of BLOCKED) {
    const hit = (entry.body ?? '').match(re) ?? entry.data.title.match(re) ?? entry.data.description.match(re);
    if (hit) {
      throw new Error(
        `${where} is set to draft: false but still contains "${hit[0]}". Resolve the note, or set draft: true.`,
      );
    }
  }
}

let cache: Insight[] | undefined;

/**
 * Published insights, newest first. An article with draft: false and a future
 * publishDate is scheduled: it is left out until a build on or after that date
 * (the Scheduled publish workflow redeploys on the morning it is due).
 * Throws if a published or scheduled article fails a guard.
 */
export async function getPublishedInsights(): Promise<Insight[]> {
  if (cache) return cache;
  const all = await getCollection('insights');
  all.forEach(assertPublishable);
  cache = all
    .filter((e): e is Insight => !e.data.draft && e.data.publishDate !== null && isDue(e.data.publishDate))
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
  return cache;
}

export async function hasInsights() {
  return (await getPublishedInsights()).length > 0;
}

export async function publishedTopics() {
  const list = await getPublishedInsights();
  return [...new Set(list.map((i) => i.data.topic))].sort();
}

export const insightUrl = (i: Insight) => `/insights/${i.id}/`;
