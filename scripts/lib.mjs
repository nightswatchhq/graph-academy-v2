import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'smol-toml';

export const ROOT = new URL('..', import.meta.url).pathname;
export const registry = parse(readFileSync(join(ROOT, 'data/parameters.toml'), 'utf8'));

export const paramEntries = Object.entries(registry).filter(
  ([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v),
);

export function walk(dir, ext = '.mdx') {
  const out = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (full.endsWith(ext)) out.push(full);
    }
  };
  try { visit(dir); } catch { /* no lessons yet */ }
  return out;
}

/** Minimal frontmatter reader. Enough for the fields the checks care about. */
export function frontmatter(file) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { file, data: {}, body: src };
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      if (v === '') {
        data[key] = [];
      } else if (v.startsWith('[') && v.endsWith(']')) {
        // inline array: ["a", "b"]
        data[key] = v
          .slice(1, -1)
          .split(',')
          .map((x) => x.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else {
        data[key] = v.replace(/^["']|["']$/g, '');
      }
    } else if (key && /^\s*-\s/.test(line)) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(line.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, ''));
    }
  }
  return { file, data, body: src.slice(m[0].length) };
}

export const rel = (f) => relative(ROOT, f);
export const days = (a, b) => Math.round((a - b) / 86400_000);
export const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  yellow: '\x1b[33m', green: '\x1b[32m', bold: '\x1b[1m',
};
