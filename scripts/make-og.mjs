#!/usr/bin/env node
// Renders tools/og/card.html to public/og.png at 1200x630.
//
// Rendered in a real browser rather than composed in an image library, because
// the card uses the site's own tokens and its own self-hosted faces. Anything
// else would drift from the site it is advertising.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, c, paramEntries, walk, frontmatter, days } from './lib.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.log(`${c.red}fail${c.reset}  no Chromium found. Set CHROME_PATH.`);
  process.exit(1);
}

const card = join(ROOT, 'tools/og/card.html');
const out = join(ROOT, 'public/og.png');

// The card quotes three numbers about the library. They were written into the
// markup by hand and were seventeen entries and two contradictions out of date
// before anybody looked. Derive them from the same source the staleness report
// reads, so the share image cannot claim something the site does not.
const today = new Date();
const entries = walk(join(ROOT, 'src/content/entries')).map(frontmatter);
const stale = entries.filter(
  (l) => l.data.verify_before && new Date(l.data.verify_before) < today,
).length;
const conflicts = paramEntries.filter(([, p]) => p.conflict === true).length;
const staleParams = paramEntries.filter(
  ([, p]) => days(today, new Date(p.verified)) > 90,
).length;

const filled = readFileSync(card, 'utf8')
  .replace('{{ENTRIES}}', String(entries.length))
  .replace('{{STALE}}', String(stale + staleParams))
  .replace('{{CONFLICTS}}', String(conflicts));

if (filled.includes('{{')) {
  console.log(`${c.red}fail${c.reset}  a placeholder in card.html was not substituted`);
  process.exit(1);
}

// Rendered from a sibling file so the relative paths to tokens.css and the
// fonts still resolve.
const tmp = join(ROOT, 'tools/og/.card.rendered.html');
writeFileSync(tmp, filled);

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  // The faces are declared font-display: block, so text is invisible until they
  // load and a screenshot taken too early is a card with no words on it. That
  // happened, and looked like a successful render. Give the page virtual time
  // to finish loading them before the shot is taken.
  '--virtual-time-budget=8000',
  '--allow-file-access-from-files',
  '--window-size=1200,630',
  `--screenshot=${out}`,
  `file://${tmp}`,
], { stdio: 'pipe' });
unlinkSync(tmp);

if (!existsSync(out)) {
  console.log(`${c.red}fail${c.reset}  no image produced`);
  process.exit(1);
}
// Record what the image claims, so something can notice when it stops being
// true. The card drifted from 44 lessons to 63 without a word of complaint.
writeFileSync(
  join(ROOT, 'tools/og/rendered.json'),
  JSON.stringify({ entries: entries.length, stale: stale + staleParams, conflicts, rendered: today.toISOString().slice(0, 10) }, null, 2) + '\n',
);

const { size } = statSync(out);

// A card whose fonts had not loaded rendered at 6.9KB and exited zero: the
// layout was perfect and every word was missing. Byte size is a crude proxy for
// "has text on it" and a crude proxy is worth a great deal more than nothing.
const FLOOR_KB = 20;
if (size / 1024 < FLOOR_KB) {
  console.log(
    `${c.red}fail${c.reset}  public/og.png is ${(size / 1024).toFixed(1)}KB, under the ${FLOOR_KB}KB floor. ` +
      `That usually means the webfonts did not load and the card has no text on it. Open it and look.`,
  );
  process.exit(1);
}
console.log(
  `${c.green}ok${c.reset}    public/og.png, ${(size / 1024).toFixed(1)}KB, ` +
    `${entries.length} lessons / ${stale + staleParams} stale / ${conflicts} contradictions, ` +
    `rendered with ${chrome.split('/').pop()}`,
);
