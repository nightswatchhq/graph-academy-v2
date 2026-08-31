#!/usr/bin/env node
// A real mobile check: drive headless Chrome at a phone viewport and measure
// what actually renders. Lighthouse emulates mobile but does not report
// horizontal overflow, which is the failure that makes a page feel broken.
import { existsSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import { c } from './lib.mjs';

const BASE = process.env.MOBILE_BASE ?? 'http://localhost:4321';

// chrome-launcher only looks for Chrome itself, so a machine with Brave,
// Edge or plain Chromium fails with "No Chrome installations found" and the
// check silently stops being run locally. Any Chromium drives the DevTools
// protocol identically, so take the first one present unless CHROME_PATH
// says otherwise.
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
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'narrow', width: 320, height: 640 },
];
const PAGES = ['/', '/catalogue/', '/delegators/', '/delegators/rewards-and-cuts/', '/parameters/', '/diagnose/', '/dispatches/', '/glossary/', '/indexers/rewards-eligibility/', '/governance/tokenomics/'];

/**
 * The header menus are <details>, so everything below the summary is display:
 * none until somebody opens it, and a check that only measures the closed page
 * measures the easy half. Open each one and measure again: a panel wider than
 * the viewport is exactly the failure this script exists to catch, and it is
 * invisible to every other check we run.
 */
const OPEN_MENUS = `
  for (const m of document.querySelectorAll('[data-menu]')) m.open = true;
`;

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

async function cdp(method, params = {}, sessionId) {
  const res = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
  return res;
}

// Use the DevTools protocol over websocket via puppeteer-less minimal client.
import { WebSocket } from 'ws';
const ver = await (await fetch(`http://127.0.0.1:${chrome.port}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => ws.on('open', r));

let id = 0;
const pending = new Map();
ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const myId = ++id;
    pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method, params, sessionId }));
  });

const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })).result;
const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })).result;
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

/** Poll readyState rather than guessing at a duration. */
async function ready(sessionId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { result } = await send('Runtime.evaluate',
      { expression: 'document.readyState', returnByValue: true }, sessionId);
    if (result?.result?.value === 'complete') break;
    if (Date.now() > deadline) throw new Error('page never reached readyState complete');
    await new Promise((r) => setTimeout(r, 100));
  }
  // One more frame, so late layout (webfonts swapping in) is included.
  await new Promise((r) => setTimeout(r, 250));
}

const problems = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true }, sessionId);
  for (const path of PAGES) {
    await send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
    // A fixed wait is a false-negative generator: the first page at the first
    // viewport is the slowest one and was reporting clean while overflowing by
    // 64px. Wait for the document to actually be complete instead.
    await ready(sessionId);
    for (const menus of [false, true]) {
    if (menus) await send('Runtime.evaluate', { expression: OPEN_MENUS }, sessionId);
    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const d = document.documentElement;
        const overflow = d.scrollWidth - d.clientWidth;
        const offenders = [];
        // A wide table inside a container that scrolls is handled, not broken,
        // and naming it sends you to fix the thing that is already correct.
        // Only an element with no scrolling ancestor can push the page.
        const scrolls = (el) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
          }
          return false;
        };
        if (overflow > 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width > d.clientWidth + 1 || r.right > d.clientWidth + 1) {
              if (scrolls(el)) continue;
              offenders.push((el.tagName.toLowerCase()) + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : '') + ' w=' + Math.round(r.width));
              if (offenders.length >= 3) break;
            }
          }
        }
        // Escaping to the LEFT never appears in scrollWidth and never pans, so
        // it is invisible to every measurement above. A menu panel anchored to
        // a summary near the right edge did exactly this, with every label
        // clipped, and the check reported the page clean.
        const clipped = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.left < -1 && r.right > 0) {
            if (scrolls(el)) continue;
            clipped.push((el.tagName.toLowerCase()) + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : '') + ' left=' + Math.round(r.left));
            if (clipped.length >= 3) break;
          }
        }

        const small = [];
        for (const el of document.querySelectorAll('a, button, input, [role=button]')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // WCAG 2.2 SC 2.5.8 exempts a target that sits in a sentence, where
          // its size is constrained by the line-height of surrounding text.
          // The sentence is the nearest block ancestor, not the immediate
          // parent: a link wrapped in <strong> or <em> was being measured
          // against the emphasis rather than against the prose around it, and
          // reported as a bare target when it is plainly inside a sentence.
          const own = (el.textContent || '').trim().length;
          let block = el.parentElement;
          while (block && block !== document.body &&
                 getComputedStyle(block).display.indexOf('inline') === 0) {
            block = block.parentElement;
          }
          const context = (block?.textContent || '').trim().length;
          const inline = context > own + 25;
          if (inline) continue;
          if (r.height < 24 || r.width < 24) {
            small.push((el.tagName.toLowerCase()) + ':' + (el.textContent || '').trim().slice(0, 18) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
            if (small.length >= 3) break;
          }
        }
        // scrollWidth is not the reader's experience. body carries
        // overflow-x: hidden, so a page can report 92px of overflow and not
        // move a pixel when you drag it. Ask the page to pan and see whether
        // it does. Restore the position afterwards so the tap-target pass
        // measures rectangles from the same place every time.
        const before = window.scrollX;
        window.scrollTo(9999, 0);
        const pan = window.scrollX;
        window.scrollTo(before, 0);
        return JSON.stringify({ overflow, pan, offenders, clipped, small, w: d.clientWidth });
      })()`,
      returnByValue: true,
    }, sessionId);
    const r = JSON.parse(result.result.value);
    const tag = `${vp.name} ${vp.width}px ${path}${menus ? ' [menus open]' : ''}`;
    // Two distinct failures, and conflating them is how this check cried wolf.
    // A page that pans is broken for the reader now. A page that does not pan
    // but has an element escaping with nothing scrolling it is broken the
    // moment body's overflow-x: hidden is removed, and is worth naming.
    if (r.pan > 0) {
      problems.push(`${tag}: page pans ${r.pan}px sideways -> ${r.offenders.join(', ') || 'source not identified'}`);
    } else if (r.overflow > 1 && r.offenders.length) {
      problems.push(`${tag}: ${r.offenders.join(', ')} escapes with no scroll container, hidden only by body overflow-x`);
    }
    if (r.clipped?.length) problems.push(`${tag}: clipped off the left edge -> ${r.clipped.join(', ')}`);
    if (r.small.length) problems.push(`${tag}: tap targets under 24px -> ${r.small.join(', ')}`);
    }
  }
}

// Screenshot through the SAME emulation the measurements used. Chrome's
// --window-size flag does not apply mobile viewport emulation, so a screenshot
// taken that way disagrees with these numbers and is the one that is wrong.
if (process.env.MOBILE_SHOT) {
  const [w, h] = [390, 844];
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 2, mobile: true }, sessionId);
  for (const [i, path] of (process.env.MOBILE_SHOT.split(',')).entries()) {
    await send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
    await new Promise((r) => setTimeout(r, 1200));
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    const { writeFileSync } = await import('node:fs');
    const out = `${process.env.MOBILE_SHOT_DIR ?? '.'}/mobile-${i}.png`;
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(`  shot: ${out} (${path})`);
  }
}

ws.close();
await chrome.kill();

for (const p of problems) console.log(`${c.yellow}issue${c.reset} ${p}`);
console.log(
  `\n${problems.length === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
    `    ${PAGES.length} pages x ${VIEWPORTS.length} viewports x menus closed and open, ` +
    `${problems.length} issues`,
);
process.exit(problems.length > 0 ? 1 : 0);
