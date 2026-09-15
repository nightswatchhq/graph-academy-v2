---
title: "The Performance Charts Are Back, and Now They Add Up"
date: "2026-09-15" # TODO(release): the publish date. A placeholder, kept parseable because the schema coerces it to a date.
author: "cargopete"
tags: ["lodestar", "nuthatch", "foghorn", "kittiwake", "the-graph", "qos", "indexers", "gnosis", "ipfs", "correction"]
category: "Infrastructure"
excerpt: "Query Performance, the QoS Quality panel and the directory's QoS column are back on Lodestar, read from Edge & Node's QoS oracle postings on Gnosis through a nest anyone can run. Rebuilding them showed the old charts averaged averages, hid outages and sat on a subgraph that had dropped whole buckets. Getting the new ones live took three days of faults, most of them silent and several of them ours. This is every figure, every fault, and how we checked."
---

<!-- TODO(release): the publish date, here and in the front matter. -->

*On 13 September stake-machine asked in the Night's Watch Discord whether we had taken the performance charts off Lodestar's indexer page. We had, on 5 September, when Lodestar [stopped reading subgraphs](/dispatches/lodestar-reads-no-subgraphs/). [The first post](/dispatches/the-pnl-was-wrong/) brought back Daily Trends and owned up to a wrong P&L panel. This one covers the rest: Query Performance, the QoS Quality panel and the directory's QoS column. It explains what every figure on them means now, how the pipeline behind them is built, and what went wrong in the three days it took. A good deal went wrong. Most of it was silent, and several of the faults were ours.*

<!-- TODO(release): the time lodestar#231 went live, e.g. "They have been live since HH:MM UTC on DD September." -->

---

## Why the charts went away

On 5 September Lodestar gave up its Graph API key (nuthatch#1160). The rule we set was that anything which could not exist without a key would be removed, not kept on an exception, and three things on the indexer page could not. Commit `cb61cea` removed Query Performance and the QoS Quality panel, which read Ellipfra's fork of Edge & Node's QoS oracle subgraph through the gateway. `cd47802` removed Daily Trends, which read a community Horizon performance subgraph. The directory's QoS column went with the panel.

We recorded the oracle at the time as "not indexable by nuthatch by design", because it publishes through a contract call and emits no events. That was already out of date on the day. nuthatch had decoded top-level calls and indexed Gnosis since 19 August, and had resolved IPFS documents since v2.6.0. The real gap was small: nuthatch could not read an IPFS address inside JSON calldata. It is the sort of sentence that gets written at speed and then believed for a week.

When stake-machine asked, we said the charts would come back, and opened the design as lodestar#228 the same day.

## Release 1, briefly

The work split in two. Daily Trends and the P&L needed no new nuthatch capability, so they shipped first, on 14 September, with [their own post](/dispatches/the-pnl-was-wrong/). In short: the P&L panel had dated rewards by allocation close, counted the delegators' share as the indexer's and shown fees gross, and over the 30 days to 13 September it misstated 54 of the 58 indexers that were paid, by 7.2 million GRT between them. Daily Trends came back on the Arbitrum reward and fee events themselves, and matched the old subgraph to the wei on 327 of 327 indexer-days.

That release had trouble of its own. A browser check before it went live found charts drawing slopes between lump payments that never happened, and a Net figure that had not computed since the cutover; both were fixed first. The largest indexer's page then failed from 10:18 to 10:47 UTC, when its delegators list ran out of memory (kittiwake#144).

Everything below is release 2.

## Where the numbers come from

Edge & Node's gateway measures every query it routes and aggregates them into five-minute buckets. For each bucket it pins two JSON documents to IPFS: one with a row per indexer, deployment, chain and gateway, the other with a row per deployment. It then calls `submitQoSPayload(bytes)` on a `DataEdge` contract on Gnosis, `0x5b4293b4c0f36cb5d4448950830bc777759b6c4f`, with a small JSON object naming the topic, the document's CID and the bucket. An indexer document is 1.5 to 1.9 MB and 2,500 to 2,900 rows, and it lands on chain about half an hour after its bucket closes.

That publication is public and permanent, and needs no key. The old charts read it through a subgraph. Four pieces read it now.

**The nest.** `qos-reo-nest` is a nuthatch nest on Gnosis. It decodes the `submitQoSPayload` calls from block bodies, reads the CID out of the JSON, fetches the document, and proves it against the CID before writing anything. The documents span many IPFS blocks, so nuthatch re-encodes each one as `ipfs add` would and checks the root hash, falling back to fetching and checking every block; all 4,025 documents we measured from 6 to 12 September prove the first way. A proven document becomes one typed row per element, and its raw JSON is dropped. Only postings from Edge & Node's publisher count, judged by the sender every call row records. SQL views turn the rows into daily figures per allocation, per indexer and per deployment.

The nest holds every posting from block 46,700,000 (14 June, 23:15 UTC) to the tip: 9,026 sealed segments, 4.29 GiB on disk.

**Kittiwake**, Lodestar's API, never asks the nest for more than one day at a time, because one day of the rollups fits in the nest's 512 MB analytics budget and eight days did not. Every 30 minutes a job computes each day and stores it in Postgres, with the nest provenance it came from. A day settles only on evidence: sealing covers its last posting, every document its postings name is stored, and the publisher has posted past its end. The routes serve settled days from Postgres and ask the nest only for today; if the nest refuses, today is left out and the answer is marked degraded instead of failing. An hourly job scores every indexer for the directory.

**Lodestar** draws the charts (lodestar#231).

**Foghorn**, our own prober, supplies a second series, which kittiwake proxies.

Getting nuthatch there took seven pull requests, released as 3.8.0 on 14 September: a CID inside JSON, documents proven however many blocks they span, resolution that retries until a document arrives or is recorded as given up, seal cuts bounded by bytes, and typed rows from JSON. None of it is specific to this nest. A fault the backfill found needed an eighth, released as 3.8.1 the next morning.

## What each figure is now

### Query Performance

The card keeps its six small charts over a 90-day window. Every figure counts traffic through Edge & Node's gateway, per UTC day.

**Query Count** is the queries the gateway routed to the indexer, summed across its allocations. **Query Fees** is the fees on them. Both mean what they meant before.

**Avg. Query Fee** is fees over queries. Its headline used to show the latest day only, beside window totals for everything else. It now shows the window and the latest day, each labelled.

**Query Success Rate** is 200 responses over queries. The daily points were already weighted by queries, and match the old chart. The headline was not: it was the plain mean of the daily points, so a day with fifty queries counted as much as one with fifty million. It is now the window's 200s over the window's queries. Beneath the chart are the bad buckets, five-minute buckets with at least 50 queries and under 90% success, and the worst five minutes in the window, with its time and volume.

**Avg. Indexer Latency** is weighted by queries, per day and in the headline. The oracle's own average behaves as if it includes failed responses: weighting it by successful responses instead moved latency by more than 20% on 99 of 374 indexer-days, all of them days with many fast failures. So we weight by queries and say so. Foghorn's p50 and p95 sit beside it.

**Behind Freshest Peer** replaces Avg. Blocks Behind, which added up blocks across chains whose block times differ 48-fold. The new card is seconds behind the most current credible indexer on the same deployment, using each chain's block time. A peer is credible with at least 100 measured queries that day, and a deployment needs three credible peers before anyone can be behind them. A deployment without three is left out. The card says what share of the indexer's queries it was measured on, and what share of those ran more than five minutes behind.

### Days, gaps and partial days

A day is the UTC day of a bucket's start. The publisher's own timestamp is the bucket's end, and dating by that would file the 23:55 bucket under the next day. A bucket posted twice counts once, from its first document.

A day with every bucket is drawn solid, a day missing some is drawn hollow, and a day with none is a gap on an evenly spaced 90-day axis. Nothing is filled with zero. The source has real gaps, in Edge & Node's data rather than in the nest:

- about 59 hours from 1 July 03:50 UTC to 3 July 14:55, while the publisher changed address;
- about 38 hours from 29 July;
- 37 hours or more from 4 August;
- two indexer buckets and five deployment buckets between 6 and 12 September that were never posted;
- postings whose document is empty, or proves against its CID but is not valid JSON. In the first 22% of the window alone the nest found 61 postings of the empty file and 55 malformed documents.

The publisher resumed from the tip after each outage and did not backfill. An empty card says how old the latest indexed posting is, and no longer claims that the gateway routed the indexer nothing. An earlier version of it did, which comes up below.

### QoS Quality

The panel keeps its grade (A from 75, B from 60, C from 45, D from 30, F below), its four bars (reliability, latency against the indexer's cohort, freshness and coverage), and its list of the deployments holding the score down. The scoring moved from Lodestar's TypeScript to Rust in kittiwake with every constant unchanged.

One input changed on purpose. The panel compares an indexer's share of allocation with its share of routed queries, to show indexers the gateway routes around. The old code divided an indexer's attempts by the gateway's query count, but the gateway sends one query to several indexers, so shares went as high as 4.0, and on 7 September 746 of Ellipfra's deployments had a share over 1. Served share is now an indexer's attempts over every indexer's attempts on the deployment, so it is bounded and the shares sum to 1. On 7 September's traffic, with the allocations open on 13 September:

| Indexer | Allocated deployments | Gap, old share | Gap, new share |
|---|---:|---:|---:|
| Ellipfra | 2,006 | -0.138 | 0.103 |
| Pinax | 324 | -0.130 | 0.171 |
| nodeify | 20 | 0.238 | 0.307 |
| waynewayner.de | 40 | 0.236 | 0.247 |

The old figure read Ellipfra and Pinax as served more than their allocation warrants, when they are routed less. The panel now words the gap as allocation share minus routing share, and its history is recomputed from stored days instead of starting whenever a cron first ran.

### The directory's QoS column

The column shows the same score as the panel, computed hourly for every indexer and served with the directory's other fields. It used to come from a separate leaderboard over the old Postgres copy.

### Foghorn, beside the oracle

Foghorn sends block-pinned queries to indexers, pays for some of them directly, and compares the answers. On the success and latency charts its figures are a dashed line, captioned as probes rather than demand, with the share it paid for stated. It adds two things the oracle cannot: a correctness chart, shown only when Foghorn probed the indexer, and p50 and p95 latency. There is no window p99, because most of its five-minute buckets hold a single probe.

Until 14 September Foghorn's quality routes reported zero probes for every indexer, chiefly because they took a gateway probe's signing key for the indexer. foghorn#3 fixed that and the rollup faults beside it, and was deployed that day with all 52,089 stored buckets recomputed, so earlier Foghorn figures are withdrawn. Measured through the fixed endpoints at 17:08 to 17:10 UTC on 14 September, over seven days:

- Foghorn probed 127 indexer-deployment pairs; the oracle covers 5,177.
- Of 56 overlapping pairs with at least 20 probes, success rates differ by a median of 1.3 points, and by 10 or more on 9, in both directions. Probes and organic traffic are different samples.
- On the 42 pairs with at least 20 comparable answers, none served minority data.
- In the 24 hours to 17:09 UTC, indexers refused 2,315 of our paid probes because they denylist our payer, against 393 served.

## What the old charts got wrong

We rebuilt the old pipeline from the raw documents for 6 to 12 September: 2,014 indexer documents, 4,800,241 rows, 56 indexers, 388 indexer-days. The daily points it plotted were right. What was done with them was not.

**Headlines averaged averages.** Against the query-weighted window, success rate was off by more than one point for 22 of 56 indexers and by more than five for 13. staked.cloud showed 62.7% when it had served 83.4%; nodeify.eth 56.4% for 69.8%; waynewayner.de 78.6% for 67.7%.

**A day hid its outages.** Ellipfra served 97.36% that week while one bucket on 8 September served none of 52,286 queries. tehn-r.eth had 474 buckets under 90% success, the worst 0 of 5,997.

**Blocks behind meant nothing.** One arbitrum-sepolia deployment 306 million blocks behind put 0x0a015d9e at 1.59 million for the week.

**The subgraph had dropped data.** On three days that week it was short by exactly five whole buckets, because its mapping skips a document when IPFS does not answer and never retries. The nest has all five.

Our own design was wrong too: its first draft called the old daily success rate an unweighted mean, and measurement corrected it. None of this was a fault in Edge & Node's data.

## Three days of things going wrong

### 13 September: the design meets the code

Building the nest found faults in nuthatch before a single figure was right. Each would have made the charts quietly wrong.

- The first live run resolved 36 documents and proved none of them. Every one was larger than the 256 KiB a single IPFS block holds, and nuthatch could only prove single-block documents (fixed in #1373).
- A document that missed a window's 64-fetch budget, or whose fetch failed, was never tried again. At Gnosis's default window that would have lost over 90% of a backfill without a warning, and one document for 7 September that failed with "reading response body" shifted the day's figures for 49 of 56 indexers (#1374).
- Call rows carried no sender, so the nest could not tell Edge & Node's postings from anyone else's (#1374).
- `--seal-direct`, the fast backfill path, decoded no calls and resolved no documents. A backfill that way would have produced nothing and said nothing (#1374).

Then memory. The first views parsed the JSON on every query, and one day needed 3.86 GB against a 512 MB budget. Sealing reached 3.17 GB, and in a larger run 11.35 GB, because a seal cut counted rows and blocks but never bytes. A SQL read that raced a segment fold answered short, with only a warning in the log. Typed rows (#1377) and a byte-bounded seal cut (#1391, #1376) fixed the memory, and a fold now keeps a replaced file until its readers let go. Even so, eight days of the chart would not serve within nuthatch's default memory, which is why kittiwake stores each closed day and no statement spans more than one.

### 14 September: review and release

nuthatch's required automated reviewer asked for changes on four of the stacked pull requests. All five of its findings were real, among them a document outstanding at block 0 that did not hold sealing, and a small valid document with a non-default chunk size refused as tampered. The release then waited on two faults on nuthatch's main branch that had nothing to do with it: a build broken by two pull requests that had each been green on its own (#1393), and a TLS advisory that failed the dependency check (#1394). nuthatch 3.8.0 was published that evening, and the QoS nest started its 90-day backfill on it at 19:46 UTC.

The same day, kittiwake's four new QoS tables were created in production Postgres under the wrong owner. Nobody noticed until the next morning.

### 15 September: the backfill

**The empty file.** At 06:28 UTC, ten and a half hours in, 22% of the window was sealed. By 08:19, nearly two hours later, it had advanced 5,300 blocks. The logs kept naming one CID, `QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH`: the empty UnixFS file, which the oracle's history names again and again, and which The Graph's gateway correctly answers with HTTP 204 and no bytes. nuthatch 3.8.0 refused an empty body before checking it against the CID, so it retried a permanent, valid answer ten times with backoff, about half an hour for every window that held one. nuthatch#1397 lets the empty file reach the proof, pass it, and be refused as a document once. We released that as 3.8.1 and moved the nest onto it at 08:19; it resumed from its watermark. Of the 116 documents the 3.8.0 run had given up on, 61 were the empty file and 55 were documents that prove against their CID but are malformed JSON at the source. None was lost to a timeout or a gateway error.

**The wrong owner.** A private copy of the new kittiwake, started before the live one, failed with `must be owner of table qos_allocation_day`. The tables created the day before belonged to the wrong database role. We gave the four of them to the role that writes them, and the private copy started. Nothing live was affected.

**An empty card that overclaimed.** In the same private check, an empty Query Performance card said Edge & Node's publisher had not posted for 72 days. It had. Our backfill had simply not reached the recent postings yet. The card now reports the age of the latest indexed posting and does not infer missing traffic from missing rows (lodestar#231).

**Silent pauses.** On 3.8.1 the backfill ran at about 305,000 blocks an hour, then stopped for 14 minutes at a time with no log line: 08:34:20 to 08:48:31 UTC, for one. We ruled things out in order: no RPC failures or retries, cached documents served in 0.07 s, no memory, CPU or IO pressure, and no open connections during a pause. The cause is nuthatch's seal-direct IPFS loop: a failed fetch is retried with a backoff that starts at 5 seconds and doubles to 600, and nothing is logged until the tenth failure (nuthatch#1399). Seven failures come to more than ten minutes of silent sleep.

The failures behind it were real, and of two kinds. A document The Graph's gateway had not cached took about 30 seconds, which is exactly nuthatch's HTTP client timeout; one we timed took 29.86 s. Some documents it never finished at all: fetched by hand, two stopped after 256 to 320 KiB at 45 seconds, while Pinata's gateway served both whole in 4.6 and 6.1 seconds. Two days earlier, our measurement had fetched sample documents up to 90 days old in about a second each.

**The fixes, all operational.** No code changed for these:

- Three Gnosis RPC endpoints instead of one, a private Alchemy endpoint and the two public ones, and `--concurrency 8`. With a single `--rpc`, seal-direct fetches one window at a time however high `--concurrency` is set. `--concurrency 6` on the public endpoints alone had fetched nothing for four minutes, and we reverted it.
- Pinata as a second IPFS gateway. It adds no trust: every document is still proven against its CID, whichever gateway served it.
- A read-only warmer fetching documents ahead of the nest, so the gateway had them cached by the time nuthatch asked. It warmed 30,396 documents; 1,283 were slow, and 10 failed on The Graph's gateway and were served by Pinata.
- The unit's memory ceiling raised from 2 to 2.5 GiB, after 1,644 throttling events at 2 GiB.

From 09:42 the backfill ran at about 15,000 blocks a minute, against 170,000 to 305,000 an hour before, and did not stall. Sealing finished at 10:43:35 UTC. The last run sealed 58,891,501 events over blocks 47,231,597 to 48,261,084 in 1 hour 4 minutes, and the nest has followed the tip since, about 12 blocks behind.

**Kittiwake's day job.** Kittiwake went live with the QoS routes at 08:58 UTC, while the backfill ran. Its day job first ran at 09:19, computed 14 of 90 days at 17 to 30 seconds each, and was stopped by the scheduler's default five-minute timeout. kittiwake#147 gives that one job 25 minutes, under its 30-minute period.

**Nineteen missing days.** Kittiwake's stored days then began on 3 July for every indexer, although the nest held about 840,000 typed rows a day from 14 June. The documents were stored and proven; the views filtered them out, with no error and no warning. The nest listed one publisher address, `0x8cbbe43f…`. Grouping every posting by sender showed Edge & Node had used two:

- `0x0b8cef00f90553b9535845be6abbe3797582d424` sent all 9,264 postings from the first indexed block to 1 July 03:50 UTC (block 46,972,821);
- `0x8cbbe43f97f80efa6ba0a95f3d544e03f84db0ce` sent all 25,711 from 3 July 14:55 UTC (block 47,014,403).

The two never overlap, the typed rows from both carry the same gateway ID (`0xff4b7a5efd00ff2ec3518d4f250a27e4c29a2211`), and a June transaction's sender checks out on chain. The 59 hours between them are the source gap listed earlier. qos-reo-nest#3 lists both, and went live as a pull, without a re-index.

**The 30-second budget.** The next day-job run, at 10:21, failed every June day with HTTP 400 from the nest. nuthatch's read-only SQL surface gives a statement a fixed 30 seconds, and even with the nest idle, one day of the indexer view was refused after 34.9 s, seconds behind after 60.0 s and the allocation view after 40.3 s. Two things made a one-day statement read everything. `day` was computed from each row's `start_epoch`, so a filter on it could not prune a single Parquet segment. And the dedupe that keeps each bucket's first document joined back over every row, all 66.6 million of them. qos-reo-nest#4 joins rows to a day calendar on a `start_epoch` text range, which DuckDB pushes into the Parquet scan, and replaces the join-backs with window functions. Afterwards, on the idle nest, the day probe took 1.64 s, the indexer day 17.23 s, seconds behind 11.55 s and the allocation day 10.47 s. The output is identical: for 18 June, 49 indexers and 6,838 allocation rows match the old views row for row, as do 48 and 6,287 for 5 July, and the new dedupe picks the same document in all 49,592 buckets. It went live at 11:52 UTC, again as a pull, and the day job then filled at about 14 seconds a day.

**Eight years behind.** With days filling, the Behind Freshest Peer chart for 0x2f09… scaled to 69 days. When a deployment had fewer than three credible peers, the view fell back to the indexer's raw lag, blocks behind times block time with nothing subtracted. A deployment that answered two queries on BSC therefore read as 255,917,126 seconds, eight years, behind peers it did not have, and a few such deployments owned the daily mean. qos-reo-nest#5 leaves them out, and the card now says what share of queries it measured. On 7 September across 56 indexers, the worst indexer went from 15,801,710 seconds to 3,451, the median from 25 seconds to 6, a median 98.2% of queries were still compared, and 3 indexers had no figure. Real lag stays: 0x2f09… reads 599,108 seconds for 14 July, because on one mainnet deployment it trailed three credible peers by about 37 days. So do figures we cannot explain. For 21 to 23 July the oracle records p2p-org-arbitrum.eth (0x2f09…) answering 208,924 queries on one mainnet deployment at an average of 5,832,243 blocks behind, about 810 days, while its three peers on that deployment were 1,609 to 3,742 blocks behind. A gateway routing that much traffic to an indexer two years behind is not plausible; a wrong block number reported to the gateway is. The chart shows what the oracle posted, and that indexer's 90-day average reads about four days behind because of those three days.

### What was ours

Some of this was not nuthatch or the data. It was us.

**Two copies of one working session.** At 10:48:26 UTC on 15 September, a second copy of the same deployment session, resumed in another terminal, raised the QoS nest's SQL concurrency from 2 to 4 without checking nuthatch's memory gate. Four permits at 512 MB each plus nuthatch's reserve came to 3,072 MB against its 2 GB budget, so nuthatch refused to start, and the nest crash-looped nine times until 10:51:28, when the setting was put back. For those three minutes kittiwake reported itself not ready; the live site kept serving. The second copy stood down, and a guard now checks the unit file every two minutes.

**The table owner and the empty card**, both above, caught in a private check before either reached the live site.

**The publisher list.** Our own measurement on 13 September recorded that the old subgraph's allowlist held `0x0b8cef00…` and would reject the live publisher. The nest listed only the live one, and 19 days went uncounted.

**Silence, repeatedly.** The empty-file retries, the backoff, the filtered publisher and the 30-second budget each showed up as something slow or missing, never as an error naming its cause. Each was found by measuring one variable at a time, and each would have been found sooner by a log line. And we designed from a week that did not behave like 90 days.

## How we checked

What is verified:

- **The old pipeline, rebuilt.** From 2,014 raw documents for 6 to 12 September, the rebuild matches the old chart's daily success rates within 2e-9 percentage points on all 388 indexer-days, and its fees exactly.
- **The nest against an independent reference.** For 7 September the nest's documents are byte-identical to copies we fetched separately, and its daily figures over all 288 buckets match a reference computed by a script that shares no code with the views: counts exactly, rates and fees within 1e-9. The check ships with the nest as `checks/parity-2026-09-07.sql`.
- **The nest against the old subgraph.** Against Ellipfra's fork, the one production read, for 6 to 12 September: all 388 indexer-days present on both sides, latency a median ratio of 1.000 and a p90 of 1.002, fees a median relative difference of 2.2e-15, and query counts and success rates exact on four of the seven days. On the other three, the subgraph is short by exactly the per-indexer queries of five buckets (6 September 02:45, 15:10 and 19:25; 9 September 12:30; 10 September 15:40), which its mapping lost.
- **Kittiwake.** The score matches the TypeScript it replaced on 689 generated cases, within 1.16e-10. Stored days filled from a local nest match the parity reference for all 56 indexers on 7 September, and so do the card figures for five named indexers.
- **The one-day rewrite**, row for row against the old views on 18 June and 5 July.

What is not:

- **The rest of the window against the old subgraphs.** Lodestar holds no key, so that comparison has to be run by someone outside Lodestar with their own. It was run once, for 6 to 12 September. Outside that week no figure has been compared with the old subgraph, and outside 7 September none with an independent rebuild.
- **The served gap over a real 30-day window.** The table above uses 13 September's allocations against 7 September's traffic.
- **Every day settling.** The rebuild on 15 September computed all 90 days of the window without a failure: 4,450 indexer-days across 59 indexers. 78 days settled; 12 stay open, and a day stays open while any of its documents is unresolved, so kittiwake re-checks those on every run with a short probe rather than recomputing them. Across the nest's 92 indexed days, 24,827 of the 24,843 indexer-attempt buckets Edge & Node posted are stored, and 24,829 of 24,833 query-result buckets. 320 indexer-attempt and 45 query-result documents never resolved, most of them the empty file and truncated JSON described above, on 10 and 9 days respectively.
- **The populated charts in a browser.** An early check against a private preview showed the empty states only. <!-- TODO(release): the browser check of populated charts and the directory against production data, if it runs before publishing. -->
- **Foghorn's non-determinism flags.** Its detector now counts only judged probes, so flag rates will have moved; we have not measured by how much.

## Checking our work

The nest is public and reads nothing but Gnosis and IPFS. With nuthatch 3.8.1 or later:

```sh
git clone https://github.com/nightswatchhq/qos-reo-nest && cd qos-reo-nest
nuthatch dev --seal-direct --concurrency 2 --window 2000 \
  --rpc https://rpc.gnosischain.com \
  --rpc https://rpc.gnosis.gateway.fm \
  --ipfs https://ipfs.network.thegraph.com/ipfs/ \
  --ipfs https://gateway.pinata.cloud/ipfs/
```

Why those flags. Before 3.8.1, every posting of the empty file costs a window half an hour. With one `--rpc`, seal-direct fetches one window at a time whatever `--concurrency` says, so give it two or more, including your own node if you have one; on public endpoints alone keep `--concurrency` low. `--window 2000` is what we ran, though nuthatch caps a nest of megabyte documents at 400 blocks a window anyway. The second `--ipfs` gateway covers documents The Graph's gateway is slow to serve or never finishes, and since every document is proven against its CID, it cannot change a figure.

Expect silent pauses (nuthatch#1399). The window is about 1.55 million blocks: ours ran at 170,000 to 305,000 blocks an hour on public endpoints, and about 15,000 a minute with a private one added.

Then query it with `nuthatch sql "…"`, one day per statement, as kittiwake does:

```sql
-- Who counts as the publisher.
SELECT * FROM qos_publisher;

-- Whether a day is whole. unresolved_documents counts postings whose
-- document is not stored, including any given up on.
SELECT * FROM qos_day_resolution WHERE day = DATE '2026-09-07';

-- The Query Performance figures for one day.
SELECT indexer, query_count, success_rate, latency_ms, total_query_fees,
       buckets, bad_buckets, worst_bucket_success_rate, worst_bucket_queries
FROM qos_indexer_daily
WHERE day = DATE '2026-09-07'
ORDER BY query_count DESC;

-- Behind Freshest Peer, and the share of queries it was measured on.
SELECT indexer, seconds_behind_peers, share_queries_over_5min_behind, share_with_block_time
FROM qos_indexer_seconds_behind
WHERE day = DATE '2026-09-07'
ORDER BY seconds_behind_peers DESC NULLS LAST;
```

To get a window's figure from daily rows, add up `num_200` and `query_count` across the days and divide, and weight latency by `query_count`. Never average the daily rates: that is the mistake the old headlines made. `nuthatch check` runs the nest's own checks, including the 7 September parity, once that day has resolved.

## What is still open

**nuthatch#1399.** Seal-direct still holds a window on one document's backoff, and says nothing until the tenth failure. The second gateway and the warmer worked around it for us; the fix is to log each retry and bound the wait.

**The SQL budget is tight.** A one-day statement takes 10 to 17 seconds against a 30-second budget, and the nest's two SQL permits are shared by the day job, the routes and anything else that asks. The wait for a permit counts against those 30 seconds, so a burst can still be refused.

**The first visitor waits.** Settled days come from Postgres, but today comes from the nest, live, so the first visit to an indexer page after the cache empties waits on it. When kittiwake shipped, the QoS route took 8.9 s cold; while the nest was still backfilling it waited out its 45-second timeout. After the rebuild, for the largest indexers, the chart data took 4.3 to 8.1 s cold and 0.25 s cached, the score 4.4 s cold and 0.9 s cached, and the per-deployment breakdown 0.5 s. kittiwake#148, which keeps every directory indexer's page warm, is written and not merged, and its extra load on the nests is unmeasured.

**A fast backfill needs a private RPC.** Ours used Alchemy beside the public endpoints. On public endpoints alone, expect it to take several times as long.

**The Graph's IPFS gateway does not finish some documents.** Pinata served every one it failed on this time; a nest pointed only at The Graph's gateway would sit in backoff. The malformed and empty documents are different: permanent gaps at the source.

**One gateway.** These figures describe traffic through Edge & Node's gateway, which is most of the network's but not all of it. The oracle's format carries a gateway ID so that other gateways could publish alongside; none does yet.

## Where the work is

- nuthatch: #1367, #1373, #1374, #1375, #1376, #1377 and #1391, released as 3.8.0 (#1395) once #1393 and #1394 cleared main; #1397, released as 3.8.1 (#1398); #1399 open.
- qos-reo-nest: #1 and #2 (the nest, on typed rows), #3 (both publishers), #4 (one day reads one day), #5 (a peer needs peers).
- kittiwake: #141 (the score), #143 (the routes and stored days), #147 (the day job's timeout); #148 open.
- foghorn: #3.
- lodestar: #231.
- Release 1: graph-allocations-nest#23, kittiwake #140, #142, #144 and #145, lodestar #229, #230, #233 and #235, as [v7.1.0](https://github.com/nightswatchhq/lodestar/releases/tag/v7.1.0).

If your numbers and ours disagree, tell us. Three days of this have taught us that the fault is as likely to be ours as yours.
