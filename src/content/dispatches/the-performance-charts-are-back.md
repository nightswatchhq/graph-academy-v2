---
title: "The Performance Charts Are Back, and Now They Add Up"
date: "2026-09-14" # TODO(release): the publish date. A placeholder, kept parseable because the schema coerces it to a date.
author: "cargopete"
tags: ["lodestar", "nuthatch", "foghorn", "the-graph", "qos", "indexers", "gnosis", "ipfs", "correction"]
category: "Infrastructure"
excerpt: "Query Performance, the QoS Quality panel and the directory's QoS column are back on Lodestar, read from Edge & Node's QoS oracle through a nest anyone can run. Rebuilding them showed the old charts averaged averages, hid outages inside daily figures, overstated served share and sat on a subgraph that had dropped whole buckets. Here is what each figure is now, and how we checked."
---

<!-- TODO(release): publish date, here and in the front matter. -->

*[The first dispatch](/dispatches/the-pnl-was-wrong/) brought back Daily Trends and corrected the P&L panel. This one covers the rest of what went on 5 September, when Lodestar [stopped reading subgraphs](/dispatches/lodestar-reads-no-subgraphs/): Query Performance, the QoS Quality panel and the directory's QoS column. All three are back, and rebuilding them meant measuring the old ones properly for the first time.*

---

## Where the numbers come from

Edge & Node's gateway aggregates every query it routes into five-minute buckets, pins each bucket to IPFS, and posts the address to a `DataEdge` contract on Gnosis (`0x5b4293b4c0f36cb5d4448950830bc777759b6c4f`). An indexer document is about 1.7 MB and 2,500 rows, on chain about half an hour after its bucket closes.

The old charts read this through a subgraph and a gateway key. `qos-reo-nest` now reads the calldata and the documents straight from Gnosis and IPFS, and only from the two addresses Edge & Node has posted from (it changed keys between 1 and 3 July). Every document is proven against its CID before a row is written: nuthatch re-encodes it as `ipfs add` would and checks the hash, and all 4,025 payloads we measured verify. A failed fetch is retried until it arrives, so a flaky gateway delays a bucket rather than losing it.

The nest holds every posting from block 46,700,000 (14 June, 23:15 UTC) to the tip: 9,026 sealed segments, 4.3 GB on disk.

<!-- TODO(release): serving latency at 90 days, once the day statements are measured on the idle nest. -->

## What we checked

We rebuilt the old pipeline from raw payloads for 6 to 12 September: 2,014 indexer documents, 4,800,241 rows, 56 indexers. The old daily success rates match it within 2e-9 percentage points on all 388 indexer-days, and fees match exactly. For all 288 buckets of 7 September the nest matches the rebuild exactly for counts, and within 1e-9 for rates.

Against the subgraph production used to read, over the same week, latency and fees agree. On three days its query counts fall short by exactly five whole buckets: its mapping skips a payload when IPFS does not answer, and never retries. The nest has all five.

<!-- TODO(release): parity against the old subgraphs over the full window, run with a Graph API key from outside Lodestar. Checked so far only for 6 to 12 September. -->

## What the old charts got wrong

**Headline figures were averages of averages.** A day with fifty queries counted as much as one with fifty million. Weighted by queries, success rate was off by more than one point for 22 of 56 indexers and by more than five for 13: staked.cloud showed 62.7% when it had served 83.4%, waynewayner.de 78.6% for 67.7%.

**A day hid its outages.** Ellipfra served 97.36% that week, and one bucket on 8 September served none of 52,286. tehn-r.eth had 474 buckets under 90% success, the worst 0 of 5,997.

**Blocks behind was counted in blocks**, across chains whose block times differ 48-fold. One arbitrum-sepolia deployment put an indexer at 1.59 million blocks behind.

**Served share went above 1.** QoS Quality compares an indexer's share of allocation with its share of routed queries. The old cron divided attempts by the gateway's query count, but the gateway sends one query to several indexers, so shares reached 4.0 and 746 of Ellipfra's deployments were over 1. On 7 September's data that flipped the sign of the gap for Ellipfra (-0.14, now 0.10) and Pinax (-0.13, now 0.17): both read as served more than their allocation warrants, when they are routed less.

None of this was a fault in Edge & Node's data.

## What each figure is now

**Query Count and Query Fees** are unchanged. **Average Query Fee** shows the window and the latest day, labelled.

**Success Rate and Latency** have query-weighted headlines, with bad buckets (at least 50 queries, under 90% success) and the worst five minutes beneath.

**Behind Freshest Peer** replaces blocks behind: seconds behind the most current indexer on the deployment, and the share of queries served more than five minutes behind. It needs peers to mean anything, so a deployment with fewer than three indexers serving 100 or more measured queries that day is left out, and the chart says what share of queries it covers. Without that rule, a deployment answering two queries on BSC read as eight years behind.

**Gaps are gaps.** A day missing some buckets is drawn as partial, and a day with none is not drawn. The publisher was silent for about 59 hours from 1 July while it changed address, about 38 hours from 29 July and 37 hours or more from 4 August, never backfilled, and skipped two indexer and five deployment buckets between 6 and 12 September. The chart says the publisher was silent rather than implying the indexer was idle.

**QoS Quality** keeps its grades and four bars. Served share is an indexer's attempts over every indexer's attempts on the deployment, bounded and summing to 1, and the history covers the whole window. The directory column shows the same score.

## Foghorn, beside it

Foghorn's probes sit on the success and latency charts as a dashed line, labelled as probes rather than demand, and add what the oracle cannot: a correctness chart, and p50 and p95 latency.

Its quality routes had been reporting zero probes for every indexer. The fix was deployed on 14 September and every stored bucket re-rolled, so figures in earlier drafts are withdrawn. Measured through the fixed endpoints at 17:08 to 17:10 UTC on 14 September, over seven days:

- Foghorn probed 127 indexer-deployment pairs; the oracle covers 5,177.
- Of 56 overlapping pairs with at least 20 probes, success rates differ by a median of 1.3 points, and by 10 or more on 9, in both directions. Probes and organic traffic are different samples.
- On the 42 pairs with at least 20 comparable answers, none served minority data.
- In the 24 hours to 17:09 UTC, indexers refused 2,315 of our paid probes because they denylist our payer, against 393 served.

## What we still cannot tell you

These figures describe traffic through Edge & Node's gateway: most of the network's, not all of it. The oracle's format carries a gateway ID so other gateways could publish alongside. None does yet.

## Checking our work

The nest is public and reads nothing but Gnosis and IPFS:

With nuthatch 3.8.1 or later, the same flags our deployment uses:

```sh
git clone https://github.com/nightswatchhq/qos-reo-nest && cd qos-reo-nest
nuthatch dev --seal-direct --concurrency 2 --window 2000 --ipfs https://ipfs.network.thegraph.com/ipfs/
```

Then, once the backfill has passed the day you ask about:

```sql
SELECT * FROM qos_indexer_daily WHERE day = DATE '2026-09-07' ORDER BY query_count DESC;
```

The work is in qos-reo-nest#1 and #2, kittiwake#141 and #143, lodestar#231 and foghorn#3, on top of nuthatch #1367, #1373, #1375, #1376, #1377, #1391 and #1397, released as 3.8.0 and 3.8.1.

If your numbers and ours disagree, tell us.
