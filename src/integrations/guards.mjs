// Build guard: fail the build if any page still shows a square-bracket
// placeholder from the designs, such as [launch date], [Date] or [2 weeks].
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (p.endsWith('.html')) yield p;
  }
}

export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/\s+/g, ' ');
}

// A placeholder is any short bracketed phrase in visible text, plus the
// specific markers from the brief wherever they appear.
const PLACEHOLDER = /\[[^\]\[]{1,80}\]|\bTODO\b/g;

export function findPlaceholders(html) {
  return [...visibleText(html).matchAll(PLACEHOLDER)].map((m) => m[0]);
}

export function placeholderGuard() {
  return {
    name: 'glideslope-placeholder-guard',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const problems = [];
        for (const file of htmlFiles(root)) {
          const found = findPlaceholders(readFileSync(file, 'utf8'));
          if (found.length) problems.push(`  ${relative(root, file)}: ${[...new Set(found)].join(', ')}`);
        }
        if (problems.length) {
          throw new Error(
            `Placeholder text found in built pages. Resolve or remove it before publishing:\n${problems.join('\n')}`,
          );
        }
        logger.info('No placeholder text in built pages.');
      },
    },
  };
}
