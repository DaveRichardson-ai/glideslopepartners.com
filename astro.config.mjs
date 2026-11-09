// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { fileURLToPath } from 'node:url';
import { tokensPlugin } from './src/integrations/tokens.mjs';
import { placeholderGuard } from './src/integrations/guards.mjs';
import { insightDates } from './src/integrations/insight-dates.mjs';
import { rehypeArticle } from './src/integrations/rehype-article.mjs';
import { postBuild } from './src/integrations/post-build.mjs';

const SITE = 'https://glideslopepartners.com';
const buildDate = new Date().toISOString();
const articleDates = insightDates();

// Pages that must never appear in the sitemap (they are noindex).
const NOINDEX = ['/contact/thanks/', '/404/'];

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  outDir: process.env.ASTRO_OUT_DIR || 'dist',
  build: {
    format: 'directory',
    // External stylesheets only, so the CSP needs no 'unsafe-inline'.
    inlineStylesheets: 'never',
    assets: '_assets',
  },
  compressHTML: true,
  markdown: {
    processor: unified({ rehypePlugins: [rehypeArticle], smartypants: true }),
  },
  devToolbar: { enabled: false },
  prefetch: false,
  image: {
    responsiveStyles: false,
  },
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX.some((p) => page === SITE + p),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const m = path.match(/^\/insights\/([^/]+)\/$/);
        item.lastmod = (m && articleDates[m[1]]) || buildDate;
        return item;
      },
    }),
    postBuild({ site: SITE, email: 'hello@glideslopepartners.com' }),
    placeholderGuard(),
  ],
  vite: {
    plugins: [tokensPlugin()],
    resolve: {
      alias: {
        '@fonts': fileURLToPath(new URL('./node_modules/', import.meta.url)),
      },
    },
    build: {
      // Older iPhones (iOS 14+) and other browsers from 2021 onwards.
      target: ['safari14', 'ios14', 'firefox100', 'chrome100', 'edge100'],
      cssTarget: ['safari14', 'ios14', 'firefox100', 'chrome100', 'edge100'],
      // Never inline scripts or fonts as data: URIs; the CSP blocks inline script.
      assetsInlineLimit: 0,
    },
  },
});
