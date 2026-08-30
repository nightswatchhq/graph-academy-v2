export interface Term {
  term: string;
  /** Other names the same thing goes by, including obsolete ones. */
  aliases?: string[];
  def: string;
  /** Lesson that treats it properly. */
  more?: string;
  /** Registry key, where the term has a number attached. */
  param?: string;
  /** Set when the term is retained only because stale material still uses it. */
  obsolete?: boolean;
}

export const GLOSSARY: Term[] = [
  { term: 'Agora', def: 'The language indexers write cost models in. Maps query shapes to prices so the gateway knows what serving your answer costs.', more: '/indexers/cost-models-and-rules/' },
  { term: 'Allocation', def: 'A commitment of an indexer’s stake to a specific subgraph, which they undertake to index and serve. The unit that earns indexing rewards.', more: '/indexers/allocations-and-pois/' },
  { term: 'AssemblyScript', def: 'The language subgraph mappings are usually written in. Compiles to WebAssembly, and its runtime forbids anything non-deterministic.', more: '/developers/what-is-a-subgraph/' },
  { term: 'Arbitrator', def: 'Decides disputes, and under Horizon also decides the slash amount by severity within a cap. A human judgement, appointed through governance.', more: '/governance/arbitration-disputes/' },
  { term: 'Arbitrum One', def: 'The Ethereum layer two where the protocol contracts and stakeable GRT operate. Not Ethereum mainnet.', more: '/start/where-grt-lives/', param: 'settlement_layer' },
  { term: 'Bonding curve', obsolete: true, def: 'The L1 curation pricing model, where share price rose with shares issued. Replaced on Arbitrum by a flat curve. Advice about timing the curve describes a protocol that no longer exists.', more: '/curators/l2-flat-curation/' },
  { term: 'Cobb-Douglas', obsolete: true, def: 'The previous query fee rebate mechanism, replaced by exponential rebates in GIP-0051. It depended on global network state and historically burned over half of query fees.', more: '/indexers/economics-rebates/', param: 'cobb_douglas_burn_pct' },
  { term: 'Cost model', def: 'An indexer’s published pricing for query shapes. Priced too high and the gateway routes elsewhere; too low and you serve expensive queries at a loss.', more: '/indexers/cost-models-and-rules/' },
  { term: 'Curation tax', aliases: ['curation deposit charge'], def: 'The charge on entering a curation position. Burned rather than paid to anyone, so nobody in the system profits from churn.', more: '/curators/signal-and-gcs/', param: 'curation_tax_pct' },
  { term: 'Curator', def: 'Deposits GRT against a subgraph to signal that it is worth indexing. Paid from query fees on that subgraph, so the return depends on the forecast being right.', more: '/curators/what-is-curation/' },
  { term: 'Data service', def: 'Under Horizon, a service that indexers provision stake to, with its own rules, obligations and slashing. The Subgraph Service is the first and today the dominant one.', more: '/indexers/horizon-provisions/' },
  { term: 'Delegation capacity', def: 'The ceiling on delegated stake an indexer can usefully accept, a multiple of their self-stake. Beyond it, rewards for every delegator in the pool are diluted.', more: '/delegators/what-is-delegation/', param: 'max_delegation_ratio' },
  { term: 'Delegation tax', obsolete: true, def: 'A charge formerly levied on delegation deposits. Removed by Horizon. The tokenomics page still describes it, which is recorded as a known contradiction.', more: '/delegators/undelegation-and-thawing/', param: 'delegation_tax_pct' },
  { term: 'Delegator', def: 'Puts GRT behind an indexer without running anything, taking a share of what that indexer earns after the indexer’s cut.', more: '/delegators/what-is-delegation/' },
  { term: 'Dispute', def: 'A challenge to an indexer’s POI or query response, raised by a Fisherman with a deposit and decided by arbitrators.', more: '/indexers/disputes-and-slashing/' },
  { term: 'Epoch', def: 'A protocol time unit used for accounting. Less central under Horizon than in earlier designs, where allocation lifetimes were denominated in epochs.', more: '/indexers/allocations-and-pois/' },
  { term: 'Exponential rebates', def: 'The current query fee rebate mechanism from GIP-0051. Depends only on your own stake and your own fees, with no term for any other indexer.', more: '/indexers/economics-rebates/', param: 'rebate_lambda' },
  { term: 'Firehose', def: 'The extraction layer. Instruments a chain node to emit an ordered stream of flat files, so history is read sequentially rather than over request-response RPC.', more: '/developers/firehose/' },
  { term: 'Fisherman', def: 'Anyone who raises a dispute against an indexer. Requires a deposit, which is what stops disputes becoming a harassment tool.', more: '/governance/arbitration-disputes/', param: 'fisherman_dispute_deposit' },
  { term: 'Gateway', def: 'Sits between an application and indexers. Selects an indexer, attaches the payment receipt, and fails over. You never query an indexer directly.', more: '/developers/query-from-an-app/' },
  { term: 'GCS', aliases: ['Graph Curation Shares'], def: 'What you receive for signalling. Your claim on a subgraph’s curation pool is proportional to the shares you hold, and exiting means burning them.', more: '/curators/signal-and-gcs/' },
  { term: 'GGP', aliases: ['Graph Governance Proposal'], def: 'What the Council actually votes on, potentially bundling several GIPs into one release. Six positive votes accept it.', more: '/governance/gips-and-ggps/' },
  { term: 'GIP', aliases: ['Graph Improvement Proposal'], def: 'A written proposal for a protocol change. Anyone can write one, and its existence means somebody argued for it rather than that anything was decided.', more: '/governance/gips-and-ggps/' },
  { term: 'GIP-0051', def: 'Replaced Cobb-Douglas rebates with the exponential rebate function. The clearest single document on why the old mechanism had to go.', more: '/indexers/economics-rebates/' },
  { term: 'GIP-0089', aliases: ['Innovation Allocation'], def: 'Council-approved redirect of a share of protocol issuance to the Foundation treasury, effective 2026-08-31. Reduces the issuance reaching indexers and delegators.', more: '/governance/tokenomics/', param: 'innovation_allocation_pct' },
  { term: 'graph-node', def: 'The component that executes subgraphs: follows chains, runs mappings, writes entities to Postgres and answers GraphQL.', more: '/indexers/running-the-stack/' },
  { term: 'Graph Council', def: 'A six-of-ten multisig governing the protocol, balancing five stakeholder groups. Not a token vote.', more: '/governance/council-and-foundation/' },
  { term: 'Graph Explorer', def: 'The official interface for browsing subgraphs, indexers and protocol state, and for delegating and curating.', more: '/delegators/choosing-an-indexer/' },
  { term: 'Graph Foundation', def: 'Holds and deploys funds, including grants. Distinct from the Council, which approves protocol changes. A grant is not protocol approval.', more: '/governance/council-and-foundation/' },
  { term: 'GraphTally', aliases: ['TAP', 'Timeline Aggregation Protocol'], def: 'The payment system. Signed receipts per query aggregate into vouchers that settle on chain, so payment need not happen per query and need not be trusted.', more: '/indexers/payments-graphtally/' },
  { term: 'GRT', def: 'The protocol token, used for staking, delegation, curation signal and query fees. Operates on Arbitrum One for protocol purposes.', more: '/start/where-grt-lives/', param: 'initial_supply' },
  { term: 'Horizon', aliases: ['Graph Horizon'], def: 'The protocol upgrade live from 2025-12-11 that made The Graph a substrate for multiple data services, with stake provisioned per service.', more: '/indexers/horizon-provisions/' },
  { term: 'Hosted Service', obsolete: true, def: 'The retired centralised deployment target. A tutorial telling you to deploy there predates the current protocol entirely, and its economics will be wrong too.', more: '/start/where-grt-lives/' },
  { term: 'Indexer', def: 'Runs the infrastructure: follows chains, builds indexes, serves queries, publishes proofs. The only role that operates a service and can be slashed for false claims.', more: '/indexers/indexer-overview/' },
  { term: 'indexer-agent', def: 'The decision-making component. Opens and closes allocations by your indexing rules, manages deployments, and submits redemption transactions.', more: '/indexers/running-the-stack/' },
  { term: 'indexer-service-rs', def: 'The query front door. Validates the payment receipt attached to each query, forwards to graph-node, and stores receipts. Stateless.', more: '/indexers/payments-graphtally/' },
  { term: 'indexer-tap-agent', def: 'Aggregates stored receipts into redeemable vouchers. Runs as a single instance. If it stops, queries are served for free and nothing looks wrong.', more: '/indexers/payments-graphtally/' },
  { term: 'Indexing reward cut', def: 'The share of indexing rewards the indexer keeps. The remainder goes to the delegation pool, so a lower cut is better for delegators.', more: '/delegators/rewards-and-cuts/' },
  { term: 'Indexing rewards', def: 'Paid from new issuance to indexers allocated to subgraphs who prove their work. Exist whether or not anyone queried anything, which is what lets new subgraphs get indexed.', more: '/start/the-value-loop/', param: 'annual_issuance_pct' },
  { term: 'Indexing rules', def: 'The policy telling indexer-agent what to allocate to. Modes include always, never, rules and offchain.', more: '/indexers/cost-models-and-rules/' },
  { term: 'Issuance', def: 'Newly minted GRT, targeted at a percentage of supply per year, funding indexing rewards. A share is now redirected to the Foundation treasury.', more: '/governance/tokenomics/', param: 'annual_issuance_pct' },
  { term: 'Manifest', aliases: ['subgraph.yaml'], def: 'The file declaring which contracts a subgraph watches, from which block, and which handler runs for each event.', more: '/developers/what-is-a-subgraph/' },
  { term: 'Mapping', def: 'The handler code turning a chain event into entity writes. Must be deterministic: no network calls, no clock, no randomness.', more: '/developers/what-is-a-subgraph/' },
  { term: 'maxPOIStaleness', def: 'How long an allocation can go without a fresh POI before it stops earning. Nothing is confiscated, it simply stops paying.', more: '/indexers/allocations-and-pois/', param: 'max_poi_staleness_days' },
  { term: 'Operator key', def: 'A key authorised to act for an indexer, submitting POIs, allocations and redemptions, without being able to move the stake.', more: '/indexers/running-the-stack/' },
  { term: 'Over-delegation', def: 'Delegated stake beyond an indexer’s capacity. The excess cannot be used and rewards for every delegator in the pool are diluted, not just the newest.', more: '/delegators/rewards-and-cuts/', param: 'max_delegation_ratio' },
  { term: 'POI', aliases: ['Proof of Indexing'], def: 'A hash committing to the data an indexer derived. Not a cryptographic proof: it makes claims comparable, so dishonesty is detectable by anyone doing the same work.', more: '/indexers/allocations-and-pois/' },
  { term: 'Provision', def: 'Stake committed to a named data service under that service’s rules. Horizon’s replacement for one general staking pool.', more: '/indexers/horizon-provisions/' },
  { term: 'Query fee cut', def: 'The share of query fees the indexer keeps, with the remainder going to the delegation pool. Like the reward cut, it points at the indexer.', more: '/delegators/rewards-and-cuts/' },
  { term: 'Query fees', def: 'Real revenue paid by data consumers for queries. As large as demand and no larger, in contrast to issuance.', more: '/start/the-value-loop/', param: 'query_fee_burn_pct' },
  { term: 'RAV', aliases: ['Receipt Aggregate Voucher'], def: 'Many signed receipts collapsed into one object saying everything up to here totals this much. What actually settles on chain.', more: '/indexers/payments-graphtally/' },
  { term: 'Rebate', def: 'The portion of query fees an indexer keeps, determined by the exponential rebate function from their own stake ratio. The remainder is burned.', more: '/indexers/economics-rebates/' },
  { term: 'Receipt', def: 'A payment record signed by the payer and sent with each query. Signed by the payer rather than issued by the indexer, because the indexer has the incentive to inflate it.', more: '/indexers/payments-graphtally/' },
  { term: 'Reorg', aliases: ['reorganisation'], def: 'A chain retracting blocks. Indexed data derived from retracted blocks must be unwound, which constrains how mappings can accumulate state.', more: '/developers/what-is-a-subgraph/' },
  { term: 'Schema', aliases: ['schema.graphql'], def: 'A subgraph’s entity definitions. Both the storage model and the query API, and the most expensive thing to change once consumers exist.', more: '/developers/what-is-a-subgraph/' },
  { term: 'Self-stake', def: 'An indexer’s own staked GRT, as opposed to delegated stake. It is what is at risk for misbehaviour and it sets the delegation capacity ceiling.', more: '/indexers/indexer-overview/', param: 'min_indexer_self_stake' },
  { term: 'Signal', def: 'GRT deposited against a subgraph by curators, indicating it is worth indexing. A forecast of query demand with money behind it.', more: '/curators/what-is-curation/' },
  { term: 'Slashing', def: 'Loss of staked GRT for a proven false claim. Under Horizon the amount is judged by arbitrators within a cap rather than fixed. Downtime is not slashable.', more: '/indexers/disputes-and-slashing/', param: 'max_slash_pct' },
  { term: 'Stake ratio', def: 'An indexer’s stake divided by the query fees they generated on a subgraph. The only input to the rebate function, and effectively flat past about 8.', more: '/indexers/economics-rebates/' },
  { term: 'Subgraph', def: 'A manifest, a schema and mappings that together define a deterministic function from chain events to queryable entities.', more: '/developers/what-is-a-subgraph/' },
  { term: 'Subgraph Service', def: 'The first and currently dominant Horizon data service, covering subgraph indexing and serving. Indexers register directly with it.', more: '/indexers/horizon-provisions/' },
  { term: 'Subgraph Studio', def: 'Where subgraphs are developed and deployed before publishing to the network, and where API keys are managed.', more: '/developers/build-a-subgraph/' },
  { term: 'Substreams', def: 'Composable WebAssembly modules over a Firehose stream. Outputs cache and work parallelises by block range, which is why backfills are fast.', more: '/developers/substreams/' },
  { term: 'Thawing period', aliases: ['undelegation period', 'unbonding'], def: 'The wait between undelegating and withdrawing, during which capital earns nothing. Exists so stake is still reachable when misbehaviour is arbitrated.', more: '/delegators/undelegation-and-thawing/', param: 'undelegation_period_days' },
  { term: 'Token API', def: 'A REST API for balances, transfers, prices and NFT ownership across several chains, built on Substreams. No subgraph to author and no signal to post.', more: '/developers/token-api/' },
  { term: 'Unsignal', def: 'Withdrawing curation signal by burning shares back to the pool. On Arbitrum the cost does not depend on when you entered.', more: '/curators/l2-flat-curation/' },
];

export function groupedGlossary() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'en'));
  const groups = new Map<string, Term[]>();
  for (const t of sorted) {
    const letter = t.term[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(t);
  }
  return [...groups.entries()].map(([letter, terms]) => ({ letter, terms }));
}

export const slugify = (term: string) =>
  term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
