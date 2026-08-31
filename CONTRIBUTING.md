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

## The other half of this, in graph-support

[graph-support](https://github.com/nightswatchhq/graph-support) is where people
turn up with something broken and the Night's Watch works out why, in public,
closing every issue with a stated outcome. This site and that repository are one
loop, and each is worth less without the other.

An entry here explains why a failure mode exists. A graph-support issue is one
occasion it happened to somebody, with the deployment ID, the commands run and
the answer. `/diagnose/` carries both: the causes, and the threads where they
actually bit.

The loop runs both ways.

- **Coming from an issue.** When a graph-support issue closes on a failure mode
  `src/lib/diagnostics.ts` does not carry, add it, and cite the issue in
  `worked`. [Their TRIAGE.md](https://github.com/nightswatchhq/graph-support/blob/main/TRIAGE.md)
  makes this part of closing rather than a favour.
- **Coming from here.** If you hit something the symptom index misses, file it
  [there](https://github.com/nightswatchhq/graph-support/issues/new?template=06-symptom.yml)
  rather than here. You get triaged, and if the diagnosis holds the symptom lands
  in the index with your issue attached.

Two rules for a `worked` citation, both learned the hard way. **Read the thread
before attaching it**, because a title that sounds right is not evidence and an
index that cites the wrong thread is worse than one that cites nothing. And what
the index needs, which a good issue often buries, is **the check**: the command,
query or comparison that tells this cause apart from the others that look
identical. A cause without a check is a guess with a confident tone.

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

## Dispatches are not maintained, on purpose

A dispatch is dated writing moved here from the Lodestar Intel Feed and left as written. Do
not update its facts, and **do not fix its outbound links when they rot**. Several already
have. `npm run links:external` reports them and the nightly CI job surfaces them, and the
correct response is to leave them alone: a 2026 post is a record of what was true and
reachable in 2026, and silently repairing it makes the date on the page a lie.

Entries are the opposite. They carry a re-verification date and are expected to be corrected.

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
npm run verify
```

That is the whole list. It runs every check CI runs, in CI's order, serving a
local preview for the two that need a browser, and it prints `Safe to push` or
names what failed. Run one on its own with `npm run verify params`, or
`npm run verify mobile chain`.

It exists because two commits once went to production over a red CI. Nothing was
missing that day: the mobile check caught the regression on the exact commit that
introduced it. The full list simply lived only in `ci.yml` and had to be
reassembled by hand before every push, so it got reassembled wrong.

**Read the run afterwards anyway.** `gh run watch` takes a few seconds and is the
difference between finding out from CI and finding out from a reader.

What the checks are for, since the names are terse:

| check | what it protects |
| --- | --- |
| `params` | every number comes from the registry, with a source and a date |
| `chain` | the deployed contracts still say what the registry claims |
| `citations` | every graph-support issue the symptom index cites still exists |
| `links` | no broken internal link or anchor |
| `contrast` | colour contrast in both themes. Blocking, and not a matter of taste |
| `mobile` | no horizontal overflow, nothing clipped, tap targets big enough |
| `lighthouse` | accessibility and best practices, against a local preview |
| `staleness` | what is past its re-verification date |

`staleness` is advisory on a pull request and strict on the nightly run, so a
contributor is not punished for somebody else's page going off.

Point `lighthouse` and `mobile` at the local preview, which `npm run verify`
does for you. Aimed at production they trip Vercel's automatic bot mitigation
after a hundred or so requests, and a challenged page is not a low score, it is
no measurement at all.

## Design

The palette is mandated and `src/styles/tokens.css` is shipped verbatim from
upstream. Do not edit it here; change it in cargopete-style and re-sync. See
`DESIGN-NOTES.md`, which also records the three places this build deliberately
departs from the house style and why.
