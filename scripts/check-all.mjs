#!/usr/bin/env node
// Everything CI runs, in CI's order, in one command.
//
// This exists because on 2026-08-31 two commits went to production over a red
// CI. Nothing was missing: scripts/mobile-check.mjs caught the regression on
// the exact commit that introduced it. The full set simply lived only in
// ci.yml and had to be reassembled by hand before every push, so it got
// reassembled wrong. One command, one answer.
//
// The browser checks need a served build, so this serves `dist` itself rather
// than asking you to remember to.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { c } from './lib.mjs';

const PORT = 4399;
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));

// chrome-launcher only looks for Chrome. Any Chromium drives the DevTools
// protocol identically, so take whatever is here.
const CHROMIUM = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
if (!process.env.CHROME_PATH) {
  const found = CHROMIUM.find(existsSync);
  if (found) process.env.CHROME_PATH = found;
}

/** `served` steps run against a local preview of dist rather than production. */
const STEPS = [
  { name: 'params', cmd: ['node', 'scripts/check-params.mjs'] },
  { name: 'build', cmd: ['npx', 'astro', 'build'] },
  { name: 'links', cmd: ['node', 'scripts/check-links.mjs'] },
  { name: 'style', cmd: ['node', 'scripts/style-audit.mjs'] },
  { name: 'contrast', cmd: ['python3', 'tools/contrast.py'] },
  { name: 'types', cmd: ['npx', 'astro', 'check'] },
  { name: 'staleness', cmd: ['node', 'scripts/staleness.mjs'] },
  { name: 'chain', cmd: ['node', 'scripts/reconcile-rpc.mjs'] },
  { name: 'lighthouse', cmd: ['node', 'scripts/lighthouse-check.mjs'], served: true },
  { name: 'mobile', cmd: ['node', 'scripts/mobile-check.mjs'], served: true },
];

const run = (cmd, env) =>
  new Promise((resolve) => {
    const p = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', env: { ...process.env, ...env } });
    p.on('close', (code) => resolve(code ?? 1));
    p.on('error', () => resolve(1));
  });

const steps = only.length ? STEPS.filter((s) => only.includes(s.name)) : STEPS;
if (only.length && steps.length !== only.length) {
  const known = STEPS.map((s) => s.name).join(', ');
  console.log(`${c.red}fail${c.reset}  unknown step. Known steps: ${known}`);
  process.exit(2);
}

let server;
const failed = [];
for (const step of steps) {
  if (step.served && !server) {
    server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
    const deadline = Date.now() + 60000;
    for (;;) {
      try {
        const r = await fetch(`http://localhost:${PORT}/`);
        if (r.ok) break;
      } catch {}
      if (Date.now() > deadline) {
        // Not "skip the browser checks and pass anyway". A check that cannot
        // run is not a check that succeeded.
        console.log(`${c.red}fail${c.reset}  preview server never came up on ${PORT}`);
        failed.push('preview server');
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log(`\n${c.bold}── ${step.name}${c.reset}`);
  const env = step.served ? { LH_BASE: `http://localhost:${PORT}`, MOBILE_BASE: `http://localhost:${PORT}` } : {};
  const code = await run(step.cmd, env);
  if (code !== 0) failed.push(step.name);
}
server?.kill();

console.log();
if (failed.length === 0) {
  console.log(`${c.green}ok${c.reset}      ${steps.length} checks passed. Safe to push.`);
} else {
  console.log(`${c.red}fail${c.reset}    ${failed.length} of ${steps.length} failed: ${failed.join(', ')}`);
  console.log(`${c.dim}        Push over this and CI will tell you the same thing ten minutes later.${c.reset}`);
}
process.exit(failed.length > 0 ? 1 : 0);
