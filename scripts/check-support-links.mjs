#!/usr/bin/env node
// Confirms every graph-support issue referenced from the symptom index still
// exists, and prints what each one is actually called.
//
// The `worked` field on a Symptom is the only place this repository asserts a
// fact about another repository. Nothing else would notice an issue being
// deleted, renumbered, or quietly turning into something else, and a symptom
// index that cites a dead thread is worse than one that cites nothing: it
// looks corroborated.
//
// Unauthenticated GitHub allows 60 requests an hour, which is plenty for one
// listing call. CI passes GITHUB_TOKEN, which raises it.
import { readFileSync } from 'node:fs';
import { c } from './lib.mjs';

// Read the repo out of support.ts rather than importing it, so this runs on
// plain node with no TypeScript loader. One source of truth either way.
const supportSrc = readFileSync(new URL('../src/lib/support.ts', import.meta.url), 'utf8');
const repoMatch = supportSrc.match(/repo:\s*'https:\/\/github\.com\/([^']+)'/);
if (!repoMatch) {
  console.log('fail    could not find the repo URL in src/lib/support.ts');
  process.exit(1);
}
const REPO = repoMatch[1];
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

// Read the numbers straight out of the source. Importing diagnostics.ts would
// mean compiling TypeScript for a regex's worth of work.
const src = readFileSync(new URL('../src/lib/diagnostics.ts', import.meta.url), 'utf8');
const cited = [...src.matchAll(/\{\s*n:\s*(\d+),\s*was:\s*'([^']*)'/g)]
  .map(([, n, was]) => ({ n: Number(n), was }));

if (cited.length === 0) {
  console.log(`${c.yellow}warn${c.reset}    no worked cases cited. Either none exist yet, or the parser has drifted.`);
  process.exit(0);
}

const headers = { accept: 'application/vnd.github+json', 'user-agent': 'graph-academy-link-check' };
if (token) headers.authorization = `Bearer ${token}`;

let issues;
try {
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  issues = await res.json();
} catch (e) {
  // Not reachable is not the same as all fine. Say which one happened.
  console.log(`${c.yellow}skip${c.reset}    could not reach the GitHub API (${e.message}). Nothing was checked.`);
  process.exit(process.env.CI ? 1 : 0);
}

const byNumber = new Map(issues.map((i) => [i.number, i]));
const missing = [];

console.log(`${c.bold}graph-support citations${c.reset}`);
console.log(`${c.dim}${cited.length} worked cases cited from the symptom index${c.reset}\n`);

for (const { n, was } of cited.sort((a, b) => a.n - b.n)) {
  const issue = byNumber.get(n);
  if (!issue) {
    missing.push(`#${n} ("${was}") is cited but does not exist in ${REPO}`);
    console.log(`  ${c.red}!${c.reset} #${String(n).padEnd(4)} ${c.red}not found${c.reset}`);
    continue;
  }
  console.log(`  ${c.green}=${c.reset} #${String(n).padEnd(4)} ${issue.state.padEnd(6)} ${issue.title.slice(0, 68)}`);
}

console.log();
for (const m of missing) console.log(`${c.red}dead${c.reset}    ${m}`);
console.log(
  `\n${missing.length === 0 ? `${c.green}ok${c.reset}   ` : `${c.red}fail${c.reset} `}` +
    `   ${cited.length} citations, ${missing.length} dead`,
);
process.exit(missing.length > 0 ? 1 : 0);
