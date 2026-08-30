#!/usr/bin/env node
// Audits a representative page of each shape against a budget, and fails the
// build when one regresses.
//
// SEO is scored but not gated: the only audit that fails is `is-crawlable`, and
// on a preview or a *.vercel.app URL that is Vercel's own `x-robots-tag: noindex`
// rather than anything in this repository. Gating on it would fail every run for
// a reason nobody can fix here.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { c } from './lib.mjs';

const BASE = process.env.LH_BASE ?? 'http://localhost:4321';
const PAGES = [
  ['home', '/'],
  ['lesson', '/delegators/rewards-and-cuts/'],
  ['path landing', '/delegators/'],
  ['parameters', '/parameters/'],
  ['glossary', '/glossary/'],
];
const BUDGET = { performance: 95, accessibility: 100, 'best-practices': 95 };

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

const failures = [];
for (const [label, path] of PAGES) {
  const res = await lighthouse(`${BASE}${path}`, { port: chrome.port, output: 'json', logLevel: 'error' });
  const cats = res.lhr.categories;
  const scores = Object.fromEntries(
    Object.entries(cats).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]),
  );
  const line = Object.entries(BUDGET)
    .map(([k, min]) => `${k} ${scores[k]}${scores[k] < min ? '<' + min : ''}`)
    .join('  ');
  console.log(`  ${label.padEnd(14)} ${line}   seo ${scores.seo} (not gated)`);

  for (const [cat, min] of Object.entries(BUDGET)) {
    if (scores[cat] < min) {
      failures.push(`${label} (${path}): ${cat} ${scores[cat]}, budget ${min}`);
      for (const ref of cats[cat].auditRefs) {
        const a = res.lhr.audits[ref.id];
        if (a.score !== null && a.score < 1) {
          const sel = a.details?.items?.[0]?.node?.selector;
          failures.push(`    ${a.id}${sel ? ' at ' + sel : ''}`);
        }
      }
    }
  }
}
await chrome.kill();

for (const f of failures) console.log(`${c.red}fail${c.reset}  ${f}`);
console.log(
  `\n${failures.length === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
    `    ${PAGES.length} pages audited against the budget`,
);
process.exit(failures.length > 0 ? 1 : 0);
