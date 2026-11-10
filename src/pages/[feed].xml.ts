// /rss.xml — generated only when at least one article is published.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedInsights, insightUrl } from '../lib/insights';
import { authors } from '../data/authors';
import { site } from '../data/site';

export async function getStaticPaths() {
  const insights = await getPublishedInsights();
  return insights.length ? [{ params: { feed: 'rss' } }] : [];
}

export async function GET(context: APIContext) {
  const insights = await getPublishedInsights();
  return rss({
    title: 'Glideslope Partners insights',
    description: 'Practical insights on separations, integrations, TSAs and broader transformation in Australian financial services.',
    site: context.site ?? site.url,
    customData: '<language>en-au</language>',
    items: insights.map((i) => ({
      title: i.data.title,
      description: i.data.description,
      pubDate: i.data.publishDate,
      link: insightUrl(i),
      author: `${site.email} (${authors[i.data.author].name})`,
      categories: [i.data.topic],
    })),
  });
}
