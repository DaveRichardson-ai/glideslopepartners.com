import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// INSIGHTS_DIR lets tests build against fixture content.
const base = process.env.INSIGHTS_DIR || './src/content/insights';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1).max(160, 'description must be 160 characters or fewer'),
      slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
      topic: z.string().regex(/^[a-z0-9-]+$/, 'topic must be lower-case, e.g. "wealth"'),
      author: z.enum(['david-richardson', 'philip-hyde']),
      publishDate: z.coerce.date().nullable(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean(),
      // Pins the article to the top of the Insights page (and its topic page).
      featured: z.boolean().optional(),
    })
    .superRefine((d, ctx) => {
      if (!d.draft && d.publishDate === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishDate'],
          message: 'A published article (draft: false) needs a publishDate, e.g. publishDate: 2026-11-17',
        });
      }
    }),
});

export const collections = { insights };
