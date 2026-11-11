// Branded 1200×630 Open Graph images, rendered at build time with Satori.
import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { getPublishedInsights, publishedTopics } from '../../lib/insights';
import { authors } from '../../data/authors';
import { topicLabel } from '../../data/site';

type OgProps = {
  eyebrow: string;
  title: string;
  byline?: string;
};

export const getStaticPaths = (async () => {
  const pages: { key: string; props: OgProps }[] = [
    { key: 'home', props: { eyebrow: 'M&A transition · Transformation · Cost reduction · Sydney · Melbourne · Brisbane', title: 'We plan and run separations, integrations and the transformation that follows.' } },
    { key: 'services', props: { eyebrow: 'Services', title: 'Two practices, one team. Deal-driven or standalone.' } },
    { key: 'about', props: { eyebrow: 'About', title: 'Built by practitioners. Delivered by partners.' } },
    { key: 'contact', props: { eyebrow: 'Contact', title: 'Talk to a partner.' } },
    { key: 'contact-thanks', props: { eyebrow: 'Contact', title: 'Thank you. A partner will reply.' } },
    { key: 'privacy', props: { eyebrow: 'Privacy policy', title: 'How we handle personal information.' } },
  ];
  const insights = await getPublishedInsights();
  if (insights.length) {
    pages.push({ key: 'insights', props: { eyebrow: 'Insights', title: 'What we are seeing on deals.' } });
    for (const t of await publishedTopics()) {
      pages.push({ key: `insights-topic-${t}`, props: { eyebrow: `Insights · ${topicLabel(t)}`, title: 'What we are seeing on deals.' } });
    }
    for (const i of insights) {
      const a = authors[i.data.author];
      pages.push({
        key: `insights-${i.id}`,
        props: { eyebrow: `Insights · ${topicLabel(i.data.topic)}`, title: i.data.title, byline: `${a.name}, ${a.role}` },
      });
    }
  }
  return pages.map(({ key, props }) => ({ params: { key }, props }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as OgProps);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
