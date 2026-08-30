#!/usr/bin/env node
// Verifies every internal link in the built site resolves to a real page or
// anchor. Cross-links between lessons are written by hand and a broken one
// looks exactly like a working one until somebody clicks it.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, c } from './lib.mjs';

const dist = join(ROOT, 'dist');
if (!existsSync(dist)) {
  console.log('dist/ not present. Run the build first.');
  process.exit(1);
}

const pages = walk(dist, '.html');
const pagePaths = new Set(
  pages.map((f) => '/' + rel(f).replace(/^dist\//, '').replace(/index\.html$/, '')),
);
// anchors present on each page, so a link to /parameters/#key can be checked
const anchors = new Map();
for (const f of pages) {
  const key = '/' + rel(f).replace(/^dist\//, '').replace(/index\.html$/, '');
  const html = readFileSync(f, 'utf8');
  anchors.set(key, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

const broken = [];
const brokenAnchors = [];
const external = new Set();
let checked = 0;

for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const u = m[1].replace(/[.,]$/, '');
    // our own 404 page returns 404 by design
    if (u.endsWith('/404/')) continue;
    external.add(u);
  }
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const raw = m[1];
    if (raw.startsWith('//')) continue;
    const [path, hash] = raw.split('#');
    // static assets are files on disk rather than routes
    if (/\.(css|js|woff2?|svg|xml|txt|png|jpe?g|ico|json)$/.test(path)) {
      if (!existsSync(join(dist, path))) broken.push(`${rel(f)} -> ${raw}`);
      continue;
    }
    if (path.startsWith('/pagefind/')) continue;
    checked += 1;
    const normalised = path.endsWith('/') || path === '' ? path || '/' : `${path}/`;
    if (!pagePaths.has(normalised)) {
      broken.push(`${rel(f)} -> ${raw}`);
      continue;
    }
    if (hash && !anchors.get(normalised)?.has(hash)) {
      brokenAnchors.push(`${rel(f)} -> ${raw}`);
    }
  }
}

// Outbound links are checked only when asked, because a network round trip per
// link makes this slow and because a third party being briefly down is not a
// defect in this repository. Nightly in CI; on demand locally.
//
// This check exists because six outbound links to Lodestar shipped broken: they
// were routes assumed while writing rather than routes that existed, and an
// internal-only checker cannot see that.
if (process.argv.includes('--external')) {
  const urls = [...external].sort();
  console.log(`${c.dim}checking ${urls.length} outbound links${c.reset}`);
  const bad = [];
  const BATCH = 6;
  for (let i = 0; i < urls.length; i += BATCH) {
    await Promise.all(urls.slice(i, i + BATCH).map(async (u) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
        let res = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
        if (res.status === 405 || res.status === 501) {
          res = await fetch(u, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
        }
        clearTimeout(t);
        // 403 and 429 are usually a bot wall rather than a dead page
        if (res.status >= 400 && res.status !== 403 && res.status !== 429) {
          bad.push(`${res.status} ${u}`);
        }
      } catch (e) {
        bad.push(`unreachable ${u}`);
      }
    }));
  }
  for (const b of bad) console.log(`${c.yellow}outbound${c.reset} ${b}`);
  console.log(`${bad.length === 0 ? c.green + 'ok' + c.reset : c.yellow + 'warn' + c.reset}    ${urls.length} outbound links, ${bad.length} not resolving`);
}

for (const b of [...new Set(broken)]) console.log(`${c.red}broken${c.reset}  ${b}`);
for (const b of [...new Set(brokenAnchors)]) console.log(`${c.yellow}anchor${c.reset}  ${b}`);
const uniqueBroken = new Set(broken).size;
console.log(
  `\n${uniqueBroken === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
    `    ${checked} internal links across ${pages.length} pages, ` +
    `${uniqueBroken} broken, ${new Set(brokenAnchors).size} bad anchors`,
);
process.exit(uniqueBroken > 0 ? 1 : 0);
