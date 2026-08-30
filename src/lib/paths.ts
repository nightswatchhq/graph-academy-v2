import { getCollection, type CollectionEntry } from 'astro:content';

export type Lesson = CollectionEntry<'lessons'>;

export interface PathMeta {
  /** Matches the `path` frontmatter field and the URL segment. */
  hub: string;
  path: string;
  title: string;
  kicker: string;
  /** One line for a card. The lede is for the path landing page. */
  blurb: string;
  lede: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Ordered module names. A lesson whose module is not listed fails the build. */
  modules: string[];
  /** Where this role goes for live numbers. */
  live?: { label: string; url: string };
  /** Where this role goes for the procedure. */
  docs: { label: string; url: string };
}

export const PATHS: PathMeta[] = [
  {
    hub: 'start',
    blurb: 'What the protocol is for, who does the work, and where the money moves.',
    path: 'Foundations',
    title: 'Start here',
    kicker: 'Path A',
    lede:
      'What The Graph actually indexes, who does the work, and where the money moves. No prior knowledge of the protocol assumed.',
    difficulty: 'beginner',
    modules: ['The problem', 'The roles', 'The services', 'Checkpoint'],
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
    modules: ['What delegation is', 'The economics', 'Managing your delegation', 'Checkpoint'],
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
    modules: ['What signal does', 'The mechanics', 'Strategy and risk', 'Checkpoint'],
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
    modules: ['The job', 'The economics', 'Horizon mechanics', 'Operations', 'Checkpoint'],
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
    modules: ['Subgraphs', 'The other lanes', 'Choosing', 'Checkpoint'],
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
    modules: ['Getting data', 'Paying for it', 'Checkpoint'],
    docs: { label: 'Official querying guide', url: 'https://thegraph.com/docs/en/subgraphs/querying/introduction/' },
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
    modules: ['How change ships', 'Who decides', 'Disputes', 'The money', 'Checkpoint'],
    live: { label: 'Protocol state on Lodestar', url: 'https://www.lodestar-dashboard.com/protocol' },
    docs: { label: 'GIP repository', url: 'https://github.com/graphprotocol/graph-improvement-proposals' },
  },
];

export function pathByHub(hub: string): PathMeta {
  const p = PATHS.find((x) => x.hub === hub);
  if (!p) throw new Error(`No path registered for hub "${hub}"`);
  return p;
}

export function hubOf(lesson: Lesson): string {
  return lesson.id.split('/')[0];
}

export function urlOf(lesson: Lesson): string {
  return `/${lesson.id}/`;
}

/** Published lessons for a hub, in curriculum order. */
export async function lessonsForHub(hub: string): Promise<Lesson[]> {
  const meta = pathByHub(hub);
  const all = await getCollection('lessons', ({ data, id }) => !data.draft && id.startsWith(`${hub}/`));
  for (const l of all) {
    if (!meta.modules.includes(l.data.module)) {
      throw new Error(
        `Lesson "${l.id}" declares module "${l.data.module}", which is not in the ${meta.path} path. ` +
          `Known modules: ${meta.modules.join(', ')}`,
      );
    }
  }
  return all.sort((a, b) => {
    const m = meta.modules.indexOf(a.data.module) - meta.modules.indexOf(b.data.module);
    return m !== 0 ? m : a.data.order - b.data.order;
  });
}

export interface Module {
  name: string;
  lessons: Lesson[];
}

export async function modulesForHub(hub: string): Promise<Module[]> {
  const meta = pathByHub(hub);
  const lessons = await lessonsForHub(hub);
  return meta.modules
    .map((name) => ({ name, lessons: lessons.filter((l) => l.data.module === name) }))
    .filter((m) => m.lessons.length > 0);
}

export async function neighbours(lesson: Lesson) {
  const siblings = await lessonsForHub(hubOf(lesson));
  const i = siblings.findIndex((l) => l.id === lesson.id);
  return {
    prev: i > 0 ? siblings[i - 1] : undefined,
    next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : undefined,
    index: i,
    total: siblings.length,
  };
}

export async function pathDuration(hub: string): Promise<number> {
  const lessons = await lessonsForHub(hub);
  return lessons.reduce((n, l) => n + l.data.time_minutes, 0);
}
