# The Graph Academy

A community-owned learning site for The Graph protocol, at
[learn-thegraph.com](https://learn-thegraph.com).

Seven role-based paths that explain **why** the protocol is designed as it is,
checked against the Horizon-era protocol and stamped with the date somebody
checked. It is deliberately not a documentation clone and not a dashboard: it
links to [the official docs](https://thegraph.com/docs/en/) for procedures and to
[Graph Explorer](https://thegraph.com/explorer) and
[Lodestar](https://www.lodestar-dashboard.com) for live data.

## Why it is built this way

The previous Graph Academy taught Cobb-Douglas rebates, L1 curation bonding
curves and the Hosted Service until it was retired. All three were true once, and
nothing in the site could tell a reader they had stopped being true.

This rebuild puts three mechanisms against that:

- **One registry.** No lesson hard-codes a protocol number. `data/parameters.toml`
  holds every value with its source URL, a verbatim quote from that source, and
  the date a human read it. Lessons render them with `<Param name="..." />`. An
  unknown key fails the build.
- **A stamp and an expiry on every page.** What it was checked against, when, and
  when it is due again. Past that date the page renders a warning banner.
- **A build that goes red.** A nightly job lists pages past their date and
  parameters nobody has read in ninety days.

Where two official sources contradict each other, the site records the conflict
and names the contract that would settle it, rather than picking a winner
quietly. There were three such cases on 2026-08-30.

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
```

## Checks

```bash
npm run params        # registry integrity, parameter usage, hard-coded literals
npm run build         # the site, plus the Pagefind search index
node scripts/check-links.mjs   # every internal link and anchor
npm run audit:style   # design system conformance
npm run contrast      # colour contrast in both themes, blocking in CI
npm run staleness     # what is past its re-verification date
npm run reconcile     # registry against chain, needs a gateway key
```

## Layout

```
data/parameters.toml          the registry: every protocol number, sourced and dated
src/content/lessons/<hub>/    lessons as MDX, validated by a Zod schema
src/lib/paths.ts              paths, modules and ordering
src/lib/params.ts             registry loader and lookup
src/lib/glossary.ts           glossary terms
src/components/               Param, Quiz, Checklist, Terminal, calculators, admonitions
src/styles/tokens.css         cargopete-style palette, shipped verbatim, do not edit
src/styles/academy.css        typography, spacing, components. no colours
tools/contrast.py             contrast validator, from cargopete-style
scripts/                      the checks above
```

## Stack

Astro 5, MDX, Pagefind for search, deployed static on Vercel. Zero third-party
requests at runtime: two self-hosted font subsets and one stylesheet, all from
this origin. No analytics, no cookies, no accounts. Reader progress lives in
`localStorage` and never leaves the browser.

Design is [cargopete-style](https://github.com/cargopete/cargopete-style), whose
palette is mandated rather than advisory. The three places this build
deliberately departs from it are recorded in `DESIGN-NOTES.md`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The most valuable contribution is not a
new lesson. It is checking that a number is still true, or settling one of the
contradictions listed on `/parameters/`.

## Licence

Content **CC BY 4.0**, attributed to the Graph Academy community. Code **MIT**.
See `LICENSE` and `LICENSE-CONTENT`. Fonts are SIL OFL 1.1.
