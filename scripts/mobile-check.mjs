#!/usr/bin/env node
// A real mobile check: drive headless Chrome at a phone viewport and measure
// what actually renders. Lighthouse emulates mobile but does not report
// horizontal overflow, which is the failure that makes a page feel broken.
import * as chromeLauncher from 'chrome-launcher';
import { c } from './lib.mjs';

const BASE = process.env.MOBILE_BASE ?? 'http://localhost:4321';
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'narrow', width: 320, height: 640 },
];
const PAGES = ['/', '/catalogue/', '/delegators/', '/delegators/rewards-and-cuts/', '/parameters/', '/diagnose/', '/dispatches/', '/glossary/'];

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

const problems = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true }, sessionId);
  for (const path of PAGES) {
    await send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
    await new Promise((r) => setTimeout(r, 700));
    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const d = document.documentElement;
        const overflow = d.scrollWidth - d.clientWidth;
        const offenders = [];
        if (overflow > 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width > d.clientWidth + 1 || r.right > d.clientWidth + 1) {
              offenders.push((el.tagName.toLowerCase()) + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : '') + ' w=' + Math.round(r.width));
              if (offenders.length >= 3) break;
            }
          }
        }
        const small = [];
        for (const el of document.querySelectorAll('a, button, input, [role=button]')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // WCAG 2.2 SC 2.5.8 exempts a target that sits in a sentence, where
          // its size is constrained by the line-height of surrounding text.
          // Approximate that: the parent carries meaningfully more text than
          // the link itself.
          const own = (el.textContent || '').trim().length;
          const parent = (el.parentElement?.textContent || '').trim().length;
          const inline = parent > own + 25;
          if (inline) continue;
          if (r.height < 24 || r.width < 24) {
            small.push((el.tagName.toLowerCase()) + ':' + (el.textContent || '').trim().slice(0, 18) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
            if (small.length >= 3) break;
          }
        }
        return JSON.stringify({ overflow, offenders, small, w: d.clientWidth });
      })()`,
      returnByValue: true,
    }, sessionId);
    const r = JSON.parse(result.result.value);
    const tag = `${vp.name} ${vp.width}px ${path}`;
    if (r.overflow > 1) problems.push(`${tag}: horizontal overflow ${r.overflow}px -> ${r.offenders.join(', ')}`);
    if (r.small.length) problems.push(`${tag}: tap targets under 24px -> ${r.small.join(', ')}`);
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
    `    ${PAGES.length} pages x ${VIEWPORTS.length} viewports, ${problems.length} issues`,
);
process.exit(problems.length > 0 ? 1 : 0);
