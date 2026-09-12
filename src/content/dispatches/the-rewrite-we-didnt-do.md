---
title: "The Rewrite We Didn't Do"
date: "2026-09-12"
author: "cargopete"
tags: ["lodestar", "kittiwake", "frontend", "rewrite", "vite", "nextjs", "testing", "rust", "the-graph", "infrastructure"]
category: "Infrastructure"
excerpt: "Lodestar's frontend rewrite was planned in two stages: tidy the Next.js app first, then move it to Vite. The first stage is finished and the second is not happening, on the plan's own terms. Getting there found two dashboard pages that errored for everyone who had a position, a badge reading NaN%, and a permit leak in the backend that had been waiting since the day it was written."
---

*[Earlier today](/dispatches/lodestar-is-a-frontend/) the last API route left Lodestar's repository. That raised an obvious next question: if the dashboard is now just a client for one JSON API, why is it still a Next.js application? The plan that came out of that question had two stages. Stage 1 would clean up the app in ways worth doing whatever happened next. Stage 2 would move it to Vite and React Router, but only if Stage 1 left the framework still causing trouble. Stage 1 is done, and Stage 2 is not happening. This is about why, and about what the first stage turned up, which was more than expected.*

---

## The plan, and the rule for stopping

Stage 1 had five items. Finish removing server code, including the edge proxy. Delete an unused dependency. Route every request through one typed client. Add browser tests for the wallet flows, since those are the only paths unit tests cannot reach. And decide what to do about the five OpenGraph image routes, which a static site cannot render.

The plan also said when to stop:

> If after Stage 1 agents are landing correct changes and CI stays green, do not migrate. Most of the benefit was in the simplification, and 3 to 6 weeks is a real price.

That rule is the reason this post exists instead of a migration diary.

## Counting it honestly

A tracking issue full of percentages somebody typed in is out of date by the afternoon. So progress was counted by a script that reads the repository, and the script was wrong three times.

The first version took a plain average of the five items. Deleting the unused dependency, which was one line, moved Stage 1 from 18% to 38%. A number that doubles because of a one-line cleanup is not measuring the work, so the items got weights, and both numbers are printed so the weighting can be argued with.

The second and third mistakes were the same one. The script counted a `fetch('/api/…')` quoted inside a comment as a real request, and then counted a comment listing the flows the tests did *not* cover as coverage. Both times the fix was to read what the code does rather than what it says about itself. That comes up again below.

## One client, and what it found

At the start, 48 places across 23 files built their own requests. Each had its own URL building, its own idea of what the response looked like, and its own view of what a failure meant. Moving them into three client modules, each with a runtime check on the response shape, was meant to make a future move cheaper. What it actually did was make every shape explicit, and a lot of them were wrong.

Nearly all the defects were one kind: **missing or failed data shown as if it were a real answer.**

| where | what a visitor saw |
|---|---|
| `/delegators/…` and `/curators/…` | an error page, for every address with a position |
| `/indexers` | a Sync Warning badge reading **NaN%** |
| indexer profiles | 582 allocations on one profile shown as IPFS hashes instead of names |
| `/curate` | 25 rows, the same |
| disputes panel | "This indexer has never been disputed or slashed", when the request had failed |
| `/indexing` search | "No subgraphs found", when the search had not run |
| `/sql` receipts | an unsigned response saved to a file called `receipt-….json` |

The two portfolio pages are worth a closer look. They worked perfectly for an address with nothing in it, because the page returns early when there is no data and never reaches the loop that crashes. So they failed for exactly the people they exist for. Every test fixture, and the address the weekly page sweep used, was an account with no positions. A fixture chosen because it exists is not the same as a fixture chosen because it is representative.

The allocation names had a similar story. The backend always sent `"versions": []` for each allocation, and the frontend read the name from inside it. The component's own test passed for months, because the fixture supplied a populated `versions` field the real API has never sent.

None of this was found by reading code. It was found by writing down what each response should contain and letting the check fail.

## Two blockers that weren't

Two items looked like the hard part. Both turned out to be smaller than they looked, once somebody checked.

**The OpenGraph images.** The plan listed three options: write an image service in Rust, keep a small Next.js deployment just for five routes, or give up on per-page cards. The first costs about a week and the second defeats the purpose. But `next/og` is a re-export. The entire file is one line pointing at a copy of `@vercel/og` bundled inside Next. Calling that copy from plain Node, with no Next.js runtime, produced a correct PNG. Moving off Next would mean changing five import lines, and the 988 lines of card layout stay exactly as they are.

**The edge proxy.** Removing it seemed to need a plan for rate limiting and for the secret that lets the backend trust forwarded addresses. The proxy's rate limiter was per instance, as its own comment admitted, so the real limit was the configured number multiplied by however many edge instances were running. The backend already rate-limits every request in one place, which is stricter. And the only thing that read the secret was the proxy itself.

The actual requirement was one nobody had listed: CORS. The part that needed care was the session cookie. A wildcard origin cannot be combined with credentials, so allowing `*` would have kept every public page working and quietly signed everyone out of the Dock. The config now rejects it by name. The browser calls `api.lodestar-dashboard.com` directly, and the proxy is deleted.

## A wallet that cannot spend anything

The wallet tests use an injected provider with no RPC connection and no key. It records the transactions a page asks for and returns a fake hash. Any method it does not implement throws an error rather than falling back to something that might reach a real chain. That rule paid off quickly: when connecting stalled, the provider named the missing method straight away.

The most expensive bug in that work was mine. The test address had 42 hex characters instead of 40. The wallet library rejected it silently, the page kept showing "Connect Wallet", and nothing logged an error.

The seven tests check that the wallet connects, that delegating refuses an account with no GRT and sends nothing, that curation and the Dock are reachable, and that undelegate and the Dock's lifecycle controls are not offered to someone who shouldn't have them. They stop at the transaction being sent. Waiting for it to be mined goes through the real RPC, which has never heard of a fake hash, so that half stays with the unit tests. The test file says so.

## The afternoon it fell over

The cleanup went well until the proxy was deleted. Then the monitor reported 33 failures against a site that was working fine, because one test script was still asking the old host for `/api/…` and getting an HTML error page. I had fixed a similar script and missed this one because it built its URLs differently, so my search found nothing. A search that finds nothing looks the same as a search with nothing to find.

The real problem was in the backend's gate in front of the database, and it came in three layers:

- A queue timeout of three seconds, against a cold portfolio query that takes fifteen. After a few restarts emptied the cache, the warmer whose job is to fill it gave up after three seconds like everything else, so the cache never filled.
- The two indexer profile endpoints each run six parts at once against a pool of four permits. The first four took every permit, the other two queued for one, and the four held were not released until all six had finished.
- The actual cause: shared in-flight queries only make progress while someone is waiting on them. When every caller gave up, the query stopped halfway, still holding its permit. One permit was lost for each abandoned request, until none were left.

The clue was a counter that stopped moving. Completed queries stayed at 52 for 51 seconds while timeouts kept climbing. There were no open connections, the database answered in milliseconds, and the server was idle. Nothing was slow. The pool was simply full of work nobody was doing.

My fixes made parts of it worse first. Raising the timeout meant each stuck request held the pool for longer. Raising the permit count from four to eight broke a rule written in the config: never allow more concurrency than the database accepts. The database accepts four, so the extra requests were rejected there instead, and the page sweep kept flagging errors on different pages each run. I explained that away more than once as a cold-cache blip before accepting that it was my own change. The permits are back at four, and rejected requests went from 43 to zero.

## Why Stage 2 isn't happening

The rule says to stop if changes keep landing correctly and CI stays green. Across the two releases, 25 changes landed on Lodestar and 16 on the backend, each merged with CI green, and none of the trouble had anything to do with Next.js. Every problem was in data handling, test fixtures, or the backend gate. Those would have been the same in any framework.

What didn't improve: the dashboard is no faster, because none of this touched rendering. It still runs on Next.js, and the five OpenGraph cards are still rendered by it, which is fine now that moving them is known to be simple. If the framework ever becomes the problem, Stage 2 will cost the same then as it would today.

## Where it stands

Lodestar v7.0.0 and kittiwake v0.2.0 are out. The frontend has 921 unit tests and 29 browser tests, the backend has 586, the monitor checks 54 response contracts, and the page sweep reports every one of its 39 pages loading without errors. Scuttlebutt, the anonymous message board, has been removed. The 31 messages people posted are still in the database, because removing the board is a different decision from deleting what was written on it.

The rewrite turned up about a dozen live bugs without rewriting anything. Most were found by making the code state what it expected. The worst one was found by noticing a number that had stopped changing.
