import { visitParents } from 'unist-util-visit-parents';
import { GLOSSARY, slugify } from './glossary.ts';

// Ancestors whose text is never rewritten. Headings are excluded because a link
// inside a heading fights the anchor affordance; code and pre because a term
// inside a command is not a term; a because nested anchors are invalid.
const SKIP = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'kbd', 'summary']);

// Longest name first, so "delegation tax" claims the phrase before "delegation"
// can eat half of it.
const ENTRIES = GLOSSARY.flatMap((t) =>
  [t.term, ...(t.aliases ?? [])].map((name) => ({
    name,
    slug: slugify(t.term),
    re: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  })),
).sort((a, b) => b.name.length - a.name.length);

/**
 * Links the first occurrence of each glossary term in a lesson to its entry.
 * First occurrence only: linking every mention turns a paragraph into a field
 * of blue and stops carrying information.
 *
 * Collection and mutation are separated deliberately. Splicing a parent's
 * children while the tree is being walked makes the walk's position meaningless,
 * which is how the first attempt at this silently linked one term per page.
 */
export function rehypeGlossary() {
  return (tree, file) => {
    const path = String(file?.history?.[0] ?? '');
    if (!path.includes('/content/lessons/')) return;

    const targets = [];
    visitParents(tree, 'text', (node, ancestors) => {
      if (ancestors.some((a) => a.type === 'element' && SKIP.has(a.tagName))) return;
      const parent = ancestors[ancestors.length - 1];
      if (!parent || !Array.isArray(parent.children)) return;
      targets.push({ node, parent });
    });

    const linked = new Set();
    for (const { node, parent } of targets) {
      for (const entry of ENTRIES) {
        if (linked.has(entry.slug)) continue;
        const m = entry.re.exec(node.value);
        if (!m) continue;

        const index = parent.children.indexOf(node);
        if (index === -1) break; // already rewritten out of this parent

        parent.children.splice(
          index,
          1,
          { type: 'text', value: node.value.slice(0, m.index) },
          {
            type: 'element',
            tagName: 'a',
            properties: { href: `/glossary/#${entry.slug}`, className: ['gloss-link'] },
            children: [{ type: 'text', value: m[0] }],
          },
          { type: 'text', value: node.value.slice(m.index + m[0].length) },
        );
        linked.add(entry.slug);
        break; // one rewrite per text node keeps the remaining offsets valid
      }
    }
  };
}
