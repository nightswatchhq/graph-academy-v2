#!/usr/bin/env node
// Builds the retrieval index the chat function grounds itself on.
//
// Stuffing all 104k words into every request costs about $0.28 per question on
// Sonnet 5, which is $281/day at a thousand questions. So the bot retrieves:
// a small always-present index of what exists, plus the few sections actually
// relevant to the question.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, paramEntries } from './lib.mjs';

const STOP = new Set(('a an the and or but if then than that this these those of in on at to for with '
  + 'from by as is are was were be been being it its it\'s you your we our they their he she i not no '
  + 'do does did have has had can could should would will may might must about into over under just '
  + 'so such only also more most other some any each which who whom what when where why how').split(' '));

const tokenize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9_\- ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [{}, src];
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return [data, src.slice(m[0].length)];
}

/** Split a body into sections at h2 boundaries, so a chunk is a whole thought. */
function sections(body) {
  const stripped = body
    .replace(/<Quiz[\s\S]*?\n\/>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<Param\s+name="([a-z0-9_]+)"[^>]*\/>/g, (_, k) => `[${k}]`)
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n');
  const parts = stripped.split(/\n## /);
  const out = [];
  for (const [i, p] of parts.entries()) {
    const text = (i === 0 ? p : `## ${p}`).trim();
    if (text.length < 200) continue;
    const heading = i === 0 ? 'Introduction' : p.split('\n')[0].trim();
    out.push({ heading, text: text.slice(0, 2400) });
  }
  return out;
}

const chunks = [];

for (const f of walk(join(ROOT, 'src/content/entries'))) {
  const [fm, body] = frontmatter(readFileSync(f, 'utf8'));
  const id = f.split('/src/content/entries/')[1].replace(/\.mdx$/, '');
  for (const s of sections(body)) {
    chunks.push({
      kind: 'entry',
      title: fm.title,
      section: s.heading,
      url: `/${id}/`,
      verified: fm.last_verified ?? null,
      text: s.text,
      terms: tokenize(`${fm.title} ${s.heading} ${fm.summary ?? ''} ${s.text}`),
    });
  }
}

for (const f of walk(join(ROOT, 'src/content/dispatches'), '.md')) {
  const [fm, body] = frontmatter(readFileSync(f, 'utf8'));
  const slug = f.split('/').pop().replace(/\.md$/, '');
  for (const s of sections(body)) {
    chunks.push({
      kind: 'dispatch',
      title: fm.title,
      section: s.heading,
      url: `/dispatches/${slug}/`,
      date: fm.date ?? null,
      text: s.text,
      terms: tokenize(`${fm.title} ${s.heading} ${s.text}`),
    });
  }
}

// The registry goes in the always-present prompt rather than the retrieval pool.
// It is small, it is the most valuable thing here, and a bot that gets a number
// wrong is worse than one that says it does not know.
const registry = paramEntries.map(([k, p]) => ({
  key: k,
  label: p.label,
  value: p.display,
  status: p.status,
  verified: p.verified,
  source: p.source,
  note: p.note ? p.note.replace(/\s+/g, ' ').trim().slice(0, 320) : undefined,
}));

// A one-line index of everything, so the bot can point at a page it did not retrieve.
const index = [...new Map(
  chunks.map((c) => [c.url, { title: c.title, url: c.url, kind: c.kind }]),
).values()];

const out = { builtAt: new Date().toISOString().slice(0, 10), registry, index, chunks };
writeFileSync(join(ROOT, 'api/_knowledge.json'), JSON.stringify(out));

const bytes = readFileSync(join(ROOT, 'api/_knowledge.json')).length;
const idxTokens = Math.round((JSON.stringify(registry).length + JSON.stringify(index).length) / 4);
console.log(`chunks: ${chunks.length}`);
console.log(`index pages: ${index.length}`);
console.log(`registry entries: ${registry.length}`);
console.log(`file: ${(bytes / 1024).toFixed(0)}KB`);
console.log(`always-present prompt: about ${idxTokens} tokens (cached)`);
