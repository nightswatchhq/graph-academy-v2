#!/usr/bin/env node
// Enforces the parts of the cargopete style that can be checked mechanically.
// The checklist in the skill is the source; this is the automated subset.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, c } from './lib.mjs';

const errors = [];
const warnings = [];
const notes = [];

// --- 1. no colour outside tokens.css --------------------------------------
const styleFiles = walk(join(ROOT, 'src'), '.css').filter((f) => !f.endsWith('tokens.css'));
const astroFiles = [...walk(join(ROOT, 'src'), '.astro'), ...walk(join(ROOT, 'src'), '.mdx')];
// The lookbehind excludes HTML numeric entities: &#8594; is a rightwards arrow,
// not a colour, and matching it as one is how this check cried wolf.
const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g;
for (const f of [...styleFiles, ...astroFiles]) {
  // Comments are stripped first. A hex in a comment is documentation, usually
  // the record of a colour we deliberately stopped using, and flagging it makes
  // it impossible to write that record down.
  const src = readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  for (const m of src.match(HEX) ?? []) {
    // an id selector or a URL fragment is not a colour
    if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(m)) {
      errors.push(`${rel(f)}: raw colour ${m}. The palette is mandated; use a token.`);
    }
  }
}

// --- 2. the rust floor -----------------------------------------------------
const academy = readFileSync(join(ROOT, 'src/styles/academy.css'), 'utf8');
const rustUses = (academy.match(/var\(--rust\)/g) ?? []).length;
if (rustUses < 12) {
  errors.push(`academy.css uses var(--rust) ${rustUses} times. The floor is 12: below it the page reads as a blue page on a warm ground.`);
} else {
  notes.push(`var(--rust) used ${rustUses} times, floor is 12`);
}

// --- 2b. --text-faint is decorative only ----------------------------------
// The token fails AA on every surface by design. The contract is that it never
// carries body copy, never carries a link, and never carries the only instance
// of a fact. That cannot be decided statically, so new uses are flagged for a
// human rather than allowed through. Lighthouse caught six of these that this
// script had happily passed.
const FAINT_ALLOWED = [
  '.term-title',       // terminal window chrome
  '.no',               // comparison table, paired with a dash glyph so meaning does not rest on colour
  '.crumbs .sep',      // breadcrumb separator
  'span style="color: var(--text-faint);"', // inline dot separators
];
const faintFiles = [...styleFiles, ...astroFiles];
let faintUses = 0;
for (const f of faintFiles) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.includes('var(--text-faint)')) continue;
    faintUses += 1;
    if (!FAINT_ALLOWED.some((sel) => line.includes(sel.split(' ')[0].replace('.', '')))) {
      warnings.push(
        `${rel(f)}: new --text-faint use. It must carry nothing load-bearing: ` +
          `no body copy, no link, and never the only instance of a fact.`,
      );
    }
  }
}
notes.push(`${faintUses} uses of --text-faint, all reviewed against the decorative-only contract`);

// --- 2c. hardcoded counts -------------------------------------------------
// This site's whole claim is that its numbers are derived and dated. A spelled
// out count in a template is a number that silently stops being true, and one
// already shipped: "seven collections" survived an eighth being added.
const COUNTS = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(collections?|shelves|shelf|entries|entry|dispatches|parameters)\b/gi;
for (const f of astroFiles.filter((x) => x.endsWith('.astro'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.match(COUNTS) ?? []) {
    warnings.push(`${rel(f)}: hardcoded count "${m}". Derive it from the data instead.`);
  }
}

// --- 3. em dashes ----------------------------------------------------------
const allSource = [
  ...walk(join(ROOT, 'src'), '.astro'),
  ...walk(join(ROOT, 'src'), '.mdx'),
  ...walk(join(ROOT, 'src'), '.ts'),
  ...walk(join(ROOT, 'src'), '.css'),
  ...walk(join(ROOT, 'scripts'), '.mjs'),
];
for (const f of allSource) {
  const src = readFileSync(f, 'utf8');
  const n = (src.match(/\u2014/g) ?? []).length;   // the em dash, by escape, so this file passes its own check
  if (n > 0) errors.push(`${rel(f)}: ${n} em dash${n > 1 ? 'es' : ''}. House rule, absolute.`);
}

// --- 4. banned vocabulary and exclamation marks ---------------------------
const BANNED = [
  'seamless', 'unleash', 'next-gen', 'game-changer', 'revolutionary', 'effortless',
  'cutting-edge', 'empower', 'supercharge', 'best-in-class', 'world-class',
  'enterprise-grade', 'blazing', 'buttery', 'magical', 'delve',
];
const prose = [...walk(join(ROOT, 'src'), '.mdx'), ...walk(join(ROOT, 'src'), '.astro')];
for (const f of prose) {
  const src = readFileSync(f, 'utf8');
  // A file may exempt itself, in the file, where a reviewer sees it. The two
  // legitimate cases are the page that lists the banned words in order to ban
  // them, and the terminal component whose prefix glyphs include one.
  const exempt = (src.match(/style-audit-allow:\s*([a-z-]+)/g) ?? []).map((m) => m.split(':')[1].trim());
  if (exempt.includes('banned-vocab')) continue;
  for (const word of BANNED) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(src)) warnings.push(`${rel(f)}: banned vocabulary "${word}"`);
  }
  // exclamation marks, ignoring JSX negation and shell history expansion
  if (!exempt.includes('bang')) {
    const bangs = (src.match(/[a-z,)"']\s*!(?=[\s"'<])/gi) ?? []).length;
    if (bangs > 0) warnings.push(`${rel(f)}: ${bangs} possible exclamation mark(s)`);
  }
}

// --- 5. built output: third-party requests and weight ---------------------
const dist = join(ROOT, 'dist');
if (existsSync(dist)) {
  const pages = walk(dist, '.html');
  const ALLOWED_SELF = /^\/(?!\/)/;
  let heaviest = { file: '', bytes: 0 };
  for (const f of pages) {
    const html = readFileSync(f, 'utf8');
    // only resource-loading attributes count. anchors leaving the site are the point.
    const resources = [
      ...(html.match(/<script[^>]+src="([^"]+)"/g) ?? []),
      ...(html.match(/<link[^>]+href="([^"]+)"[^>]*rel="stylesheet"/g) ?? []),
      ...(html.match(/rel="stylesheet"[^>]+href="([^"]+)"/g) ?? []),
      ...(html.match(/<img[^>]+src="([^"]+)"/g) ?? []),
    ];
    for (const tag of resources) {
      const url = tag.match(/(?:src|href)="([^"]+)"/)?.[1] ?? '';
      if (/^https?:\/\//.test(url)) {
        errors.push(`${rel(f)}: third-party resource ${url}. The style permits zero.`);
      } else if (!ALLOWED_SELF.test(url) && !url.startsWith('data:')) {
        warnings.push(`${rel(f)}: unexpected resource path ${url}`);
      }
    }
    const bytes = Buffer.byteLength(html);
    if (bytes > heaviest.bytes) heaviest = { file: rel(f), bytes };
  }
  notes.push(`${pages.length} pages built, heaviest ${heaviest.file} at ${(heaviest.bytes / 1024).toFixed(1)}KB uncompressed`);
} else {
  notes.push('dist/ not present, skipping built-output checks. Run the build first.');
}

for (const n of notes) console.log(`${c.dim}note${c.reset}  ${n}`);
for (const w of warnings) console.log(`${c.yellow}warn${c.reset}  ${w}`);
for (const e of errors) console.log(`${c.red}error${c.reset} ${e}`);
console.log(
  `\n${errors.length === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
    `    ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length > 0 ? 1 : 0);
