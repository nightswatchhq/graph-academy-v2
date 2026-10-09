---
title: "State of The Graph: Q3 2026"
date: "2026-10-01"
author: "cargopete"
tags: ["the-graph", "grt", "foundation", "reo", "issuance", "studio", "governance", "analysis"]
category: "Analysis"
excerpt: "The quarter the multi-core-dev era ended. The Foundation became the operator, took 20% of issuance to pay for it, switched on the Rewards Eligibility Oracle and set a date for Studio traffic to leave the upgrade indexer. GRT printed an all-time low of $0.0129 the day before the mandate was published and closed the quarter above $0.028. What nobody published is a single usage number. Every figure here is dated, and the gaps are named."
---

*An independent update covering July to September 2026, picking up where [State of The Graph: H1 2026](/dispatches/state-of-the-graph-h1-2026/) left off. The Graph Foundation published its own review today, [Q3 2026 on The Graph: The Network Is the Product](https://thegraph.com/blog/q3-2026-in-review/). This is the other one. It covers the same quarter, adds what that post leaves out, and checks a few of its claims against the repositories and contracts they describe.*

> **Editorial note on data.** We have not found a Messari State of The Graph report for Q1, Q2 or Q3 2026, and the Foundation's Q3 review contains no query volume, query fee, active subgraph or revenue figure for the quarter. Its only usage statistic is the lifetime query total in the standing footer, dated early 2026. So the audited quarterly series that used to anchor this report still stops at Q4 2025. What we can offer instead: figures read from public pages and contracts on 1 October 2026, each marked with where it came from, and our own notes from the weekly office hours. Where a number does not exist, the text says so.

> **Interests.** We run the Night's Watch. Lodestar, graph-support, gib and this Academy are ours, [GIP-0090](https://forum.thegraph.com/t/gip-0090-community-allocation-of-0-1-of-issuance-to-the-nights-watch/7083) is our proposal, and the office hours summaries cited below are our notes, posted to the forum the day after each call. Read the sections that touch those with that in mind.

## Key insights

- **The multi-core-dev era ended, in public, in one week.** On 19 August the Foundation published a new mandate: it stops funding and coordinating independent core developer teams and becomes the operator, maintainer and builder itself. On the office hours call that followed, it said the proposed Edge & Node "Labs" arrangement was dead because the Council had voted no, and that Edge & Node was handing its network operations to the Foundation.
- **One fifth of issuance now funds the operator.** GIP-0089 was proposed on 19 August, approved by the Council on 26 August and live on 1 September. 24.146 of every 120.73 GRT minted per block goes to a Foundation-managed Innovation Allocation. Total issuance did not change. Indexing rewards fell by 20%.
- **The Rewards Eligibility Oracle is live, and the population has barely moved.** At launch the dashboard listed 97 indexers, 49 of them eligible. Five weeks later it lists 98, with 55 eligible and 43 that have never qualified once. The first tightening, five subgraphs per active day, takes effect on 6 October.
- **Studio traffic has a date.** Staging queries for BNB Smart Chain and Polygon end on 8 October, and the Foundation has said Studio support for those subgraphs ends on 31 October. About 450 subgraphs may be affected. This is the first real test of whether the network can absorb what the upgrade indexer has been carrying.
- **Direct Indexer Payments are still dormant.** The contracts are deployed and the Council approved their 5% of issuance in April. The internal target we heard is the end of November. Until they activate, a Foundation curation bot is the mechanism for telling indexers what to sync.
- **GRT bottomed and then doubled.** An all-time low of $0.0129 on 18 August, about $0.029 on 30 September. Nobody has established why, and no fee data exists to say whether it was earned.

## The quarter in dates

| Date (2026) | What happened |
|---|---|
| 28 July | ETHGlobal Lisbon winners announced: ten teams, $15,000, four tracks. |
| 18 August | GRT all-time low, $0.0129. |
| 19 August | [A New Mandate for The Graph Foundation](https://thegraph.com/blog/new-foundation-mandate/) published. GIP-0089 proposed. |
| 25 August | Rewards Eligibility Oracle criteria take effect. Liquid staking Phase 1 opens. |
| 26 August | Council [approves GIP-0089](https://forum.thegraph.com/t/the-graph-council-has-approved-gip-0089-the-innovation-allocation/7035). |
| 1 September | [GIP-0089 live](https://forum.thegraph.com/t/gip-0089-is-live-20-of-issuance-now-sent-to-the-innovation-allocation/7053). Last Indexer Office Hours; renamed Graph Office Hours by a 6 to 0 vote on the call. |
| 4 to 16 September | ETHOnline 2026. 354 submissions across The Graph's three tracks. |
| 16 September | One malformed manifest fails every version of the network subgraph. Gateway down about three hours. |
| 22 September | First REO tightening announced. |
| 23 September | GIP-0090 posted. |
| 24 September | [Studio migration announced](https://thegraph.com/blog/subgraph-studio-traffic-to-network/) for BNB Smart Chain and Polygon. |
| 1 October | Foundation publishes its Q3 review. |
| *6 October* | *REO: five subgraphs per active day takes effect.* |
| *8 October* | *Studio staging queries end for BNB Smart Chain and Polygon.* |
| *31 October* | *Studio support for those subgraphs ends, per the Foundation in `#indexers`.* |

## The Foundation becomes the operator

The H1 report ended on a gap: the Technical Roadmap of February had promised a second post on Foundation strategy, and by mid-June it had not appeared. It appeared on 19 August, and it was not a strategy post so much as a change of constitution.

The published version is measured. The Foundation describes its old role as that of a "passive underwriter" of other teams' development and says it will now build, maintain and scale the network and protocol directly. Broad, open-ended grants to core developer teams are replaced by funding directed at the protocol's stated priorities. The Foundation takes over the chain integration process, hires engineers, and commits to a unified Studio, a Substreams data service, an RPC service and a first agentic product described as encrypted, user-owned, portable memory for AI agents.

The spoken version, on Indexer Office Hours #272, was blunter. Per [our notes from the call](https://forum.thegraph.com/t/tldr-for-ioh-272-the-foundations-new-mandate/7036):

- The core developer agreements, described as more than $150 million in total, were financially untenable and attempts to realign them had failed.
- Edge & Node was the obvious partner for a Labs-style entity. It declined in late 2025, the Foundation wrote its own roadmap in February, Edge & Node returned with a counter-proposal, and after months of negotiation the Council voted no.
- Edge & Node is transferring its network operations, and their costs, to the Foundation.

That account is the Foundation's. Ford, a long-standing contributor, gave a different one in Discord, and the Foundation's Nick replied on the forum that he does not agree with it and would prefer to answer in a community call than in a thread. We have not found a full written account from either side, and the disagreement is not ours to settle. The structural reason there is nothing to cite is covered in [what the governance record does and does not show](/governance/what-the-record-shows/): the decision travelled through a Council meeting, and a meeting leaves a roster and a line. What is not in dispute is the outcome: by the [1 September call](https://forum.thegraph.com/t/last-ioh-tldr-transition-week-update/7054) the handover was described as more than 50 platforms and accounts, plus oracles, bridges, contracts, wallets, API keys, monitoring, docs and playbooks, with the stated goal for the following weeks being that nobody would notice.

The team that now runs it, as announced across the September calls: Pedro as Head of Product, Orion as Head of Protocol and Network, Tomas and Miguel on protocol (both from Edge & Node), Carlos leading network infrastructure (from GraphOps), Juan and Samuel in engineering. Some existing Foundation staff were cut to make room. Chain integration contracts moved from Edge & Node to the Foundation during September.

Two things are worth holding at once. First, this is a clearer structure than the one it replaces. Somebody now owns the gateway, Studio, Explorer and the upgrade indexer, and that somebody turns up to a public call every Tuesday. Second, a post titled "The Network Is the Product" describes a quarter in which operation of every piece of shared infrastructure, the curation that steers indexers, a fifth of issuance, the chain deals and a delegation vault were consolidated into one entity. The Foundation's own FAQ answers the decentralisation question by saying it is prioritised where it matters most, which it lists as the network, indexer and gateway layers. Whether the gateway layer becomes plural is therefore the test, and it is the one item on the roadmap nobody outside the Foundation can complete. We [built the box](/dispatches/gib-graph-gateway-in-a-box/); the indexer handshakes are not ours to give.

## Issuance: where 120.73 GRT per block goes now

GIP-0089 changed no contract code and minted no new GRT. It added a target to the Issuance Allocator that GIP-0088 had already deployed. We confirmed the split on chain in September and recorded the read in the [parameter registry](/parameters/).

| Target | Before 1 September | Now | After DIPs activate |
|---|---|---|---|
| Rewards Manager (indexing rewards) | 120.73 | 96.584 | 90.584 |
| Innovation Allocation (Foundation) | 0 | 24.146 | 24.146 |
| Recurring Agreement Manager (DIPs) | 0 | 0 | 6 |
| **Total, GRT per block** | **120.73** | **120.73** | **120.73** |

The last column is approved but not active. It is the 75 / 5 / 20 split described on Graph Office Hours #274.

Annualised at 2025's block count of 2,610,162, the Innovation Allocation is about 63.0 million GRT a year. At the 30 September price that is roughly $1.8 million. At August's low it would have been about $0.8 million. Set either figure beside the "more than $150 million" of core developer agreements it replaces and the scale of the reset is plain: the operator is being funded at a small fraction of what the coordinating model cost, in a token whose price decides whether the budget covers a team.

The Foundation's argument for the timing is arithmetic. In 2025, 15.2% of indexing rewards went to indexers providing "effectively no value," and a further 11.8% to indexers with very low uptime or fewer than 20 query-producing subgraphs. Reclaim that 27% and the 20% redirect is more than covered, so active indexers end up ahead.

That holds as a destination. It does not describe September. As we read the mechanism, an ineligible indexer's rewards are withheld, not redistributed: its allocations keep accruing against the same per-subgraph pool, and its proof of indexing simply reverts when presented. Active indexers only gain when that stake actually leaves its allocations. So from 1 September every eligible indexer took the 20% cut immediately, while the offsetting gain arrives only as non-serving indexers close out. With 43 of them still listed on 1 October, the offset is mostly still pending. If we have the mechanism wrong, we would like to be corrected, with the contract reference.

## The Rewards Eligibility Oracle, five weeks in

The rule, as published in [ELIGIBILITY_CRITERIA.md](https://github.com/graphprotocol/rewards-eligibility-oracle/blob/main/ELIGIBILITY_CRITERIA.md) and in force since 25 August: serve at least one qualifying query on five or more days in a rolling 28-day window. A qualifying query returns HTTP 200, in under 5,000 ms, from an indexer within 50,000 blocks of chainhead. Eligibility is renewed on chain daily and lasts 14 days. If the oracle stops posting for seven days, everyone is treated as eligible.

That is about 18% uptime, and deliberately so. What it has shown:

| | At launch (REO blog, 25 August) | [Dashboard](https://hub.thegraph.foundation/reo/), 1 October, 14:53 UTC |
|---|---|---|
| Indexers listed | 97 | 98 |
| Eligible | 49 | 55 |
| Grace | 1 | 0 |
| Not qualified | 47 | 43 |

All 43 read "never renewed." On the 15 September call the Foundation gave the same number, 43, and said about eight indexers had improved their service to become eligible. So the unqualified count has not moved in the second half of the month. These are not operators having a bad week. The 2025 back-test presented on Graph Office Hours #274 found the same shape: 46.4% of indexers with roughly zero days online and 42.9% online 26 to 28 days out of 28, with almost nobody in between. The list includes names that used to be core to the ecosystem, and it includes our own `lodestar-indexer.eth`, which we [shut down in May](/dispatches/stopping-the-lodestar-indexer/) and which is correctly earning nothing.

**What tightens next.** From 6 October an active day requires a qualifying query on each of five subgraphs, up from one. The plan described across the September calls steps the subgraph count through 1, 5, 10 and 20 and raises active days into the 11 to 16 range, at which point about 27% of rewards by GRT would be reclaimed. The back-test's finding is that the number of subgraphs served is the lever that matters, nearly linearly, while latency and distance from chainhead barely move the result. Stake-weighted criteria, where an indexer with 200 million GRT is expected to serve more than one with 2 million, were floated for later. So was having Explorer block delegation to ineligible indexers.

**One thing that does not line up.** The REO launch post and today's Q3 review both say a qualifying query must hit a subgraph with at least 500 GRT in curation signal. The criteria document, which the dashboard says it reads directly, lists no such requirement. Neither does the eligibility query in `src/models/bigquery_provider.py` at commit `ef36820` of 30 September: its definition of a qualifying query is status, latency and blocks behind, and nothing else. The repository's changelog records an earlier "Remove unimplemented curation requirement." Either the floor is applied upstream, in the table the oracle reads, where nobody outside can inspect it, or the blog posts describe a rule that is not enforced. We have not established which. It matters more from 6 October, because the signal floor is the only stated cost on manufacturing five subgraphs' worth of traffic, and because the Studio curation bot's per-subgraph signal has to clear it for those subgraphs to count.

**For delegators.** Stake delegated to an ineligible indexer earns no indexing rewards, and undelegating takes 28 days. The dashboard status to watch is "grace." Published APRs that ignore the 20% redirect or eligibility are wrong, a point raised on the 1 September call and addressed to every dashboard, ours included.

## Studio traffic moves to the network

Subgraph Studio's staging endpoint was meant for development. Production traffic settled there anyway, served by the upgrade indexer, which the Foundation now operates. The Q3 review states the consequence without softening it: the traffic that most needed redundancy was the traffic least likely to have it.

What is confirmed, from the [announcement](https://forum.thegraph.com/t/bringing-subgraph-studio-traffic-to-the-graph-network/7084) and from the Foundation's messages in `#indexers` on 24 September, which we recorded in [graph-support #45](https://github.com/nuthatch-org/graph-support/issues/45):

- Staging queries for BNB Smart Chain and Polygon end on **8 October**. Subgraphs already published are unaffected. The rest must be published, with billing and an API key set up, and pointed at a gateway endpoint.
- The Foundation unallocates sooner from subgraphs other indexers already serve, and ends Studio support for the remainder on **31 October**.
- About **450** subgraphs may be affected. Not all are expected to migrate.
- A bot curates on newly published BNB and Polygon subgraphs so indexers pick them up. Curation is guaranteed only until 8 October, from a fixed budget.
- Indexers were told not to scale up, and to talk to the Foundation first if they plan to.
- Other chains follow, starting with those that already have indexing rewards.

On the list of affected subgraphs there have been three positions in three weeks. On 15 September the Foundation accepted an indexer's suggestion to publish the list in advance so that indexers could sync ahead. On 22 and 24 September it said it would not publish the list of subgraphs that are moving, and would curate and post as it went. Today's review says that "at Indexers' request, it will also publish the full list of Subgraphs it curates." Those may be two different lists, one before the fact and one after. Indexers need the first. Until it exists, the on-chain substitute is signal with no allocations against it, which is what graph-support #45 tracks.

Two risks are specific to this migration. A subgraph that has been failing quietly on the upgrade indexer will fail on the network too, and the bot does not check. And several hundred manifests are about to be published from several hundred machines, eight days after one manifest with Windows line endings stopped the network subgraph. The parser is fixed. The lesson about shared control-plane dependencies is the next section.

Beyond the migration, three changes were described on the September calls and are **roadmap, not shipped**: a pricing overhaul that moves away from pay-as-you-go and reviews the free plan, with indexing as well as query pricing in scope; a merge of Studio and Explorer into one application; and Substreams brought natively into thegraph.com instead of living on The Graph Market. No dates were given for any of them beyond "weeks" for pricing.

## Direct Indexer Payments and liquid staking

These are the other two of the Foundation's three economic initiatives, and the philosophy stated on the 1 September call is that REO only handles the bottom of the distribution while these two are where good indexers differentiate. Neither is doing that yet.

**DIPs.** Contracts deployed, dormant. On 15 September the Foundation said work had started in earnest the week before and gave an internal target of the end of November, coupled to the Studio changes. DIPs are what allow the upgrade indexer to be retired properly and indexers to be paid for chains with no indexing rewards. The first release is a tool for the Foundation and gateway operators, not for data consumers.

**Liquid staking.** Phase 1 opened on 25 August as a soft launch capped below 1 million GRT, in a vault deployed by Avantgarde Finance on Enzyme tooling and managed by the Foundation, delegating to ten indexers chosen by query volume as of 1 September. Phase 2, open to all delegators, was "mid-September" on 8 September, "end of September" on 15 September and "the coming weeks" in today's review. A stGRT pool and lending collateral are later phases.

The design choice deserves to be stated as plainly as the Foundation states it. Its FAQ says the vault pools delegation deliberately, so that the Foundation can direct stake toward indexers it judges to be delivering value, on the grounds that delegation has historically followed marketing. That may well produce a better allocation than the current one. It also means the entity that sets the eligibility criteria, operates the gateway that generates the eligibility data and curates the subgraphs that count will additionally choose which indexers receive pooled delegation.

## Reliability: 16 September

At Arbitrum One block 505750187, 12:00:37 UTC on 16 September, somebody published a PancakeSwap v3 subgraph for BSC whose manifest had CRLF line endings. The network subgraph's manifest handler tried to parse a number with a trailing carriage return, failed deterministically, and took every published version of the network subgraph with it, the analytics subgraph too. The gateway and every indexer-agent depend on that subgraph. An indexer reported it in Discord 34 minutes later. The fix was committed at 14:03 UTC. The gateway was down about three hours. The mechanism, timeline and fix are in [graph-support #41](https://github.com/nuthatch-org/graph-support/issues/41).

The tail was longer than the outage. Five days later an indexer's receipts were being refused on 49 of 303 allocations because its indexer-service was still reading a local network subgraph frozen at the failure block ([graph-support #43](https://github.com/nuthatch-org/graph-support/issues/43)).

The Foundation's Q3 review does not mention the incident. It should have, because it is the most useful thing that happened to the network's architecture all quarter: a demonstration that one subgraph is a single point of failure for the gateway and for allocation management, found at the cost of three hours instead of thirty. It is also why the Night's Watch now offers a free public network subgraph endpoint for indexer-agent and indexer-service, with no key and no quota.

## Products and chains

**Substreams keeps shipping.** Hosted Stores entered beta as a managed, block-aware key/value store on The Graph Market. Hosted Sinks gained an optional read-only GraphQL API over the database a sink writes to, which lets a team moving from a subgraph keep its query interface. Substreams v1.21.0 to v1.23.0 moved the SQL sink into the main CLI. Nine Substreams skills for AI coding assistants were published, including one that maps a subgraph's entities and handlers to modules.

**Extended blocks** arrived on Arc, HyperEVM and Ink, with Pinax operating the endpoints. Extended blocks carry internal calls, balance changes, storage diffs and code changes, which a standard RPC block does not.

**Chains.** Anubis joined the subgraph network with InfraDAO as backstop indexer for published subgraphs carrying 500 GRT or more in signal. Arc gained Firehose, Substreams and subgraphs. Robinhood Chain gained additional Firehose and Substreams providers. A new Supported Networks page with a landing page per chain went up.

**graph-node** reached v0.45.0: attribute indexes built in the background as a deployment nears chainhead, a new `ethereum.decodeParams` host function, and one environment variable rename that silently reverts to defaults if missed. v0.44.0 before it fixed a derived-collection bug that can change proofs of indexing on affected blocks. Indexers should read both sets of upgrade notes. Earlier in the quarter we [audited all 7,668 signalled deployments](/dispatches/subgraphs-affected-by-alloy-decode-migration/) against v0.42's stricter ABI decoder and found eight affected.

**Amp** appears in the Foundation's review only in the footer. Its repository [went private](/dispatches/amp-paper-trail/) earlier in the year, the newest public binary is still v0.0.36 from May, and it is Edge & Node's commercial product. With the Labs arrangement voted down, its path onto the network as a data service, which earlier plans assumed, is now an open question that nobody has answered in public.

**Still missing.** The Substreams data service, the RPC data service and Tycho on the network are all on the new roadmap and none shipped. The eight-item programme usually called [Project Catalyst](/governance/project-catalyst/) is itself still a spoken list: as [the mandate entry](/governance/the-new-mandate/) records, the name appears in no Foundation publication we have found. No Token API usage figures were published.

## Token and market

| Date (2026) | GRT, USD | Source |
|---|---|---|
| 24 June (close) | 0.0185 | CoinLore daily history |
| 18 August (all-time low) | 0.0129 | TradingView; CoinGecko lists $0.01298 |
| 1 September | about 0.0164 | month-open figure on two trackers |
| 8 September | 0.0197 | exchange snapshot |
| 28 September | 0.0323, up 18.7% on the day | CoinMarketCap |
| 30 September | 0.0288 | KuCoin; market cap about $315 million on 10.94 billion circulating |

Trackers disagree at the fourth decimal and on the exact low, as they did in H1. The shape is not in doubt: a further 30% fall from late June to a new all-time low on 18 August, then a recovery of more than 120% to quarter end, the steepest part of it in the last week of September on volume that reached about $121 million in a day.

The low came the day before the mandate was published. The steepest leg came the week the Studio migration was announced. It is tempting to draw the line, and some coverage did. CoinMarketCap's own analysis attributed the 28 September move mainly to a rotation into smaller tokens. We do not know which is right and neither does anyone who has published. What can be said is that the recovery was not accompanied by any released fee or usage data, so it cannot yet be called a re-rating on fundamentals.

## Governance and community

**Speed.** GIP-0089 went from proposal to Council approval in seven days and from approval to live in six. For a change that redirects a fifth of issuance, that is fast, and the forum thread announcing approval has no replies. The Foundation would say the consultation happened over the preceding year with the Council and core teams. Most indexers and delegators learned of it on 19 August.

**Oversight.** The Innovation Allocation answers to the Council, which keeps oversight of how it is spent. What that means in practice, a budget, a report, a cadence, has not been published. On the first call the Foundation's Nick said he was open to publishing Foundation salaries pending a legal check, and that a Council product steering committee was starting. Neither has been followed up in writing that we have found.

**GIP-0090.** Ours, so discount accordingly. It asks for 0.1% of issuance, 0.12073 GRT per block or about 315,000 GRT a year, routed through the same DirectAllocation mechanism to a Night's Watch multisig for twelve months, with quarterly reports and every withdrawal listed by transaction hash. The amount covers hosting and data bills and nothing else. The point is the two properties GIP-0089 lacks, a sunset and a reporting schedule, and the question of whether the protocol has any path to fund community infrastructure now that grants are over. It has two replies, both ours.

**Office hours.** Indexer Office Hours became Graph Office Hours on 1 September. It is the Foundation's best decision of the quarter after REO. Every number in this report that is not from a blog post or a contract came from someone saying it on a Tuesday call and taking questions on it. Suggestions from indexers were accepted on the call more than once.

**Builders.** ETHOnline drew 354 submissions to The Graph's tracks, with nine projects sharing $15,000. ETHGlobal Lisbon in July paid ten teams $15,000 across four tracks.

## Scorecard against H1

The H1 report set five benchmarks for the second half. One quarter in:

1. **A Substreams and Token API revenue print in the millions of dollars.** No revenue figure of any size has been published for any 2026 quarter. Not met, and not measurable.
2. **REO and DIPs active on mainnet.** REO: yes, 25 August. DIPs: no, target end of November. Half met.
3. **An enterprise engagement converting to recurring on-chain fees.** No evidence found. The split with Edge & Node, whose product Amp carried that story, makes it less likely near term.
4. **The promised Foundation strategy post.** Met, on 19 August, and more consequential than expected.
5. **Market structure improving.** Price recovered sharply from the low. We found no new derivatives listing or fund inclusion.

The H1 conclusion was that the only question that mattered was whether fees could outgrow issuance. Q3 changed the question's terms without answering it. Issuance is now better aimed: less of it will reach indexers who serve nothing, and a fifth of it pays for an operator with a roadmap. But a better-aimed subsidy is still a subsidy, and the fee side of the ledger remains unpublished.

## What to watch in Q4

1. **8 October.** Do BNB and Polygon developers publish, do indexers allocate, and do queries return? Watch for signalled deployments with no allocations, and for the affected-subgraph list.
2. **6 October and after.** How many of the 55 eligible indexers clear five subgraphs a day, and whether the 43 that never qualified begin to close allocations. That exit is what turns the 20% cut into the promised net gain for everyone else.
3. **The 500 GRT floor.** Whether it appears in the public criteria and the public query, or is corrected in the posts.
4. **DIPs by the end of November.** And with them, the upgrade indexer's retirement plan.
5. **Liquid staking Phase 2.** Twice slipped. Watch which indexers the vault delegates to and how that list is chosen.
6. **A number.** Any number. Queries served through the network in October against September would be enough to show whether the migration moved traffic or lost it. The gateway already publishes five-minute quality-of-service buckets on Gnosis, so the data exists; [we rebuilt our charts from it](/dispatches/the-performance-charts-are-back/) last month.
7. **A second gateway operator.** The Foundation says new operators are already sending queries to indexers. Naming them would be the cheapest credibility it can buy.
8. **A budget.** What the Innovation Allocation spent in its first quarter, and on what.

## Caveats

- **No audited quarterly data exists for 2026.** Nothing here should be read as a quarter-end figure comparable with Messari's series.
- **Office hours figures are from our notes of live calls.** The recording for #274 had no speaker labels, so attributions for that call were inferred from context, and audio for the first part of #275 failed and was re-narrated by the host. The back-test percentages, the "more than $150 million," the 43 unqualified indexers, the 450 subgraphs and the November DIPs target all come from these calls or from the Foundation's Discord messages, not from written Foundation publications.
- **The account of the Edge & Node negotiation is one side's.** We have reported that it is disputed and have not reported the dispute's content, because we have not seen it set out in a form we can cite.
- **Dashboard counts are a snapshot** taken on 1 October 2026 at 14:53 UTC. A count of operators is not a share of rewards, and the Foundation is right to warn against reading one as the other.
- **The redistribution reading is ours.** The claim that active indexers gain only as ineligible stake leaves allocations is our reading of the published mechanism, not a statement from the Foundation.
- **Prices vary by tracker.** Ranges and sources are given, and the cause of the September move is not established.
- **Roadmap items are marked as roadmap.** Pricing changes, the Studio and Explorer merge, native Substreams on thegraph.com, the agent memory product, the RPC and Substreams data services, stake-weighted REO criteria and later liquid staking phases are announced, not shipped.
- **This is a dispatch.** It is a snapshot of 1 October 2026 and will not be updated. Half of it will be out of date by the ninth.
