#!/usr/bin/env node
// Reports lessons past their re-verification date and parameters nobody has
// read in a while. Runs nightly. The failure is the product: the 2022 site
// rotted silently because nothing ever went red.
import { join } from 'node:path';
import { ROOT, paramEntries, walk, frontmatter, rel, days, c } from './lib.mjs';

const MAX_PARAM_AGE_DAYS = 90;
const today = new Date();
const strict = process.argv.includes('--strict');

const lessons = walk(join(ROOT, 'src/content/lessons')).map(frontmatter);
const overdue = lessons
  .filter((l) => l.data.verify_before && new Date(l.data.verify_before) < today)
  .sort((a, b) => String(a.data.verify_before).localeCompare(String(b.data.verify_before)));

const staleParams = paramEntries
  .filter(([, p]) => days(today, new Date(p.verified)) > MAX_PARAM_AGE_DAYS)
  .sort((a, b) => String(a[1].verified).localeCompare(String(b[1].verified)));

const disputed = paramEntries.filter(([, p]) => p.conflict === true);

console.log(`${c.bold}freshness report${c.reset}  ${today.toISOString().slice(0, 10)}`);
console.log(`${c.dim}${lessons.length} lessons, ${paramEntries.length} parameters${c.reset}\n`);

if (overdue.length === 0) {
  console.log(`${c.green}ok${c.reset}    0 lessons past their re-verification date`);
} else {
  console.log(`${c.yellow}stale${c.reset} ${overdue.length} lessons past their re-verification date`);
  for (const l of overdue) {
    console.log(`      ${rel(l.file)}  due ${l.data.verify_before}, ${days(today, new Date(l.data.verify_before))} days ago`);
  }
}

if (staleParams.length === 0) {
  console.log(`${c.green}ok${c.reset}    0 parameters older than ${MAX_PARAM_AGE_DAYS} days`);
} else {
  console.log(`${c.yellow}stale${c.reset} ${staleParams.length} parameters older than ${MAX_PARAM_AGE_DAYS} days`);
  for (const [k, p] of staleParams) {
    console.log(`      ${k}  read ${p.verified}, ${days(today, new Date(p.verified))} days ago`);
  }
}

console.log(`${c.dim}note${c.reset}  ${disputed.length} parameters where official sources contradict each other, recorded not hidden`);
for (const [k] of disputed) console.log(`      ${k}`);

const failures = overdue.length + staleParams.length;
if (failures > 0 && strict) {
  console.log(`\n${c.red}fail${c.reset}  ${failures} items need re-verification`);
  process.exit(1);
}
process.exit(0);
