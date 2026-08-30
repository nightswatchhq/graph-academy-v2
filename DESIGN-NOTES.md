# Design notes

This site uses [cargopete-style](https://github.com/cargopete/cargopete-style),
whose palette is mandated rather than advisory. `src/styles/tokens.css` is
shipped verbatim from upstream and must not be edited here. `src/styles/academy.css`
adds typography, spacing and this site's own components, and defines no colours:
`npm run audit:style` fails on a raw hex anywhere outside `tokens.css`.

Automated conformance, all in CI:

- every colour resolves to a token
- `var(--rust)` appears well above the floor of twelve, so the page does not read
  as a blue page on a warm ground
- zero em dashes anywhere in the source
- no banned hype vocabulary, with two file-level exemptions declared in the files
- zero third-party resource requests in the built HTML
- `python3 tools/contrast.py` passes in both themes, and blocks a merge

## Where this build deviates, and why

Three deliberate departures. Recording them matters: a house style that is
quietly bent in one repository stops being a house style.

### 1. The stylesheet is a shared file, not inlined per page

The style says inline the CSS. That rule is written for a landing page, where it
buys a single request for the whole document.

This site is 62 pages that people read in sequence, and the stylesheet is 32KB
uncompressed. Inlining it charges every reader for the same bytes on every
lesson: 14KB gzipped per page, of which 7KB is CSS they already have.

One same-origin file, cached after the first page, honours the intent better.
Still zero third-party requests, still one document request, and a lesson costs
about 7KB over the wire instead of 14KB. Set in `astro.config.mjs` as
`inlineStylesheets: 'never'`.

### 2. Plain Astro rather than Starlight

The original specification recommended Astro plus Starlight, with a documented
escape hatch where Starlight's opinions fight the design. They do, on nearly
every axis that matters here: Starlight ships its own theme layer, its own font
pipeline, and a sidebar and table of contents that read as documentation. The
site's whole positioning depends on not reading as a documentation clone.

Search is not lost: `astro-pagefind` gives the same Pagefind index with about ten
lines of configuration. The bespoke information architecture, paths and modules
rather than a flat page tree, with progress tracking and verification stamps,
needed custom templates in either case.

### 3. `unsafe-inline` in the script CSP

The theme has to be applied before first paint or the page flashes the wrong
ground on reload, which means an inline script in the document head. The
Content-Security-Policy in `vercel.json` therefore permits `'unsafe-inline'` for
scripts.

This is a real weakening and worth stating plainly. The mitigation is that the
policy still forbids every off-origin source, which is the property the site
actually depends on: the zero-third-party rule is enforced by the browser rather
than only by the audit script. The site takes no user input and renders no
user-supplied content, so the residual injection surface is the repository
itself. If Astro's CSP hashing matures, move to hashes and drop the exception.

## The terminal on the home page

The style forbids invented transcripts, and that rule is load-bearing rather than
decorative. The hero panel shows the genuine output of `npm run staleness` in this
repository, and its counts are computed from the same registry and content
collection the script reads, so they cannot drift apart silently.

If you change what that script prints, change the panel in `src/pages/index.astro`
in the same commit.

## Type

Space Grotesk for display and body, JetBrains Mono for every stamped label:
kickers, tags, metadata, verification stamps, terminal, table units. Both are
self-hosted woff2 subsets totalling about 35KB, preloaded, from this origin. No
font CDN.
