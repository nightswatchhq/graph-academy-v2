export const SITE = {
  name: 'The Graph Academy',
  domain: 'learn-thegraph.com',
  url: 'https://learn-thegraph.com',
  tagline: 'Learn The Graph, by role, from first principles.',
  description:
    'A community-owned learning site for The Graph. Role-based paths, worked economic examples and exercises, checked against the Horizon-era protocol and stamped with the date somebody checked.',
  repo: 'https://github.com/nightswatchhq/graph-academy-v2',
  contentLicense: 'CC-BY-4.0',
  codeLicense: 'MIT',
} as const;

/** Where the site sends people for reference material and for live data. */
export const OUTBOUND = {
  docs: 'https://thegraph.com/docs/en/',
  explorer: 'https://thegraph.com/explorer',
  studio: 'https://thegraph.com/studio/',
  lodestar: 'https://www.lodestar-dashboard.com',
  forum: 'https://forum.thegraph.com',
  gips: 'https://github.com/graphprotocol/graph-improvement-proposals',
} as const;
