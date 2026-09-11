---
title: "Lodestar Is a Frontend Now"
date: "2026-09-12"
author: "cargopete"
tags: ["lodestar", "rust", "kittiwake", "nuthatch", "the-graph", "migration", "vercel", "infrastructure", "testing"]
category: "Infrastructure"
originally: "https://www.lodestar-dashboard.com/blog/lodestar-is-a-frontend"
excerpt: "Ninety-three API route files became one. Thirty-eight thousand lines came out of the frontend, four credentials left Vercel, and the migration kept finding bugs that had been live for months, not because anyone audited the code but because two implementations were forced to agree on the same answer. The last route is still there, and this explains why."
---

*Five days ago Lodestar's API [became one Rust process](/dispatches/lodestar-api-is-one-rust-process/) for thirty-six of ninety routes. Today the count is **one of ninety-three**. The frontend repository has lost **38,213 net lines**, four credentials have left Vercel, and the dashboard no longer holds a database connection, a Redis connection, or any key that signs anything. The interesting part is not the count. It is that forcing two implementations to produce the same answer found about a dozen defects that had been live for months, and the last unmigrated route is a lesson in why "it works" is not the same as "it is correct".*

---

## The accounting

Ninety-three route files at the start of the week. One now: `/api/sql/receipt`, which is a story of its own further down.

The frontend repository is 271 source files, down by a third. `src/` lost 53,647 lines and gained 15,434, a net of **38,213 removed**. Almost none of that was porting. It was deletion: modules whose only callers were API handlers that had moved, and which nothing had noticed were dead.

kittiwake serves 85 routes from one process on one box, with 584 tests. Lodestar has 947, down from 1,390, because several hundred of them were testing analysis that now runs in Rust and is tested there instead.

Environment variables read by live frontend code went from 27 to 13. The four that matter are gone: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, and `TAP_SIGNER_PRIVATE_KEY`.

## What actually found the bugs

The migration's real output was not speed. It was a dozen or so defects, and they were nearly all the same defect wearing different clothes: **absent data rendering as a definite answer.**

The dashboard had a panel that read "All clear. No indexers are currently serving bad or no data." It said that when the probe failed. Twenty-three components did some version of this: a loading flag read as an absence, an absence rendered as good news. Four query functions turned a 500 into an empty list, which the UI drew as "nothing here" rather than "we do not know".

None of that was found by reading the code. It was found by pointing two implementations at the same question and diffing the shape of what came back, then asking why they differed.

Some of what that turned up:

**A fatal error that had lost the field saying whether it would happen again.** graph-node reports a failure as `{message, handler, block, deterministic}`. The Rust port returned only the message. `deterministic` is the one a message cannot carry: it separates a subgraph broken at a known block for everyone, permanently, from an indexer whose store had a bad minute. Collapsed to one sentence, those look identical and a reader has to guess.

**Then the fix shipped green and stayed broken.** The parser learned the three fields and its tests passed, because the tests fed it a payload containing them. Production stayed null, because the GraphQL query asked graph-node for `fatalError { message }` and nothing else. The parser had never seen those fields because nothing had ever requested them. A test of a parser is not a test of the pipeline, and the query now has a test that names every field it must ask for.

**`sourceHint` was null for every deployment**, because a lookup filtered for 64-character hex ids and was being handed `Qm…` CIDs.

**A moderator delete that refused every call.** In axum, `Json<T>` makes the body mandatory, so a client sending none is rejected before the handler runs. Found only because I went to clean up my own test message.

**A monitor probing a route that had been deleted weeks earlier**, which a test now catches by requiring every path in the end-to-end contract list to exist somewhere.

**`signalledGrt` against `signalledGRT`.** One character, rendered as a zero.

The pattern is worth stating plainly, because it is the argument for doing migrations this way at all: a second implementation is an oracle. It does not care what you meant. Twelve of these were invisible to a test suite that passed, and visible in about four seconds to a script that compared field names and types between two URLs.

## Credentials are not used, only reachable

The last stretch was getting secrets out of the frontend, and it produced the most surprising finding of the week: **three of the four credentials were not being used by anything. They were merely reachable.**

A page wanted `SYNC_TOLERANCE_BLOCKS`, a number, and imported it from a module that also contained a TAP receipt signer. A Dock panel wanted one row's TypeScript type, from a module that opens a Postgres connection. A sign-in hook wanted a message-formatting function, from a module that reads the session secret. In every case the credential-reading code was dead, but the module was in the import graph, so the variable was in the environment.

Each fix was the same: move the harmless thing into a file of its own. That is all it took to get a key that spends GRT out of a web frontend.

The preview cards were the genuine case. Those render on the server, because a crawler does not run JavaScript, and three of them queried the nests and Postgres directly to get the numbers on the card. Rendering a PNG is a frontend job; holding a database credential to do it is not. They ask the API now, like everything else.

## The thing I got wrong

`vercel env pull` does not return the value of an environment variable marked Sensitive. It writes the literal string `[SENSITIVE]` into the file, and says nothing about having done so.

A deploy script copied four secrets from Vercel to the box. Three of them were Sensitive. The Scuttlebutt moderator password on the live board was therefore the eleven characters `[SENSITIVE]` for about a day, which is a string anyone who has run that command could guess.

The part worth sitting with: **the script caught it.** It refused an eleven-character trip salt as too short. I then argued the length check away, on the reasoning that inventing a minimum for a salt would be worse than useless, because whatever length the incumbent's salt happens to be is the length that derives every tripcode in the room. That reasoning is correct about salts. It was the wrong lesson here, because the value was not a short secret. It was not a secret at all, and length is not what catches that.

The fix is a shared guard that refuses the placeholder by name rather than by shape, and it is shared rather than copied because copying was the other half of the problem: two scripts checking the same key drifted, one stripping a `0x` prefix and one rejecting it as non-hexadecimal, so the same key was valid in one and corrupt in the other.

## The one route left

`/api/sql/receipt` signs a receipt for a SQL answer: what was asked, which block it was true at, the hash of the rows, and a signature.

kittiwake can serve it. The route is written, the key is on the box, and it produces receipts. It is still not switched over, for a reason that took three attempts to see.

**A receipt names the public half of the key that signed it.** Install the wrong issuer key and the receipts already in circulation do not become invalid-looking. They become unverifiable, signed by a key nobody can look up, which is worse because it is indistinguishable from forgery. And from the installing end it is indistinguishable from success: the service starts, the route answers, the receipt is well formed.

The deploy script checked that the key was 64 hexadecimal characters and that the route had stopped saying "this deployment does not issue receipts". Both were true. Both were beside the point.

It compares public keys now. The incumbent publishes its issuer key in every receipt it signs, so the check needs no secret at all: ask it for one, read the public half, refuse if they differ. They differ. The key we have derives to `bd3b3313…` and production signs with `64cc87e9…`, and until that is resolved the route stays where it is, because a migration that quietly invalidates every receipt it ever issued is not a migration anyone should want.

That is the whole remaining gap: one route, one key, and a check that now fails loudly instead of succeeding quietly.

## What did not get better

Nothing about the frontend got faster this week. The dashboard is the same speed it was, because none of this touched rendering. The previous dispatch already moved the slow parts.

The repository is not yet a pure frontend either. It still runs on Next.js, still renders five OpenGraph images on the server, and still holds `NUTHATCH_PASSWORD` and `TATTLER_ISSUER_KEY` for the one route. "One route away" and "done" are different claims and it is worth keeping them apart.

## Where it stands

One route file, 85 routes on kittiwake, twelve scheduled jobs with nothing silent and nothing failing, no schema gaps. 947 tests one side, 584 the other.

The next honest step is the issuer key, and after that a question that only became askable once the answer stopped mattering for the backend: whether a repository that is now a client for one JSON API should still be running a server framework. There is an argument that it should not. There is a better argument for leaving it alone until something concrete goes wrong with it, and the rewrite that sounds most appealing is the one most likely to be a way of avoiding the boring work.

The migration found a dozen live bugs in five days. None of them were found by looking. All of them were found by making something disagree.
