// Post-build files that depend on the build date or on other integrations.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function postBuild({ site, email }) {
  return {
    name: 'glideslope-post-build',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);

        // security.txt (RFC 9116), expiring one year after the build.
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        mkdirSync(join(out, '.well-known'), { recursive: true });
        writeFileSync(
          join(out, '.well-known', 'security.txt'),
          [
            `Contact: mailto:${email}`,
            `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, '.000Z')}`,
            'Preferred-Languages: en',
            `Canonical: ${site}/.well-known/security.txt`,
            '',
          ].join('\n'),
        );

        // The sitemap integration writes sitemap-index.xml and sitemap-0.xml.
        // Publish the URL set at /sitemap.xml as well, which robots.txt references.
        const src = join(out, 'sitemap-0.xml');
        if (existsSync(src)) copyFileSync(src, join(out, 'sitemap.xml'));
        else logger.warn('sitemap-0.xml not found; /sitemap.xml not written');
        logger.info('Wrote .well-known/security.txt and sitemap.xml');
      },
    },
  };
}
