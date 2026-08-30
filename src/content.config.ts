import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const ROLES = [
  'newcomer',
  'delegator',
  'curator',
  'indexer',
  'developer',
  'consumer',
  'governance',
] as const;

const source = z.object({
  name: z.string(),
  url: z.string().url(),
});

/**
 * Every lesson declares what it was checked against and when. The verify stamp
 * rendered on the page comes from these fields, and the staleness job reads
 * `verify_before` to decide which pages have gone off.
 */
const entry = z.object({
  title: z.string(),
  role: z.enum(ROLES),
  path: z.string(),
  module: z.string(),
  order: z.number().int(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  time_minutes: z.number().int().positive(),
  prerequisites: z.array(z.string()).default([]),
  summary: z.string().max(200),
  protocol_version_verified: z.string(),
  last_verified: z.coerce.date(),
  verify_before: z.coerce.date(),
  sources: z.array(source).min(1),
  parameters_used: z.array(z.string()).default([]),
  /** Explicit cross-references, as absolute paths. Ranked above computed ones. */
  see_also: z.array(z.string()).default([]),
  authors: z.array(z.string()).default(['@community']),
  reviewers: z.array(z.string()).default([]),
  license: z.string().default('CC-BY-4.0'),
  draft: z.boolean().default(false),
});

/**
 * Dispatches are the second kind of thing this library holds: dated writing,
 * moved here from the Lodestar Intel Feed. They are deliberately NOT entries.
 * An entry is a maintained fact with a re-verification date; a dispatch is a
 * snapshot of what was true and what somebody thought on the day it was
 * written, and it stays as written. The two must not be confused, so they get
 * different schemas, different templates and a different shelf.
 */
const dispatch = z.object({
  title: z.string(),
  date: z.coerce.date(),
  author: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  excerpt: z.string(),
  /** Where it was originally published, if it was moved here. */
  originally: z.string().optional(),
});

export const collections = {
  entries: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/entries' }),
    schema: entry,
  }),
  // Loaded as Markdown, not MDX: the posts contain CLI placeholders and Rust
  // generics such as <DEPLOYMENT> and State<AppState>, and MDX would try to
  // read those as components.
  dispatches: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/dispatches' }),
    schema: dispatch,
  }),
};
