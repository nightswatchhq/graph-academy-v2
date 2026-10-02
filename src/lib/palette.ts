import { getCollection } from 'astro:content';
import { COLLECTIONS, allEntries, collectionOf, hubOf, urlOf } from './paths';
import { GLOSSARY, slugify } from './glossary';
import { params, paramGroups } from './params';

export type PaletteKind = 'page' | 'entry' | 'term' | 'param' | 'dispatch';

export interface PaletteItem {
  kind: PaletteKind;
  title: string;
  url: string;
  /** The second line of a row. Matched, at a lower weight than the title. */
  note: string;
  /** The stamped label on the right: a shelf, a value, a date. */
  tag?: string;
  /** Other names for the same thing. Matched, never shown. */
  also?: string;
}

/**
 * Pages that are not an entry, a dispatch or a collection. Written out by hand,
 * so scripts/check-links.mjs resolves every URL in the built index, and a page
 * that is renamed fails the build's link check rather than the reader.
 */
const PAGES: Omit<PaletteItem, 'kind'>[] = [
  { title: 'The whole catalogue', url: '/catalogue/', note: 'Every collection, every entry, and what each one covers', also: 'paths index courses' },
  { title: 'Diagnose', url: '/diagnose/', note: 'A symptom index: what you are seeing and what usually causes it', also: 'something is wrong troubleshoot problem' },
  { title: 'Dispatches', url: '/dispatches/', note: 'Dated writing: guides, analysis and field notes', also: 'blog posts intel feed' },
  { title: 'Glossary', url: '/glossary/', note: 'Every term, including the obsolete ones', also: 'definitions' },
  { title: 'Parameters', url: '/parameters/', note: 'Every number, sourced and dated', also: 'registry numbers values' },
  { title: 'Parameter history', url: '/parameters/history/', note: 'What each value was, and what changed it' },
  { title: 'Changelog', url: '/changelog/', note: 'What changed in the protocol, and where this site has been wrong' },
  { title: 'About', url: '/about/', note: 'What this site is, who owns it, and how it is kept from rotting' },
  { title: 'Contribute', url: '/contribute/', note: 'Write an entry, fix a parameter, or settle a recorded contradiction' },
];

/** Everything the palette can match without the full-text index. */
export async function paletteIndex(): Promise<PaletteItem[]> {
  const pages: PaletteItem[] = [
    ...COLLECTIONS.map((c) => ({
      kind: 'page' as const,
      title: c.title,
      url: `/${c.hub}/`,
      note: c.blurb,
      tag: c.kicker,
      also: `${c.path} ${c.hub}`,
    })),
    ...PAGES.map((p) => ({ kind: 'page' as const, ...p })),
  ];

  const entries: PaletteItem[] = (await allEntries()).map((e) => ({
    kind: 'entry',
    title: e.data.title,
    url: urlOf(e),
    note: e.data.summary,
    tag: collectionOf(hubOf(e)).path,
  }));

  const terms: PaletteItem[] = GLOSSARY.map((t) => ({
    kind: 'term',
    title: t.term,
    url: `/glossary/#${slugify(t.term)}`,
    note: t.def,
    tag: t.obsolete ? 'obsolete' : undefined,
    also: t.aliases?.join(' '),
  }));

  // A number never travels without the date somebody read it, here included.
  const registry: PaletteItem[] = paramGroups.flatMap((g) =>
    g.keys.map((key) => {
      const p = params[key];
      return {
        kind: 'param' as const,
        title: p.label,
        url: `/parameters/#${key}`,
        note: `${p.status}, read ${p.verified}`,
        tag: p.display,
        also: `${key.replace(/_/g, ' ')} ${p.display}`,
      };
    }),
  );

  const dispatches: PaletteItem[] = (await getCollection('dispatches'))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((d) => ({
      kind: 'dispatch',
      title: d.data.title,
      url: `/dispatches/${d.id}/`,
      note: d.data.excerpt,
      tag: d.data.date.toISOString().slice(0, 10),
      also: d.data.tags.join(' '),
    }));

  return [...pages, ...entries, ...terms, ...registry, ...dispatches];
}
