---
title: "The first stopgap anyone asked for"
date: "2026-10-08"
author: "cargopete"
category: "Infrastructure"
tags: ["the-graph", "subgraphs", "studio", "bnb", "nuthatch", "indexing"]
excerpt: "On the morning Studio moved BNB Chain traffic to the network, a developer's subgraph stopped answering. A little over four hours later it was answering again from a nuthatch nest, rebuilt from the deployed mapping code because the source was not public. What it took, what it cost, the two things we got wrong on the way, and what it still cannot promise."
---

*Two days ago we built a stopgap nest for a BNB Chain subgraph that nobody was serving, and retired it a day
later because nobody was using it either. The lesson we took was to stop building ahead of demand and wait
to be asked. On 8 October, the day Subgraph Studio moved BNB Chain query traffic onto The Graph Network,
somebody asked.*

---

## The error was the endpoint, not the subgraph

The report arrived in The Graph's Discord on the morning of the move. A subgraph called `openloom-bsc`
(deployment `QmXsbGm5Mbm9H5HWrt11uwWSf58MyaxjspF4TNYx166Xgz`) had stopped indexing, and its client was
failing with `Unexpected token '<', "<html>\r\n<h"... is not valid JSON`.

That message is a JavaScript client trying to parse an HTML error page as JSON, so it says nothing about the
subgraph and everything about the endpoint. The network told the rest. The last indexer to allocate to this
deployment, Pinax, closed its allocation on **2 July 2026 at 16:06 UTC**. Since then the only thing serving it
had been Studio, and on 8 October Studio stopped. The gateway's own answer, queried with a key, was
`subgraph not found: no allocations`. The deployment had 125.8 GRT of signal and had earned 1,261 GRT of query
fees in its lifetime, so it was not abandoned; it was simply between indexers on the wrong day.

The long-term fix is an allocation, and the developer was pointed at `#indexers` for one. The short-term fix
was ours to offer, so we offered it.

## The source was not public, so we read the WASM

A nuthatch nest reproduces what a subgraph derives from its contracts' events, which means knowing exactly what
each mapping handler writes. For `openloom-bsc` there was no repository to read. There was, however, the
deployment itself: the manifest, the schema and the compiled mapping modules are all on IPFS, because that is
how a subgraph is deployed.

So we read the handlers out of the WebAssembly, one at a time: which event parameter each one reads, in what
order, and which entity field it is written to. A handful of details mattered and would have been easy to guess
wrong:

- An entity id built with graph-ts's `concatI32` appends the integer as four **little-endian** bytes. Card
  10000's id is `0x10270000`, not `0x00002710`.
- `handleTransfer` only moves the owner of a card that already exists. A transfer seen before its card is made
  is ignored, so the nest ignores it too.
- `MintPool.totalSupply` and `Minter.supply` are running totals: `Subscribe` adds its amount, `Mint` subtracts
  its USDT amount and `Ransom` subtracts its amount, keyed on the token and the card index.
- `Distribute.amount` is the pool's total at the moment of the event, times `distributeRadio`, divided by
  10<sup>12</sup>, truncated.

Twelve of the schema's fourteen entities came out of this whole, and a thirteenth, `Distribute`, all but one
field. The endpoint refuses the rest by name rather than guessing: `DailyState`, a set of day-keyed
accumulators, and `Distribute.operator`, which is the transaction's sender and is not something the nest
stores.

## What we got wrong on the way

**Our first diagnosis said the subgraph's two factories had never emitted an event and that activity stopped in
March.** Both were wrong. The full backfill found 21,745 `MakeCard` events, one `CreateToken` that created all
four of the subgraph's templates, and activity continuing until a `Mint` on **19 May 2026**. It was the backfill that
showed it, not the first look. The issue that records the investigation,
[graph-support #53](https://github.com/nightswatchhq/graph-support/issues/53), now says so in its own
correction.

**The second mistake was a bug in nuthatch itself.** While testing the query shapes a typical client sends, a
filter on an owner address given in its checksummed, mixed-case form returned an empty list. graph-node decodes
a `Bytes` value as hex, so case means nothing to it; nuthatch had been comparing it as text. A wallet hands an
app exactly that kind of address, so an app's "my cards" page would have shown nothing at all, with no error. It
was fixed and released the same afternoon as
[nuthatch 4.15.1](https://github.com/nightswatchhq/nuthatch/releases/tag/v4.15.1).

## It answers, and here is how we know

The backfill covered about 77 million BNB Chain blocks and **659,873 events**. The bulk of it, 71 million
blocks, took about seven minutes on a 32-core machine against a paid Alchemy endpoint.

There is no graph-node serving this deployment to compare against, which is the whole problem, so the check had
to come from the chain. Cards are ERC-721 tokens, and the contract's own `ownerOf` says who holds each one today.
We sampled **60 cards at random and compared the nest's owner with `ownerOf`: 60 of 60 matched.** It is a
check on one entity's most-read field, not on all of them, and it is the strongest one the chain offers.

The endpoint takes the same requests a graph-node does: `where` filters, `orderBy`, `first` and `skip`,
`_meta`, and introspection, at
`https://subgraphs.nuthatch-indexer.com/subgraphs/id/QmXsbGm5Mbm9H5HWrt11uwWSf58MyaxjspF4TNYx166Xgz`.
While it was listed, opening that address in a browser showed a page with the sync status, a playground and
the snippets to point an app at it.

We sent the developer that page's link, and only afterwards noticed that we had sent the page rather than the
GraphQL endpoint. An app pointed at a static page would have failed exactly as it did that morning. The page's
URL now forwards GraphQL requests to the endpoint, so either link works.

## What it costs to keep it running

The nest runs on one machine and polls the chain once a minute. Its RPC use at rest is about six requests a
minute. The nest's own admin page, projecting from sixteen minutes of readings, puts that at **about  for 30
days** on Alchemy's pay-as-you-go rates. The backfill cost about .

Watching that figure is what moved nuthatch's own default. A nest started without `--poll-interval` used to ask
for the tip at the chain's block time, every 2 to 12 seconds, whether or not anything had happened. From
4.15.2 it asks every five minutes unless told otherwise. A nest that needs to follow the tip closely still can.

## What this does not promise

- **One machine, no uptime promise.** There is no proof of indexing, no allocation and no dispute path. It is a
  stopgap, and it says so on its page.
- **It is not a drop-in replacement.** It answers this subgraph's event-derived fields exactly and refuses the
  two it cannot, by name. A dashboard that asks for `DailyState` will get an error, not a number.
- **Not compared with the subgraph's own answers.** Nobody serves them, so the check is against the chain.
- **Not yet confirmed by its user.** As we write this, the developer has the endpoint but has not told us
  whether his app works on it. We have asked for the queries it sends and will run them.

## It ended the way a stopgap should, nearly

The same afternoon, an indexer allocated to the deployment: Ellipfra, at Arbitrum block 512,912,920. That is
the outcome a stopgap exists for, and the moment it starts to end. Its node reported the deployment as
`synced` while about 48 million BNB Chain blocks behind the head, so the gateway cannot yet route to it, and
the nest keeps answering until it can. When the gateway serves the deployment, the developer points the app
back at it and we stop the nest, with a dated note on the record.

## If your subgraph is the next one

The upgrade indexer stops serving BNB Chain and Polygon Studio subgraphs by 31 October, and some of them will
have nobody by then. If yours is one, open an issue at
[nightswatchhq/graph-support](https://github.com/nightswatchhq/graph-support/issues/new) with the deployment ID.
We will check whether any indexer serves it and, if none does, stand up a nest for it. There is no account, no
key and no charge. The nests we serve are listed at
[nuthatch-indexer.com/subgraphs](https://nuthatch-indexer.com/subgraphs), and each one is public, with the
commands to run it yourself, as [openloom-bsc-nest](https://github.com/nightswatchhq/openloom-bsc-nest) is.
