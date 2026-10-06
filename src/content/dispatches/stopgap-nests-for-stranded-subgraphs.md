---
title: "Stopgap nests for subgraphs nobody is serving"
date: "2026-10-06"
author: "cargopete"
category: "Infrastructure"
tags: ["the-graph", "subgraphs", "studio", "bnb", "polygon", "nuthatch", "indexing"]
excerpt: "Studio traffic for BNB Chain and Polygon moves to the network on 8 October, and the upgrade indexer stops serving those subgraphs by 31 October. We counted which ones have nobody else, found exactly one that is both stranded and still paid for, and rebuilt it as a nuthatch nest that answers its own client's queries exactly. The automatic route answered nothing at all, which is in here too."
---

*On 24 September the Foundation announced that Subgraph Studio query traffic for BNB Smart Chain and Polygon moves to The Graph Network on 8 October, and that the upgrade indexer will stop serving those subgraphs by 31 October. Some of them will not have another indexer by then. This is what we built for those, and an account of how much of it worked.*

---

## The question was how many, and the answer was one

The Foundation's announcement put the number of possibly affected subgraphs at **about 450**, and said plainly that not all of them will migrate. Before building anything we wanted to know how many are already in trouble, so we counted from data we run ourselves rather than estimating.

[Lodestar's migration page](https://www.lodestar-dashboard.com/subgraphs/migration) lists every published BNB and Polygon deployment that carries curation signal. Its chain comes from the deployment's own manifest, and its allocations from our allocations nest. We checked that list against the network subgraph at a pinned Arbitrum block, 506,282,253: signal agreed to the wei on all 5,650 signalled deployments, and active allocations agreed on all 11,515.

On 6 October it said:

- **114 BNB and 161 Polygon deployments** have signal and no indexer at all.
- **3 of those 275** earned any query fees in the previous 30 days.
- **7** hold signal at or above the 500 GRT floor the Rewards Eligibility Oracle counts.
- **24 BNB and 26 Polygon** are served by the upgrade indexer (`indexer.upgrade.thegraph.com`) and nobody else. These are the ones to watch before the 31st.

Two of the three fee earners turned out not to be stranded at all. Thena BSC V3 Fusion and boost-polygon each left an old version on the list, and both teams' current deployments are served, by seven and fourteen indexers respectively. That leaves one: **BetSwirl BNB Chain** (`Qmd5oqyojVx5wWSFuWfKz3YVLPHdE3KU5458Qqq3SVeGEB`). It is BetSwirl's only BNB deployment. Two indexers took turns serving it until the last allocation closed on **17 September at 11:31 UTC**, and nobody has opened one since. Its Polygon twin is served by three indexers and is fine.

So the problem today is small. Whether it stays small depends on what the migration publishes after the 8th, which is why the counting runs every fifteen minutes from now on.

## What a stopgap nest is, and what it is not

A [nuthatch](https://github.com/nightswatchhq/nuthatch) nest indexes a contract set straight from chain logs and serves it. For a subgraph, the useful version serves a **GraphQL endpoint shaped like the subgraph**: same schema, same filters, same ordering and pagination, values in graph-node's own wire types.

It is not a second graph-node. It does not run the subgraph's AssemblyScript, so it reproduces what can be derived from decoded events and contract reads, and **refuses by name** anything it cannot reproduce exactly. There is no third behaviour: no default, no empty list where a value should be. GraphQL fails a whole query for one refused field, so this only helps a client whose queries stay inside the answered set. That is the reason to start from the client's queries rather than from the schema.

It is also not a network service. There is no proof of indexing, no allocation and no dispute. It is a copy that we can show is right, which is a different promise.

## The automatic route answered nothing

The plan was to point `nuthatch init --from-subgraph` at a deployment ID and let the porting tool work out which fields it could answer. Before building anything for BetSwirl we tried that on **21 deployments** from the list, a mix of event-shaped, factory and DeFi subgraphs.

**It answered no fields on any of the 21.** The scaffold built every time. The classification found nothing, because it reads the subgraph's mapping source, and what a deployment publishes to IPFS is compiled WASM. Worse, the coverage line still printed 100%, which is the sort of number that ought to make anyone suspicious and on this occasion was simply wrong. That is filed as [nuthatch#1947](https://github.com/nightswatchhq/nuthatch/issues/1947), alongside [#1948](https://github.com/nightswatchhq/nuthatch/issues/1948) and ten smaller defects the run turned up. Adding public source by hand where it existed lifted the best of them to 45% of fields. The full results are in [the S0 report](https://github.com/nightswatchhq/nuthatch/blob/main/docs/subgraph-stopgap-s0.md).

So for now a stopgap nest is written by hand. That is fine for one subgraph and would not be for fifty.

## Reading BetSwirl's rules out of the WASM

BetSwirl has no public subgraph source. What it does have is a published client, `@betswirl/sdk-core` 0.1.27, which ships the four GraphQL documents its apps send: `bet`, `bets`, `token` and `tokens`. Between them they select **30 leaf fields on a bet and 17 on a token**. Those 47 fields are the whole target.

The deployed WASM keeps its function names, so the handler logic could be read directly. Four fields were the ones we expected to lose, and none of them needed a guess:

- **`Bet.id`** is the VRF request id as a decimal string, shared across every game.
- **`GameToken.id`** is the game's *name*, a hyphen and the token address. Because it is keyed by name rather than contract, every version of Dice shares one house edge, and the weighted game writes seven names at once. The nest does the same.
- **`houseEdge`** is state, not an event parameter: the affiliate's edge if above zero, else the game's, else zero, as of the bet. It is an as-of join over every edge change, by block and log index.
- **`payoutMultiplier`** is a `BigDecimal` division, and graph-node's `BigDecimal` normalises each operand to 34 significant digits, divides to 100, and normalises again. The nest reproduces it to the last digit, for example `0.5078775000000000000002014182230472`.

**All 47 fields answer.** Two fields elsewhere on `Bet`, the VRF fees consumed, are refused, because reproducing them means indexing every Chainlink VRF user on BNB Chain. So are 44 of the subgraph's 51 entity types, none of which the client asks for.

## How we know the answers are right

The check is a reference implementation that shares no code with nuthatch. It fetches raw logs and contract reads itself, decodes them, restates the mapping handlers, and compares every field of every bet against the nest's GraphQL, through the SDK's own queries and six of its filter combinations.

| range | blocks | bets compared | differences |
| --- | --- | --- | --- |
| deployment | 16,689,819 to 18,743,237 | 31,399 | 0 |
| v5 games launch | 43.70M to 45.25M | 91 | 0 |
| first weighted configs | 48.26M to 50.71M | 324 | 0 |
| weighted game and free bets | 65.5M to 66.5M | 443 | 0 |

**32,257 bets, no differences.** Only the first range starts at deployment. The other three check the logic over identical inputs on both sides, not the deployment's real accumulated history, and the full backfill is what closes that gap.

The run also found five defects in nuthatch's GraphQL surface that BetSwirl's queries hit and our earlier test subgraphs did not, nested to-one relations and unsent nullable variables among them. They are fixed in [nuthatch#1949](https://github.com/nightswatchhq/nuthatch/pull/1949).

## Where it runs, and how much to rely on it

The full history is **109.3 million blocks**, about 594,000 logs and about 161,000 bets, two thirds of them between blocks 18 and 21 million. The backfill started on 6 October on a ThinkPad at home, against a paid archive endpoint, and the busy stretch went through at about 1,400 events a second. **The public endpoint is added to this post when the backfill reaches the chain head**, with the date it went live. Until then the nest is on GitHub and anyone can run it. Point a client that uses `@betswirl/sdk-core` at the endpoint and the four documents answer as they did when the network served them.

Be clear about what that machine is. It is one box on a residential line, run by one person, and a power cut takes it down. For a subgraph nobody else is serving that is an improvement, and it is not a service level. If BetSwirl, or anyone, comes to rely on it, it moves to a server, and the moment an indexer allocates to the deployment again the right answer is to go back to the network.

## Try it, or tell us about yours

- **The nest:** [nightswatchhq/betswirl-bnb-nest](https://github.com/nightswatchhq/betswirl-bnb-nest). The README has the field-by-field table and every rule's source handler; `tests/run.sh` reruns the comparison.
- **The list:** [lodestar-dashboard.com/subgraphs/migration](https://www.lodestar-dashboard.com/subgraphs/migration), live, filterable by chain and signal.
- **The tracker:** [docs/subgraph-stopgap.md](https://github.com/nightswatchhq/nuthatch/blob/main/docs/subgraph-stopgap.md).

If your BNB or Polygon subgraph loses its last indexer after the 8th, send us the deployment ID and the GraphQL queries your app actually sends. We will tell you which fields a nest can answer exactly before anyone builds anything, and if that is enough for your app we will build it and serve it until the network picks your subgraph up again.
