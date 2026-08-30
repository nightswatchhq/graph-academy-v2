# Contributing

The most useful contribution to this site is not a new lesson. It is checking
that a number is still true.

## The four things worth doing, in order

1. **Settle a recorded contradiction.** `/parameters/` lists cases where two
   official sources disagree, each with the contract reference that would settle
   it. Read the contract, report what it says, and we update the registry and
   credit you.
2. **Re-verify a stale parameter.** Open the source, read the value, update
   `verified` and the `quote`.
3. **Fix something wrong.** With a source.
4. **Write a lesson.** Useful, and the least urgent of the four.

## House rules

- **Never hard-code a protocol number.** Add it to `data/parameters.toml` with a
  `source`, a verbatim `quote` and the `verified` date you read it, then render
  it with `<Param name="..." />`. An unknown key fails the build. A hard-coded
  literal that collides with a known parameter is a warning.
- **Cite in the frontmatter.** Every lesson lists the pages it was checked
  against, and the site renders them under the title with the date.
- **Explain why, link for how.** If you are writing CLI flags or configuration
  keys, stop and link to the official documentation instead. That material is
  maintained elsewhere and a copy here will rot.
- **Record disagreements, do not resolve them silently.** If two official pages
  conflict, set `conflict = true` on the registry entry, add a `note` and a
  `note_source`, and teach the conflict in the lesson.
- **Mark roadmap as roadmap.** Announced is not shipped. A capability that exists
  but is switched off, such as delegated stake slashing, is neither impossible
  nor current, and the accurate sentence is longer than either short one.
- **No em dashes.** Absolute, from the design system. Use a full stop, a colon, a
  plain hyphen, or recast the sentence. CI checks.
- **No hype vocabulary and no exclamation marks.** Numbers instead of adjectives,
  and every number must be true today. CI checks a list of the worst offenders.
- **No placeholder names.** Real contracts, real repositories, real addresses.
- **No invented transcripts.** Anything shown in a terminal panel must be real
  output of a real command.

## Writing a lesson

Lessons are MDX under `src/content/entries/<hub>/`. Frontmatter is validated by
Zod at build time, so a missing or malformed field is a build failure rather than
a broken page. Copy an existing lesson.

Required beyond the schema:

- a `summary` saying what the reader will be able to do
- at least one `sources` entry, being a page you actually opened
- `last_verified` as the date you read those sources, and `verify_before` as when
  somebody should look again. Ninety days is the usual choice.
- a `Quiz` or a `Checklist`. A lesson without a way to check yourself is an
  article.

Components available with no import: `Param`, `Note`, `Tip`, `Warn`, `Model`,
`Disputed`, `CheckpointNote`, `Reveal`, `Quiz`, `Checklist`, `Terminal`, `Flow`,
`RebateCalc`, `DelegationCalc`.

### The one thing the tooling cannot check

`Quiz` and `Checklist` take their content as JavaScript strings, so a component
cannot go inside them and the parameter linter skips those blocks. It prints how
many files it skipped. **Numbers inside a quiz are checked by a human reviewer or
not at all.** If you put one there, be sure of it.

Where a worked example legitimately uses a round number that collides with a
protocol parameter, opt out per literal, in the file, with a reason:

```mdx
{/* param-lint-allow: 10,000 GRT (illustrative reward, not the Fisherman deposit) */}
```

## Adding or changing a parameter

`data/parameters.toml`. Every entry needs `label`, `value`, `display`, `unit`,
`status`, `source`, `quote` and `verified`. Add `onchain_ref` where a contract
could settle it, and `conflict = true` with a `note` and `note_source` where
official sources disagree.

`verified` is the date **a human opened `source` and read the value there**. Do
not copy it forward from a neighbouring entry. That single discipline is the
difference between a registry and a list of numbers.

## Review

Every content pull request needs one approval from the subject-matter owner of
the section it touches, per `CODEOWNERS`. The approving reviewer's handle goes in
the lesson's `reviewers` field, and the site renders it in the verification stamp.

## Before opening a pull request

```bash
npm run params        # registry integrity and parameter usage
npm run build         # the site
node scripts/check-links.mjs
npm run audit:style   # design system conformance
npm run contrast      # colour contrast, blocking
npm run staleness     # freshness report
```

All of these run in CI. `contrast` blocks a merge: an accessibility regression is
not a matter of taste. `staleness` is advisory on a pull request and strict on the
nightly run, so a contributor is not punished for somebody else's page going off.

## Design

The palette is mandated and `src/styles/tokens.css` is shipped verbatim from
upstream. Do not edit it here; change it in cargopete-style and re-sync. See
`DESIGN-NOTES.md`, which also records the three places this build deliberately
departs from the house style and why.
