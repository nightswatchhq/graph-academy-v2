#!/usr/bin/env node
// Registry integrity, and the contract between prose and registry:
//   - every parameter carries a source, a quote and a date somebody read it
//   - every <Param name="..."/> in a lesson resolves
//   - every key a lesson declares in parameters_used is actually used
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, registry, paramEntries, walk, frontmatter, rel, c } from './lib.mjs';

const errors = [];
const warnings = [];
const known = new Set(paramEntries.map(([k]) => k));
let skippedBlocks = 0;

for (const [key, p] of paramEntries) {
  const need = ['label', 'value', 'display', 'status', 'source', 'verified'];
  for (const f of need) {
    if (p[f] === undefined || p[f] === '') errors.push(`${key}: missing "${f}"`);
  }
  if (p.source && !/^https?:\/\//.test(p.source)) errors.push(`${key}: source is not a URL`);
  if (p.verified && Number.isNaN(Date.parse(p.verified))) errors.push(`${key}: verified is not a date`);
  if (!['current', 'deprecated', 'disputed'].includes(p.status)) {
    errors.push(`${key}: status "${p.status}" is not current, deprecated or disputed`);
  }
  if (!p.quote && p.status !== 'disputed') warnings.push(`${key}: no quote from the source`);
  if (p.note && !p.note_source && p.status === 'disputed') {
    warnings.push(`${key}: disputed but no note_source naming the conflicting page`);
  }
}

if (!registry.protocol_version) errors.push('registry: no protocol_version');

// A parameter in no group is not rendered on /parameters/ at all, so every
// <Param/> pointing at it becomes a link to an anchor that does not exist. The
// build stays green and the reader gets nothing, which is the exact failure
// this registry exists to prevent. Read the groups out of params.ts rather
// than duplicating them here, so there is still one list.
const groupSrc = readFileSync(join(ROOT, 'src/lib/params.ts'), 'utf8');
const grouped = new Set([...groupSrc.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));
for (const [key] of paramEntries) {
  if (!grouped.has(key)) {
    errors.push(`${key}: in the registry but in no paramGroups group, so /parameters/ never renders it`);
  }
}

const entries = walk(join(ROOT, 'src/content/entries')).map(frontmatter);
for (const l of entries) {
  const used = new Set([...l.body.matchAll(/<Param\s+name=["']([a-z0-9_]+)["']/g)].map((m) => m[1]));
  for (const k of used) {
    if (!known.has(k)) errors.push(`${rel(l.file)}: <Param name="${k}"/> is not in the registry`);
  }
  const declared = Array.isArray(l.data.parameters_used) ? l.data.parameters_used : [];
  for (const k of declared) {
    if (!known.has(k)) errors.push(`${rel(l.file)}: parameters_used lists unknown "${k}"`);
    else if (!used.has(k)) warnings.push(`${rel(l.file)}: declares "${k}" but never renders it`);
  }
  for (const k of used) {
    if (!declared.includes(k)) warnings.push(`${rel(l.file)}: renders "${k}" but omits it from parameters_used`);
  }
  // A hard-coded number where a registry parameter exists is the failure mode
  // that killed the old site. Catch the obvious ones.
  const literals = [
    [/\b100,?000 GRT\b/, 'min_indexer_self_stake'],
    [/\b28[- ]days?\b/i, 'undelegation_period_days or max_poi_staleness_days'],
    [/\b16x\b|\b16 times\b/i, 'max_delegation_ratio'],
    [/\b96\.584\b/, 'subgraph_service_issuance_per_block'],
    [/\b10,?000 GRT\b/, 'fisherman_dispute_deposit'],
    [/\b3,?000 GRT\b/, 'recommended_dev_signal'],
  ];
  // A worked example may legitimately use a round number that collides with a
  // protocol parameter. The author opts out per literal and says so in the file:
  //   {/* param-lint-allow: 10,000 GRT (illustrative reward, not the deposit) */}
  const allowed = [...l.body.matchAll(/param-lint-allow:\s*([^(\n*]+)/g)].map((m) => m[1].trim());
  // Quiz and Checklist take their content as JavaScript strings, so a component
  // cannot go inside them. Demanding <Param/> there would be demanding the
  // impossible, so the literal check skips those blocks. The trade-off is real:
  // numbers inside quiz answers are checked by a reviewer, not by this script.
  const prose = l.body.replace(/<(Quiz|Checklist)\b[\s\S]*?\n\/>/g, '');
  if (prose.length !== l.body.length) skippedBlocks += 1;
  for (const [re, key] of literals) {
    const m = prose.match(re);
    if (m && !allowed.some((a) => a.startsWith(m[0]))) {
      warnings.push(`${rel(l.file)}: hard-coded "${m[0]}", use <Param name="${key}"/> or add a param-lint-allow note`);
    }
  }
}

for (const w of warnings) console.log(`${c.yellow}warn${c.reset}  ${w}`);
for (const e of errors) console.log(`${c.red}error${c.reset} ${e}`);
if (skippedBlocks > 0) {
  console.log(
    `${c.dim}note${c.reset}  ${skippedBlocks} files contain Quiz or Checklist blocks whose ` +
      `numbers this script cannot check. A reviewer must.`,
  );
}
console.log(
  `\n${errors.length === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
    `    ${paramEntries.length} parameters, ${entries.length} entries, ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length > 0 ? 1 : 0);
