---
title: "What Graph Data You Can Actually Query on Dune, and the Horizon-Shaped Hole"
date: "2026-09-14"
author: "cargopete"
tags: ["dune", "sql", "horizon", "data", "reference", "arbitrum"]
category: "Data Services"
excerpt: "830 decoded tables of The Graph already live on Dune, which surprises people who assume nobody has done the work. HorizonStaking is among them, decoded under the legacy ABI, so provisions and thaw requests are simply absent. Here is what is queryable today, verified by address on 14 September 2026, with every namespace and contract listed."
---

If you go looking for The Graph on Dune and search for a schema starting with `graph`, you will find
a Carbon/Bancor project called Graphene and conclude the coverage is thin. If you then search
decoded table names for `horizonstaking`, you will find nothing and conclude Horizon is undecoded.

Both conclusions are wrong, and I reached both of them in turn before finding a method that works.
This is what is actually there, verified on 14 September 2026.

## The short version

**830 decoded tables of The Graph protocol already exist on Dune.** Somebody has been maintaining
that decoding for years. The namespace is `thegraph_*`, not `graph*`, which is why the obvious
search misses it.

**HorizonStaking is decoded too, at the right address, under the wrong ABI.** Its 22 event tables
are legacy vocabulary: allocations, rebates, the pre-Horizon delegation model. There is no
`provision` table, no `thawrequest`, and no Horizon slashing anywhere.

**Seven Horizon contracts are not decoded at all.** SubgraphService, GraphPayments, PaymentsEscrow,
GraphTallyCollector, RecurringCollector, the Arbitrum DisputeManager, and EpochManager.

## What is decoded, by namespace

| Namespace | Tables | Contracts |
|---|---|---|
| `thegraph_ethereum` | 338 | `disputemanager`, `gns`, `graphtokenlockmanager`, `graphtokenlockwallet`, `grt`, `rewardsmanager`, `staking` |
| `thegraph_arbitrum` | 282 | `billing`, `l2curation`, `l2gns`, `rewardsmanager`, `staking`, `subgraphavailabilitymanager` |
| `thegraph_multichain` | 146 | `billing`, `rewardsmanager`, `staking` |
| `graphprotocol_arbitrum` | 43 | `l2graphtoken` |
| `thegraph_polygon` | 21 | `billing` |

That is a great deal of queryable protocol history, and it is free to read: Dune bills executions,
not result fetches.

Two traps in that table. `thegraph_ethereum.staking_*` and `thegraph_arbitrum.staking_*` are
**different contracts**, not the same contract on two chains. The Ethereum one is the genuine legacy
L1 Staking contract. The Arbitrum one is HorizonStaking, which brings us to the interesting part.

## The Horizon-shaped hole

HorizonStaking on Arbitrum One is `0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03`. Query the address
behind the decoded table and you find it:

```sql
SELECT cast(contract_address AS varchar), count(*)
FROM thegraph_arbitrum.staking_evt_stakedeposited
GROUP BY 1
```

`0x00669a4cf01450b64e8a2a20e9b1fcb71e61ef03`, 182,178 events. The address has been decoded all along.

The reason a name search misses it is worth internalising, because it will bite you on other
protocols too. **A decoded table on Dune is named after whatever the submitter typed, not after the
contract.** Somebody submitted this one as `staking`. HorizonStaking is also a proxy that was
upgraded in place, so it kept the address the legacy L2Staking contract already had. There was never
going to be a table called `horizonstaking_*`.

What that decoding gives you is the *legacy* ABI. All 22 of its event tables are pre-Horizon:

```
allocationclosed          rebateclaimed             stakedelegated
allocationcollected       rebatecollected           stakedelegatedlocked
allocationcreated         setoperator               stakedelegatedwithdrawn
assetholderupdate         setrewardsdestination     stakedeposited
contractsynced            slasherupdate             stakelocked
delegationparametersupdated  parameterupdated       stakeslashed
extensionimplementationset   setcontroller          stakewithdrawn
                                                    transferreddelegationreturnedtodelegator
```

Searching every Graph namespace for Horizon-era vocabulary (`provision`, `thaw`, `collector`,
`escrow`, `payment`, `service`) returns nine tables, and all nine are legacy: `billing`'s collector
functions and the old `setThawingPeriod`. **So if your question involves provisions, thaw requests,
or Horizon's slashing model, Dune cannot answer it today.**

That also means the fix is not a normal decoding submission. Dune already decodes that address; what
it needs is an ABI update on an existing decoded contract, which is a different request.

## Every Horizon address, and whether it is decoded

Arbitrum One (chain `42161`), from the canonical
[graphprotocol/contracts address book](https://github.com/graphprotocol/contracts), read
14 September 2026.

| Contract | Address | Decoded? |
|---|---|---|
| HorizonStaking | `0x00669A4CF01450B64E8A2A20E9b1FCB71E61eF03` | Address yes, Horizon ABI no |
| SubgraphService | `0xb2Bb92d0DE618878E438b55D5846cfecD9301105` | No |
| GraphPayments | `0x7Aae8ae011927BC36Cb4d0d3e81f2E6E30daE06D` | No |
| PaymentsEscrow | `0xf6Fcc27aAf1fcD8B254498c9794451d82afC673E` | No |
| GraphTallyCollector | `0x8f69F5C07477Ac46FBc491B1E6D91E2bb0111A9e` | No |
| RecurringCollector | `0xff0dc7310fbfbcc2524dae230cd4f34727eb84ee` | No |
| DisputeManager | `0x2FE023a575449AcB698648eD21276293Fa176f96` | No |
| EpochManager | `0x5A843145c43d328B9bB7a4401d94918f131bB281` | No |
| Controller | `0x0a8491544221dd212964fbb96487467291b2C97e` | No |
| RewardsManager | `0x971B9d3d0Ae3ECa029CAB5eA1fB0F72c85e6a525` | Yes |
| L2Curation | `0x22d78fb4bc72e191C765807f8891B5e1785C8014` | Yes |
| L2GNS | `0xec9A7fb6CbC2E41926127929c2dcE6e9c5D33Bec` | Yes |
| L2GraphToken | `0x9623063377AD1B27544C965cCd7342f7EA7e88C7` | Yes |
| L2GraphTokenGateway | `0x65E1a5e8946e7E87d9774f5288f41c30a99fD302` | No |

GRT on Ethereum is `0xc944e90c64b2c07662a292be6244bdf05cda44a7`, decoded as
`thegraph_ethereum.grt_*`.

## The L1 bridge escrow, which nobody has labelled

If you want bridge flows, you need the L1 gateway, and it is not in Dune's bridge labels. All 167
rows of `labels.bridges_ethereum` and `labels.bridges_arbitrum` were listed and none mentions The
Graph, which runs a custom gateway.

It is `0x36aff7001294dae4c2ed4fdefc478a00de77f090`, and here is how to satisfy yourself of that
rather than taking my word. It is the largest L1 GRT holder by net transfer balance, at
2,559,552,591.94 GRT, 23.70% of L1 supply. If it is the bridge escrow, its balance must equal GRT
minted on L2 minus GRT burned on L2, because every bridged token is escrowed on one side and minted
on the other:

| | GRT |
|---|---|
| L1 balance of `0x36aff7…` | 2,559,552,591.94 |
| L2 `bridgeMinted` − `bridgeBurned` | 2,557,840,761.92 |
| Difference | 1,711,830.01 (0.067%) |

A gap of 0.067% is in-flight deposits and Arbitrum's seven-day withdrawal queue, which is exactly
the shape you would expect. One caution if you build on this: the L1 escrow only sees the Ethereum
side, so a withdrawal initiated on L2 and not yet finalised does not appear.

## Which label tables to use for exchange and bridge flows

This one costs people a lot of wrong numbers. `labels.addresses` holds several rows per address,
across chains and categories, so joining on address alone duplicates every transfer and inflates
whatever you are measuring.

Use the **per-chain** tables instead. Measured on 14 September 2026:

| Table | Rows | Distinct addresses | `category` |
|---|---|---|---|
| `labels.cex_ethereum` | 4,389 | 4,389 | `institution` |
| `labels.cex_arbitrum` | 2,036 | 2,036 | `institution` |
| `labels.bridges_ethereum` | 136 | 136 | `bridge` |
| `labels.bridges_arbitrum` | 31 | 31 | `bridge` |

One row per address in every case, so no pre-aggregation is needed and no `blockchain` predicate
either, because the table is already chain-scoped. Note that `category` is constant within each
table and so is useless as a discriminator: the *table* is the discriminator, and `name` carries the
exchange.

A warning from building a whale feed on these. Exchanges move money between their own wallets
constantly, and those transfers are labelled at both ends. The three largest "whale moves" in a
24-hour sample were 50,000,000 GRT into `Binance Internal 2`, the same 50,000,000 out to
`Binance 14`, and 46,693,699 between two more Binance wallets. If you do not classify those
separately, your feed's headline events will be one exchange rearranging its own float.

## How to check any of this yourself

Search decoded tables **by address**, never by name:

```sql
SELECT cast(contract_address AS varchar) AS addr, count(*) AS events
FROM <schema>.<contract>_evt_<event>
GROUP BY 1
```

To find which namespaces exist at all, query `information_schema` and anchor on the real prefix:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema LIKE 'thegraph%' OR table_schema LIKE 'graphprotocol%'
ORDER BY 1, 2
```

Two things to avoid. Do not filter schema names on `graph%`: it returns `graphene_*`, an unrelated
Carbon/Bancor project, and misses every `thegraph_*` namespace. And do not use unanchored `%name%`
patterns across all of `information_schema`: one such search cost 4.259 credits, roughly 45 times a
normal feed query, and returned hundreds of unrelated projects because contract names like
`RewardsManager` are not remotely unique.

## What this does not tell you

It is a snapshot of 14 September 2026 and it will go stale in a specific way: the moment anyone
submits the Horizon ABI, the most useful section here is wrong. That is the good outcome and I hope
it happens quickly.

It also says nothing about data quality. Decoded means the events are parsed into tables, not that
they are complete, not that the decoding is current with the latest upgrade, and not that the
numbers mean what you assume. Every figure above came from running the query and reading the output,
which is the only way I know of to find out that a query which completes successfully is answering
the wrong question.
