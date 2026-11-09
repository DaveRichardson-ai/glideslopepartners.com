// Rehype plugin for insight articles:
// - wraps tables in a keyboard-focusable, horizontally scrollable region
// - marks external links for click tracking and adds rel="noopener"


function walk(node, fn, parent = null, index = 0) {
  fn(node, parent, index);
  if (node.children) {
    // Iterate over a copy so wrapping does not disturb traversal.
    [...node.children].forEach((child) => walk(child, fn, node, node.children.indexOf(child)));
  }
}

export function rehypeArticle() {
  return (tree) => {
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
      if (node.tagName === 'a' && typeof node.properties?.href === 'string' && /^https?:\/\//.test(node.properties.href)) {
        node.properties.rel = ['noopener'];
        node.properties.dataTrack = 'outbound';
        node.properties.dataTrackLabel = new URL(node.properties.href).hostname;
      }
    });
  };
}
