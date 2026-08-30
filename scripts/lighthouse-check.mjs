#!/usr/bin/env node
// Audits a representative page of each shape against a budget, and fails the
// build when one regresses.
//
// What is gated and what is only reported, and why:
//
//   accessibility, best-practices  GATED. Both are DOM assertions. They give the
//       same answer on any machine, so a failure is always a real defect. This is
//       the pair that caught nine contrast violations the bespoke audit passed.
//
//   performance  REPORTED ONLY. Lighthouse's performance score is CPU-bound and
//       shared CI runners are slow and variable: this suite scores 100 on a
//       laptop and 81 on a GitHub runner, with the gap entirely in
//       total-blocking-time, speed-index and max-potential-fid. Gating on it
//       produces flaky failures that no change to this repository can fix.
//       Measure performance against the real deployment instead, with
//       `LH_BASE=https://learn-thegraph.com npm run lighthouse`.
//
//   seo  REPORTED ONLY. The only audit that fails is `is-crawlable`, and on a
//       *.vercel.app URL that is Vercel's own `x-robots-tag: noindex` rather than
//       anything in this repository. It scores 100 against a local preview.
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
const GATED = { accessibility: 100, 'best-practices': 95 };
const REPORTED = ['performance', 'seo'];

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
  const gated = Object.entries(GATED)
    .map(([k, min]) => `${k} ${scores[k]}${scores[k] < min ? '<' + min : ''}`)
    .join('  ');
  const noted = REPORTED.map((k) => `${k} ${scores[k]}`).join('  ');
  console.log(`  ${label.padEnd(14)} ${gated}   [${noted}, reported only]`);

  for (const [cat, min] of Object.entries(GATED)) {
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
    `    ${PAGES.length} pages audited. accessibility and best-practices gated; ` +
      `performance and seo reported.`,
);
process.exit(failures.length > 0 ? 1 : 0);
