import { getCollection, type CollectionEntry } from 'astro:content';
import { GLOSSARY } from './glossary';

export type Entry = CollectionEntry<'entries'>;

export interface CollectionMeta {
  /** Matches the `path` frontmatter field and the URL segment. */
  hub: string;
  path: string;
  title: string;
  kicker: string;
  /** One line for a card. The lede is for the path landing page. */
  blurb: string;
  lede: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Ordered section names. An entry whose section is not listed fails the build. */
  modules: string[];
  /** Where this role goes for live numbers. */
  live?: { label: string; url: string };
  /** Where this role goes for the procedure. */
  docs: { label: string; url: string };
}

export const COLLECTIONS: CollectionMeta[] = [
  {
    hub: 'start',
    blurb: 'What the protocol is for, who does the work, and where the money moves.',
    path: 'Foundations',
    title: 'Start here',
    kicker: 'Path A',
    lede:
      'What The Graph actually indexes, who does the work, and where the money moves. No prior knowledge of the protocol assumed.',
    difficulty: 'beginner',
    modules: ['The problem', 'The roles', 'The services', 'Practicum'],
    docs: { label: 'Official getting started', url: 'https://thegraph.com/docs/en/subgraphs/quick-start/' },
  },
  {
    hub: 'delegators',
    blurb: 'Put GRT behind an indexer and understand what you actually take home.',
    path: 'Delegator',
    title: 'Delegators',
    kicker: 'Path B',
    lede:
      'Put GRT behind an indexer and understand what you actually take home. The cut, the thaw, the risk that is switched off and the risk that is not.',
    difficulty: 'beginner',
    modules: ['What delegation is', 'The economics', 'Managing your delegation', 'Practicum'],
    live: { label: 'Compare indexers on Lodestar', url: 'https://www.lodestar-dashboard.com/delegate' },
    docs: { label: 'Official delegating guide', url: 'https://thegraph.com/docs/en/resources/roles/delegating/delegating/' },
  },
  {
    hub: 'curators',
    blurb: 'Signal on the data worth indexing. A bet on future query demand.',
    path: 'Curator',
    title: 'Curators',
    kicker: 'Path C',
    lede:
      'Signal tells indexers which subgraphs are worth serving. It is a bet on future query demand, and on Arbitrum the shape of that bet changed.',
    difficulty: 'intermediate',
    modules: ['What signal does', 'The mechanics', 'Strategy and risk', 'Practicum'],
    live: { label: 'Curation data on Lodestar', url: 'https://www.lodestar-dashboard.com/curate' },
    docs: { label: 'Official curating guide', url: 'https://thegraph.com/docs/en/resources/roles/curating/' },
  },
  {
    hub: 'indexers',
    blurb: 'Run the machines, provision stake, prove the work, get paid without trust.',
    path: 'Indexer',
    title: 'Indexers',
    kicker: 'Path D',
    lede:
      'Run the stack, provision stake against a data service, prove you did the work, and get paid without anyone having to trust you.',
    difficulty: 'advanced',
    modules: ['The job', 'The economics', 'Horizon mechanics', 'Operations', 'Practicum'],
    live: { label: 'Indexing status on Lodestar', url: 'https://www.lodestar-dashboard.com/indexing-status' },
    docs: { label: 'Official indexing overview', url: 'https://thegraph.com/docs/en/indexing/overview/' },
  },
  {
    hub: 'developers',
    blurb: 'Author subgraphs, Substreams and Token API queries. Pick the right lane.',
    path: 'Developer',
    title: 'Developers',
    kicker: 'Path E',
    lede:
      'Author a subgraph, or decide you want Substreams or the Token API instead. Three lanes onto the same data, with different costs.',
    difficulty: 'intermediate',
    modules: ['Subgraphs', 'Practice', 'The other lanes', 'Choosing', 'Practicum'],
    live: { label: 'Subgraph Dock on Lodestar', url: 'https://www.lodestar-dashboard.com/subgraph-dock' },
    docs: { label: 'Official developer docs', url: 'https://thegraph.com/docs/en/subgraphs/developing/introduction/' },
  },
  {
    hub: 'consumers',
    blurb: 'An endpoint that stays up, a bill you understand, a query that returns.',
    path: 'App builder',
    title: 'App builders',
    kicker: 'Path G',
    lede:
      'You are not writing a subgraph. You want an endpoint that stays up, a bill you understand, and a query that returns.',
    difficulty: 'beginner',
    modules: ['Getting data', 'Paying for it', 'Practicum'],
    docs: { label: 'Official querying guide', url: 'https://thegraph.com/docs/en/subgraphs/querying/introduction/' },
  },
  {
    hub: 'ecosystem',
    blurb: 'The software the network actually runs on, and who maintains which part.',
    path: 'Ecosystem',
    title: 'The ecosystem',
    kicker: 'Collection H',
    lede:
      'Every layer of this protocol is somebody\'s repository. This collection maps them: what each piece does, which lane it belongs to, and who is on the hook when it breaks.',
    difficulty: 'intermediate',
    modules: ['The core stack', 'Indexing', 'Serving', 'Authoring', 'Data services', 'Operating', 'Practicum'],
    docs: { label: 'The Graph on GitHub', url: 'https://github.com/graphprotocol' },
  },
  {
    hub: 'governance',
    blurb: 'GIPs, the Council, arbitration, and where the issuance actually goes.',
    path: 'Governance',
    title: 'Governance',
    kicker: 'Path F',
    lede:
      'How a change to the protocol actually ships, who can stop it, and where the issuance goes. The part of the protocol that is people.',
    difficulty: 'intermediate',
    modules: ['How change ships', 'Decisions', 'Who decides', 'Disputes', 'The money', 'Practicum'],
    live: { label: 'Protocol state on Lodestar', url: 'https://www.lodestar-dashboard.com/protocol' },
    docs: { label: 'GIP repository', url: 'https://github.com/graphprotocol/graph-improvement-proposals' },
  },
];

export function collectionOf(hub: string): CollectionMeta {
  const c = COLLECTIONS.find((x) => x.hub === hub);
  if (!c) throw new Error(`No collection registered for hub "${hub}"`);
  return c;
}

export function hubOf(entry: Entry): string {
  return entry.id.split('/')[0];
}

export function urlOf(entry: Entry): string {
  return `/${entry.id}/`;
}

/** Published entries in a collection, in reading order. */
export async function entriesInCollection(hub: string): Promise<Entry[]> {
  const meta = collectionOf(hub);
  const all = await getCollection('entries', ({ data, id }) => !data.draft && id.startsWith(`${hub}/`));
  for (const e of all) {
    if (!meta.modules.includes(e.data.module)) {
      throw new Error(
        `Entry "${e.id}" declares section "${e.data.module}", which is not in the ${meta.path} collection. ` +
          `Known sections: ${meta.modules.join(', ')}`,
      );
    }
  }
  return all.sort((a, b) => {
    const m = meta.modules.indexOf(a.data.module) - meta.modules.indexOf(b.data.module);
    return m !== 0 ? m : a.data.order - b.data.order;
  });
}

export interface Section {
  name: string;
  entries: Entry[];
}

export async function sectionsInCollection(hub: string): Promise<Section[]> {
  const meta = collectionOf(hub);
  const entries = await entriesInCollection(hub);
  return meta.modules
    .map((name) => ({ name, entries: entries.filter((e) => e.data.module === name) }))
    .filter((s) => s.entries.length > 0);
}

export async function neighbours(entry: Entry) {
  const siblings = await entriesInCollection(hubOf(entry));
  const i = siblings.findIndex((e) => e.id === entry.id);
  return {
    prev: i > 0 ? siblings[i - 1] : undefined,
    next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : undefined,
    index: i,
    total: siblings.length,
  };
}

export async function collectionReadingTime(hub: string): Promise<number> {
  const entries = await entriesInCollection(hub);
  return entries.reduce((n, e) => n + e.data.time_minutes, 0);
}

/** Every entry on the site, for the catalogue. */
export async function allEntries(): Promise<Entry[]> {
  const out: Entry[] = [];
  for (const c of COLLECTIONS) out.push(...(await entriesInCollection(c.hub)));
  return out;
}

/**
 * Entries related to this one, by what they actually have in common rather than
 * by an editor's guess: shared protocol parameters first, then shared glossary
 * subject matter. Cross-collection matches are the point. A delegator reading
 * about the thawing period should be able to fall sideways into why the thaw
 * exists, which lives under disputes.
 */
export async function relatedEntries(entry: Entry, limit = 4): Promise<Entry[]> {
  const all = await allEntries();
  const mine = new Set(entry.data.parameters_used);
  const explicit = new Set(entry.data.see_also ?? []);
  const mySubjects = subjectsOf(entry);

  const scored = all
    .filter((e) => e.id !== entry.id)
    .map((e) => {
      let score = 0;
      if (explicit.has(`/${e.id}/`)) score += 100;
      for (const k of e.data.parameters_used) if (mine.has(k)) score += 3;
      // an entry with no parameters is not unrelated, it is unquantified. Shared
      // subject matter, measured by which glossary terms both entries actually
      // discuss, catches the conceptual entries the registry cannot see.
      for (const t of subjectsOf(e)) if (mySubjects.has(t)) score += 1;
      // an entry in another collection that shares ground is more useful than a
      // neighbour the reader is about to reach anyway
      if (hubOf(e) !== hubOf(entry) && score > 0) score += 2;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));

  return scored.slice(0, limit).map((x) => x.e);
}

/** Glossary terms an entry actually discusses, as a crude subject fingerprint. */
const SUBJECT_CACHE = new Map<string, Set<string>>();
function subjectsOf(entry: Entry): Set<string> {
  const hit = SUBJECT_CACHE.get(entry.id);
  if (hit) return hit;
  const hay = `${entry.data.title} ${entry.data.summary} ${entry.body ?? ''}`.toLowerCase();
  const out = new Set<string>();
  for (const t of GLOSSARY) {
    for (const name of [t.term, ...(t.aliases ?? [])]) {
      if (hay.includes(name.toLowerCase())) { out.add(t.term); break; }
    }
  }
  SUBJECT_CACHE.set(entry.id, out);
  return out;
}
