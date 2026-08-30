#!/usr/bin/env node
// Renders tools/og/card.html to public/og.png at 1200x630.
//
// Rendered in a real browser rather than composed in an image library, because
// the card uses the site's own tokens and its own self-hosted faces. Anything
// else would drift from the site it is advertising.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, c } from './lib.mjs';

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

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--allow-file-access-from-files',
  '--window-size=1200,630',
  `--screenshot=${out}`,
  `file://${card}`,
], { stdio: 'pipe' });

if (!existsSync(out)) {
  console.log(`${c.red}fail${c.reset}  no image produced`);
  process.exit(1);
}
const { size } = statSync(out);
console.log(`${c.green}ok${c.reset}    public/og.png, ${(size / 1024).toFixed(1)}KB, rendered with ${chrome.split('/').pop()}`);
