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

### 4. Terminal window titles are muted, not faint

The house style lists terminal window titles among the legitimate uses of
`--text-faint`. On the light theme that measures 2.49 against the terminal's
title bar, and axe flags it.

Axe is right. The panel carries `role="img"` and an `aria-label`, and its chrome
is now `aria-hidden`, which spares a screen reader. None of that helps a sighted
reader with low vision, who still has to look at the text. So the title runs at
`--text-muted`, which clears AA on every surface in both themes.

Outside `tokens.css` itself, `--text-faint` now survives in exactly four places,
all genuinely losable: the breadcrumb separator, the dash in a comparison table
cell (which the house style explicitly permits, because the meaning rests on the
glyph rather than the colour), and two inline middle-dot separators on the
parameters and glossary pages. `npm run audit:style` warns on any new use.

Lighthouse found nine violations of this contract that the audit script had
happily passed, including the caption reading "real output of this site's
nightly check, not an illustration", which is the site's central honesty claim.
That is why Lighthouse now runs in CI rather than by hand.

CI gates **accessibility** and **best-practices** only. Both are DOM assertions
and give the same answer on any machine, so a failure is always a real defect.
**Performance is reported, not gated**: the score is CPU-bound and shared runners
are slow and variable. This suite measures 100 on a laptop and 81 on a GitHub
runner, with the whole gap in total-blocking-time, speed-index and
max-potential-fid. Gating it produces flaky failures that no change to this
repository can fix. Measure it against the real deployment instead:
`LH_BASE=https://learn-thegraph.com npm run lighthouse`.

### 5. The terminal bar uses a token, not a colour-mix

The house markup builds the terminal's title bar with
`color-mix(in srgb, var(--text) 5%, var(--bg-code))`. That is a fifth surface,
and `tools/contrast.py` never sees it: the validator checks every ink against the
four surface **tokens**, which is exactly the right thing to do and is blind to
surfaces composed at use sites.

In the light theme that mix lands near `#edecea`, where `--text-muted` measures
**4.36** and misses AA. Nothing was misusing a token, so the bespoke audit passed
it and only Lighthouse caught it.

The bar now uses `var(--bg-inset)`, a real validated surface that reads as lifted
in both themes: `--text-muted` measures 4.55 on it in light and 5.33 in dark.

**Worth pushing back upstream.** Any `color-mix` that produces a surface escapes
the validator, so either the style should avoid composing surfaces at use sites,
or `contrast.py` should learn about the mixes the components actually use.

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
