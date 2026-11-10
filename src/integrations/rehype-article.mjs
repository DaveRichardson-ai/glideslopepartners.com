// Rehype plugin for insight articles:
// - wraps tables in a keyboard-focusable, horizontally scrollable region
// - marks external links for click tracking and adds rel="noopener"
// - turns links to articles that are not live yet (draft or scheduled) into
//   plain text, so one article can name another before it publishes; the
//   link appears on the first build after the other article goes live
import { liveSlugs } from '../lib/schedule.mjs';

function walk(node, fn, parent = null, index = 0) {
  fn(node, parent, index);
  if (node.children) {
    // Iterate over a copy so wrapping does not disturb traversal.
    [...node.children].forEach((child) => walk(child, fn, node, node.children.indexOf(child)));
  }
}

export function rehypeArticle() {
  const dir = process.env.INSIGHTS_DIR || './src/content/insights';
  return (tree) => {
    const live = liveSlugs(dir);
    let tableCount = 0;
    walk(tree, (node, parent, index) => {
      if (node.type !== 'element') return;
      if (node.tagName === 'table' && parent && !(parent.properties?.className ?? []).includes('table-scroll')) {
        tableCount += 1;
        parent.children[index] = {
          type: 'element',
          tagName: 'figure',
          properties: {
            className: ['table-scroll'],
            tabIndex: 0,
            ariaLabel: `Table ${tableCount}, scrolls sideways on small screens`,
          },
          children: [node],
        };
      }
      // A header cell with no text (the corner of a comparison table) gets a
      // screen-reader label so every column header has a name.
      if (node.tagName === 'th' && !(node.children ?? []).some((c) => c.type === 'element' || (c.value ?? '').trim())) {
        node.children = [{ type: 'element', tagName: 'span', properties: { className: ['visually-hidden'] }, children: [{ type: 'text', value: 'Aspect' }] }];
      }
      const article = node.tagName === 'a' && String(node.properties?.href ?? '').match(/^\/insights\/([a-z0-9-]+)\/(#.*)?$/);
      if (article && article[1] !== 'topic' && !live.has(article[1]) && parent) {
        parent.children[index] = { type: 'element', tagName: 'span', properties: {}, children: node.children };
        return;
      }
      if (node.tagName === 'a' && typeof node.properties?.href === 'string' && /^https?:\/\//.test(node.properties.href)) {
        node.properties.rel = ['noopener'];
        node.properties.dataTrack = 'outbound';
        node.properties.dataTrackLabel = new URL(node.properties.href).hostname;
      }
    });
  };
}
