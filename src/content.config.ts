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
const lesson = z.object({
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
  authors: z.array(z.string()).default(['@community']),
  reviewers: z.array(z.string()).default([]),
  license: z.string().default('CC-BY-4.0'),
  draft: z.boolean().default(false),
});

export const collections = {
  lessons: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
    schema: lesson,
  }),
};
