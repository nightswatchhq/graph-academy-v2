import { visit } from 'unist-util-visit';

/**
 * Marks every link that leaves the Academy. Two reasons: the reader should know
 * before clicking that they are being handed to the official docs or to a
 * dashboard, and the positioning of this site depends on those handoffs being
 * visible rather than disguised as internal navigation.
 */
export function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = String(node.properties?.href ?? '');
      if (!/^https?:\/\//i.test(href)) return;
      if (/(^|\.)learn-thegraph\.com/i.test(href)) return;
      const cls = node.properties.className ?? [];
      node.properties.className = Array.isArray(cls) ? [...cls, 'out'] : [cls, 'out'];
      node.properties.rel = 'external noopener';
    });
  };
}
