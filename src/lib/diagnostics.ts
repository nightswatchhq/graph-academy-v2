import type { Worked } from './support';
export interface Cause {
  /** What is actually wrong. */
  cause: string;
  /** How to tell whether it is this one. */
  check: string;
  /** Where the mechanism is explained. */
  more?: string;
}

export interface Symptom {
  id: string;
  /** Stated the way somebody says it out loud, not the way a manual would. */
  symptom: string;
  who: 'developer' | 'consumer' | 'indexer' | 'delegator' | 'curator';
  /** Most likely first. */
  causes: Cause[];
  /**
   * Times this actually happened to somebody, in the graph-support archive.
   * A cause explains the shape of a failure; a worked case is one occasion of
   * it, with the deployment, the commands and a stated outcome. Add one only
   * after reading the thread: a title that sounds right is not evidence.
   */
  worked?: Worked[];
}

/**
 * A symptom index. Every failure mode here is explained somewhere in the
 * library already; the problem is that a reader with a broken thing does not
 * know which collection it lives in. Silent failures come first within each
 * symptom, because those are the ones that persist.
 */
export const SYMPTOMS: Symptom[] = [
  {
    id: 'query-returns-empty',
    symptom: 'My query returns an empty array',
    who: 'consumer',
    causes: [
      {
        cause: 'The subgraph has not indexed that far yet',
        check: 'Query indexing status alongside the data and compare the indexed block against chain head.',
        more: '/consumers/integrating-an-endpoint/',
      },
      {
        cause: 'The deployment failed at some block and stopped',
        check: 'Check deployment health. A failed subgraph keeps answering correctly for everything up to where it stopped, and raises nothing.',
        more: '/consumers/getting-data/',
      },
      {
        cause: 'One indexer has diverged and is serving an empty result',
        check: 'Intermittent, because the gateway routes to a different indexer each time. Same query, same subgraph, rows sometimes and nothing others, with no error anywhere. Query two indexers directly and compare.',
        more: '/indexers/allocations-and-pois/',
      },
      {
        cause: 'There is genuinely no matching data',
        check: 'The only benign case, and it is indistinguishable from the other two in the response. That is why the status check is not optional.',
        more: '/developers/query-from-an-app/',
      },
    ],
    worked: [{ n: 5, was: 'one indexer diverged, serving [] intermittently with no error' }],
  },
  {
    id: 'data-is-stale',
    symptom: 'The data is correct but months out of date',
    who: 'consumer',
    causes: [
      {
        cause: 'The subgraph broke on a contract upgrade',
        check: 'A proxy upgrade changes behaviour under a stable address while the mapping still expects the old ABI. The most common way a working subgraph breaks with no change on your side.',
        more: '/developers/what-is-a-subgraph/',
      },
      {
        cause: 'The source contract went quiet',
        check: 'The subgraph is at chain head, has no errors, and has been indexing the whole time. There is nothing to index, because the protocol you are watching migrated to a new contract. Check the contract address for activity before you blame the subgraph.',
        more: '/developers/what-is-a-subgraph/',
      },
      {
        cause: 'The chain halted, or the chain client behind the indexer froze',
        check: 'The most convincing lie in the ecosystem. graph-node reports synced, hasIndexingErrors is false, _meta returns a real block, and the gateway routes happily, because the indexer has genuinely indexed every block it can see. Compare _meta against a block explorer, not against the indexer.',
        more: '/ecosystem/oracles-and-observability/',
      },
      {
        cause: 'Nobody maintains that subgraph any more',
        check: 'Find who published it in Graph Explorer and when it was last updated.',
        more: '/consumers/getting-data/',
      },
    ],
    worked: [
      { n: 27, was: 'a proxy upgrade changed 11 of 13 event signatures, and the subgraph had been quietly wrong for months' },
      { n: 7, was: 'the source contract migrated, the subgraph was healthy the whole time' },
      { n: 13, was: 'the sole indexer reported 99.98% synced against a chain head frozen 85 hours' },
      { n: 15, was: 'why a halted chain is indistinguishable from health in every tool' },
      { n: 14, was: 'Moonbeam stopped producing blocks and nothing anywhere said so' },
      { n: 25, was: 'a frozen chain client reporting synced while 3.68M blocks went unindexed' },
    ],
  },
  {
    id: 'signalled-but-no-indexers',
    symptom: 'My subgraph is published and signalled but every query says no indexers found',
    who: 'consumer',
    causes: [
      {
        cause: 'Nobody has allocated to it',
        check: 'no indexers found is a different error from bad indexers: zero allocations, so the gateway had nothing to try. Look up allocations on the deployment, not signal. Signal in Explorer looks like progress and is not; only an allocation makes the subgraph queryable.',
        more: '/developers/moving-off-studio/',
      },
      {
        cause: 'An indexer allocated, hit a deterministic error, and closed again',
        check: 'The error was bad indexers with no attestation: indexing_error for a while and then went back to no indexers found. Ask an indexer that was allocated for the deployment\u2019s indexing status; a recorded fatal error at a fixed block is the subgraph, not the network.',
        more: '/developers/moving-off-studio/',
      },
      {
        cause: 'You are querying a deployment hash that was never published',
        check: 'Deploying to Studio and publishing to the network are different acts, and only the published hash carries signal. Compare the hash in your query URL with the one Explorer shows for the published version.',
        more: '/developers/build-a-subgraph/',
      },
    ],
  },
  {
    id: 'worked-on-studio-fails-on-network',
    symptom: 'It worked on Studio but fails deterministically on the network, at a block Studio had already passed',
    who: 'consumer',
    causes: [
      {
        cause: 'The subgraph always had the error, and the upgrade indexer served past it',
        check: 'Every allocated indexer\u2019s status endpoint reports the same error at the same block. Six for six is the tell. graph-node records a deterministic error, skips it and carries on, and by default refuses queries against a deployment holding one, so a copy that answered on Studio proves only that nobody checked its health. Compare the upgrade indexer\u2019s indexingStatuses for the deployment with two allocated indexers\u2019.',
        more: '/developers/moving-off-studio/',
      },
      {
        cause: 'One indexer\u2019s chain client disagrees with the others',
        check: 'The failure is on one indexer only, at a block the others passed, usually a contract call reverting on that node and nowhere else. That is the operator\u2019s archive node, not your mapping. The gateway routes around it; the operator needs telling.',
        more: '/ecosystem/oracles-and-observability/',
      },
    ],
    worked: [
      { n: 32, was: 'all six allocated indexers unhealthy at the same block, on a pool whose currency reverts on decimals()' },
      { n: 37, was: 'a TVL going negative in a handler, deterministic on every indexer that reached the block' },
      { n: 39, was: 'a 24h lookback walking 1.97M buckets and exhausting wasm memory, again on every indexer' },
    ],
  },
  {
    id: 'nobody-indexes-my-subgraph',
    symptom: 'I published a subgraph and nothing is indexing it',
    who: 'developer',
    causes: [
      {
        cause: 'It has no curation signal',
        check: 'Allocating to an unsignalled subgraph earns no indexing rewards, so no indexer will. Publishing is not a request to be served.',
        more: '/developers/build-a-subgraph/',
      },
      {
        cause: 'You signalled, but nobody has allocated yet',
        check: 'Signal makes a subgraph worth indexing. It does not compel anyone. Check allocations, not just signal.',
        more: '/curators/what-is-curation/',
      },
    ],
    worked: [{ n: 21, was: 'the upgrade indexer itself was wedged on a store error and allocated to nothing' }],
  },
  {
    id: 'sync-is-slow',
    symptom: 'My subgraph takes days to sync',
    who: 'developer',
    causes: [
      {
        cause: 'eth_calls inside handlers',
        check: 'A network round trip per call per event across the whole history. Different in kind from ordinary slowness, and worth fixing before anything else.',
        more: '/developers/indexing-performance/',
      },
      {
        cause: 'String IDs where bytes would do',
        check: 'Locale-aware UTF-8 comparison on every lookup. The docs measure up to 48% faster indexing from the change alone.',
        more: '/developers/indexing-performance/',
      },
      {
        cause: 'It is not actually stuck, and "99%" is not a real quantity',
        check: 'Sync progress is shown against an estimate. A deployment is at chain head or it is not, and one sitting at 99 percent for hours is usually still working through a dense range. Compare the indexed block against chain head directly rather than reading the percentage.',
        more: '/developers/indexing-performance/',
      },
      {
        cause: 'Mutable entities that never actually change',
        check: 'Every update maintains a block range on the previous version. Event-log entities can almost always be immutable.',
        more: '/developers/indexing-performance/',
      },
    ],
    worked: [{ n: 10, was: 'reported repeatedly on different deployments, at chain head hours later every time' }],
  },
  {
    id: 'graft-fails',
    symptom: 'My graft is rejected, or a historical query is empty',
    who: 'developer',
    causes: [
      {
        cause: 'The history was pruned',
        check: 'You cannot graft at a pruned height, and time travel queries are incompatible with prune: auto. Both fail quietly rather than loudly.',
        more: '/developers/pruning-and-history/',
      },
      {
        cause: 'The schema change is not one grafting permits',
        check: 'Everything permitted is additive or a loosening. A new non-nullable field cannot be honest about inherited rows.',
        more: '/developers/grafting-and-hotfixes/',
      },
    ],
  },
  {
    id: 'allocation-earns-nothing',
    symptom: 'My allocation is open and healthy but earns nothing',
    who: 'indexer',
    causes: [
      {
        cause: 'The subgraph carries no curation signal',
        check: 'Indexing rewards depend on signal. A technically perfect allocation to an unsignalled subgraph earns nothing and looks entirely healthy.',
        more: '/indexers/allocations-and-pois/',
      },
      {
        cause: 'The POI has gone stale',
        check: 'Past the staleness limit the allocation stops paying. Nothing is confiscated and no alarm sounds. Alert on POI age directly.',
        more: '/indexers/allocations-and-pois/',
      },
      {
        cause: 'You are not eligible for indexing rewards',
        check: 'Since GIP-0079 rewards are gated on real gateway traffic reaching you on several separate days. The oracle reads gateway logs, not your metrics, so your own dashboards can be entirely green while the verdict is Unqualified. Check the oracle, not Prometheus.',
        more: '/indexers/rewards-eligibility/',
      },
    ],
  },
  {
    id: 'served-but-not-paid',
    symptom: 'Queries are being served but the revenue stopped',
    who: 'indexer',
    causes: [
      {
        cause: 'tap-agent has stopped, or RAV redemption is failing',
        check: 'Serving and settling are independent systems. Monitor unaggregated receipt value and the age of the oldest unredeemed RAV; neither shows up in query metrics.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'The escrow behind the sender is exhausted',
        check: 'The receipts you hold are backed by nothing.',
        more: '/indexers/payments-graphtally/',
      },
    ],
    worked: [{ n: 30, was: 'the sender’s aggregator was down, so no RAV could be signed and revenue stopped before serving did' }],
  },
  {
    id: 'no-queries-routed',
    symptom: 'I am allocated to a busy subgraph and serve none of its queries',
    who: 'indexer',
    causes: [
      {
        cause: 'Your cost model prices you above the field',
        check: 'Overpricing looks exactly like absence of demand from your side, which is why it persists for months. Compare query volume against allocated stake per subgraph.',
        more: '/indexers/cost-models-and-rules/',
      },
      {
        cause: 'Measured performance is putting the gateway off',
        check: 'Selection is a policy, and it is the gateway operator’s policy rather than the protocol’s.',
        more: '/ecosystem/gateways/',
      },
    ],
    worked: [
      { n: 17, was: 'how the gateway actually picks, and why coverage beats latency' },
      { n: 18, was: 'TooFarBehind from half the allocations, one indexer holding all the history' },
    ],
  },
  {
    id: 'rewards-dropped',
    symptom: 'My rewards dropped and I changed nothing',
    who: 'delegator',
    causes: [
      {
        cause: 'GIP-0089 redirected a fifth of protocol issuance on 2026-08-31',
        check: 'Indexing rewards come from issuance. Trailing-average dashboards show this as a gradual drift rather than a step, which makes it easy to misread as your indexer.',
        more: '/governance/tokenomics/',
      },
      {
        cause: 'Your indexer went over its delegation capacity',
        check: 'The dilution falls on everyone in the pool, not just late arrivals. An indexer can become a poor choice through other people’s deposits.',
        more: '/delegators/rewards-and-cuts/',
      },
      {
        cause: 'Your indexer changed its cut, or stopped allocating',
        check: 'The cut is a parameter they set and can move. Check parameter history and the allocated-versus-idle ratio.',
        more: '/delegators/choosing-an-indexer/',
      },
    ],
    worked: [{ n: 23, was: 'GIP-0089 read off the contracts, including what had and had not activated' }],
  },
  {
    id: 'cannot-withdraw',
    symptom: 'I undelegated and my GRT has not arrived',
    who: 'delegator',
    causes: [
      {
        cause: 'The thawing period has not elapsed',
        check: 'It earns nothing and cannot be moved during the wait. This is the mechanism, not a fault.',
        more: '/delegators/undelegation-and-thawing/',
      },
    ],
  },
  {
    id: 'signal-earns-nothing',
    symptom: 'I signalled on a subgraph and have earned nothing',
    who: 'curator',
    causes: [
      {
        cause: 'No indexer is allocated to it',
        check: 'Signal makes a subgraph attractive to index and compels nobody. No allocation means no fees, however much demand exists.',
        more: '/curators/signal-and-gcs/',
      },
      {
        cause: 'Nobody is querying it',
        check: 'Curators are paid from query fees, so the return is contingent on the forecast being right. This is the commonest outcome and it is silent.',
        more: '/curators/curation-strategy/',
      },
      {
        cause: 'The pool is crowded relative to the fees',
        check: 'Your return is your share of the pool. Heavy signal against modest fees divides the same income more ways.',
        more: '/curators/curation-strategy/',
      },
    ],
  },
  {
    id: 'bad-indexers',
    symptom: 'My query fails with "bad indexers" and a map of addresses',
    who: 'consumer',
    causes: [
      {
        cause: 'One or more operators have a failed copy of the deployment',
        check: 'Look for "no attestation: indexing_error" against an address. That copy has failed outright and is deterministic: it will not recover on its own and no amount of retrying helps. The operator has to intervene.',
        more: '/consumers/getting-data/',
      },
      {
        cause: 'The reason inside the map is actually about your query',
        check: 'BadResponse(unattestable response: ...) usually means your query. Read the text inside the brackets rather than the wrapper around it. graph-node marks a class of errors unattestable, and the gateway wraps those so they arrive looking like an indexer fault.',
        more: '/developers/query-from-an-app/',
      },
      {
        cause: 'Every operator is behind, unreachable, or returning a bare status',
        check: 'A mix of "too far behind", "no status: indexer not available" and bare BadResponse(400) across different addresses means the deployment is unserved rather than your query being wrong. When the failures disagree with each other, stop debugging your client.',
        more: '/ecosystem/gateways/',
      },
      {
        cause: 'Nothing is allocated at all',
        check: 'The error is then "no indexers found" rather than "bad indexers". Nothing was tried. That is a curation and allocation problem, not a serving one.',
        more: '/curators/what-is-curation/',
      },
    ],
    worked: [
      { n: 1, was: 'what every reason in that map means, decoded against gateway source' },
      { n: 8, was: 'six indexers, four distinct failures, no healthy candidate anywhere' },
      { n: 4, was: 'the reason inside the map turned out to be the query, not the indexers' },
      { n: 26, was: 'the sole allocated indexer\u2019s store was down, and there was no second candidate to fall back to' },
    ],
  },
  {
    id: 'new-api-key-rejected',
    symptom: 'A brand new API key returns "auth error: API key not found"',
    who: 'consumer',
    causes: [
      {
        cause: 'The key has not propagated to the gateway yet',
        check: 'Reported as up to an hour, and regenerating the key does not help because the new one has the same problem. Nothing is wrong with the key. Wait, and do not build a workaround around it.',
        more: '/consumers/paying-for-queries/',
      },
    ],
    worked: [{ n: 22, was: 'traced to the gateway auth path, read at a named commit' }],
  },
  {
    id: 'pagination-stopped',
    symptom: 'Pagination that worked for months started failing',
    who: 'developer',
    causes: [
      {
        cause: 'An operator lowered their skip ceiling',
        check: 'The message is "The skip argument must be between 0 and 20000". GRAPH_GRAPHQL_MAX_SKIP is a per-operator graph-node setting, so your query was always at the mercy of a value you cannot see. You noticed the day somebody tightened it.',
        more: '/developers/query-from-an-app/',
      },
      {
        cause: 'You are using skip at all',
        check: 'Order by id and filter on the last id you saw. Cursor pagination has no ceiling and does not degrade on a large subgraph, and it removes the dependency on every operator\u2019s private configuration.',
        more: '/developers/query-from-an-app/',
      },
    ],
    worked: [{ n: 4, was: 'a 1TB subgraph, an operator at 20000, and a query unchanged for months' }],
  },
  {
    id: 'deploy-fails',
    symptom: 'My subgraph will not deploy, with a connection error',
    who: 'developer',
    causes: [
      {
        cause: 'The hosted service failed internally, and told you its private address',
        check: 'A 10.x.x.x, 172.16-31.x.x or 192.168.x.x address in the error is inside somebody else\u2019s network. Your machine has never routed to it and never could. Nothing on your side is involved: not the manifest, not your CLI version, not your deploy key. Recognise the shape and stop debugging.',
        more: '/developers/build-a-subgraph/',
      },
      {
        cause: 'The manifest or the build is genuinely wrong',
        check: 'The distinguishing test is the address. A public host or a schema complaint is yours; a private address is not.',
        more: '/developers/build-a-subgraph/',
      },
    ],
    worked: [{ n: 3, was: 'ECONNREFUSED on an RFC 1918 address, fixed by the operator forty minutes later' }],
  },
  {
    id: 'studio-serves-old-version',
    symptom: 'Studio keeps serving an old version of my subgraph',
    who: 'developer',
    causes: [
      {
        cause: 'version/latest means the latest published version, not the newest deployment',
        check: 'Deploying is not publishing. Address the version label explicitly and drop version/ from the path. If that returns the new data, this was it.',
        more: '/developers/build-a-subgraph/',
      },
    ],
    worked: [{ n: 2, was: 'v3.0.0 deployed, v2.1.0 served, fixed by naming the version in the URL' }],
  },
  {
    id: 'ipfs-field-null',
    symptom: 'A field derived from IPFS is null and never fills in',
    who: 'developer',
    causes: [
      {
        cause: 'The fetch missed once at index time and is never retried',
        check: 'graph-node does not retry ipfs.cat. A CID that was slow to propagate when the handler ran stays null for that entity forever, even though fetching the CID by hand now works perfectly. Test the CID directly: if it resolves and the entity is still null, the fetch is not being retried.',
        more: '/developers/what-is-a-subgraph/',
      },
      {
        cause: 'The content genuinely is not retrievable',
        check: 'Fetch the CID from more than one gateway. The two cases look identical in the data and only the direct fetch separates them.',
        more: '/ecosystem/oracles-and-observability/',
      },
    ],
    worked: [{ n: 6, was: 'both CIDs resolved by hand while one entity stayed null' }],
  },
  {
    id: 'receipt-data-service-rejected',
    symptom: 'Every query is rejected with "Invalid data_service: ... is not allowed for this indexer"',
    who: 'indexer',
    causes: [
      {
        cause: 'indexer-service does not recognise the data service paying you',
        check: 'A Horizon receipt names the data service it settles under. If the address in the error is 0xb2Bb92d0DE618878E438b55D5846cfecD9301105 on Arbitrum One, that is the SubgraphService proxy, which is the data service for subgraph queries: the gateway is paying you correctly and your side does not recognise the payer. Set subgraph_service_address under [blockchain] in the indexer-service config, and check receipts_verifier_address_v2 beside it. Both are required Horizon addresses.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'The config predates the Horizon migration',
        check: 'The two addresses above did not exist before Horizon, so a config carried across from the pre-Horizon stack is missing them rather than wrong about them. Check whether they are absent rather than incorrect.',
        more: '/indexers/horizon-provisions/',
      },
    ],
  },
  {
    id: 'cost-polled-no-queries',
    symptom: 'The gateway polls my cost endpoint every few seconds and sends me no queries',
    who: 'indexer',
    causes: [
      {
        cause: 'The queries are arriving and your indexer-service is rejecting them',
        check: 'Check this first, because it looks identical to never being selected and it is the one cause where the gateway is already doing its job. Receipt validation runs before the query reaches graph-node, so a rejected receipt is loud in the indexer-service log and invisible in every metric you own. Look for IndexerServiceError there before theorising about selection.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'You are not allocated to the deployments carrying the demand',
        check: 'The polling proves you are discovered and reachable, so the fault is not the network path. But cost is fetched globally while queries route per deployment, and a gateway can only send you a query for something you are allocated to. Count allocations on deployments with real traffic, not allocations.',
        more: '/indexers/allocations-and-pois/',
      },
      {
        cause: 'Your price loses the argmax',
        check: 'Selection is score divided by fee, so fee is a straight divisor and the strongest single lever. A measurably worse indexer takes first pick once its fee halves. Compare your model against what the deployment actually pays.',
        more: '/indexers/cost-models-and-rules/',
      },
      {
        cause: 'You are dropped from the candidate set before scoring',
        check: 'Two things remove you outright: roughly ten seconds or more further behind chainhead than the incumbent, and too little total stake. Neither shows up as an error and both look exactly like no demand.',
        more: '/ecosystem/gateways/',
      },
    ],
    worked: [{ n: 17, was: 'selection measured against the compiled gateway crate, with the thresholds' }],
  },
  {
    id: 'still-unqualified',
    symptom: 'I fixed the problem days ago and the oracle still says Unqualified',
    who: 'indexer',
    causes: [
      {
        cause: 'You are counting days since the repair, not qualifying days',
        check: 'The window is rolling and nothing resets it. The counter advances only on days a qualifying query actually landed, which needs the gateway to route to you first. Fixing your side enables that; it does not schedule it. Count days with traffic, not days since the fix.',
        more: '/indexers/rewards-eligibility/',
      },
      {
        cause: 'Queries arrive and are rejected before they are served',
        check: 'A rejected receipt is a failed query, so it is a non-200 to the gateway and produces no qualifying day, while your own counter stays flat because it sits after receipt validation. Read the indexer-service log: this is indistinguishable from silence everywhere else.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'The gateway is not routing to you',
        check: 'A flat query counter narrows it to this or the rejection above, and only the indexer-service log separates them. If nothing is being rejected either, the question becomes coverage, price and the candidate-set thresholds.',
        more: '/ecosystem/gateways/',
      },
      {
        cause: 'Traffic arrives but does not qualify',
        check: 'All three bars have to be met by the same query: 200, under the latency limit, and near chainhead. A deployment that has fallen behind answers every request successfully and produces no qualifying days at all.',
        more: '/indexers/rewards-eligibility/',
      },
      {
        cause: 'You are testing against yourself',
        check: 'Queries you send your own endpoint never went through a gateway, so the oracle cannot see them. They will make your dashboards healthy and change nothing.',
        more: '/indexers/rewards-eligibility/',
      },
    ],
  },
  {
    id: 'empty-response-reverts',
    symptom: 'graph-node logs "Contract call reverted, reason: empty response" at volume',
    who: 'indexer',
    causes: [
      {
        cause: 'The archive node behind it is not serving historical state',
        check: 'Seen after moving Base to a base-reth-node storage v2 snapshot, on two independent operators. The chain client answers, so nothing reports unhealthy, but eth_call at a historical block comes back empty and the mapping records a revert that did not happen. Compare the same eth_call against a second provider at the same block.',
        more: '/indexers/running-the-stack/',
      },
    ],
    worked: [{ n: 11, was: 'open and unresolved, recorded early so nobody migrates blind' }],
  },
  {
    id: 'receipts-refused-denylisted-sender',
    symptom: 'Every query is refused with "Received a receipt from a denylisted sender"',
    who: 'indexer',
    causes: [
      {
        cause: 'The sender’s aggregator is unreachable, so no RAV can be signed and your own tap-agent denied them',
        check: 'indexer-service is not judging the sender, it is reading a row your own tap-agent wrote, so check tap_horizon_denylist (scalar_tap_denylist on the legacy path) before you blame anybody. Then curl the URL mapped to that sender under [tap.sender_aggregator_endpoints]. A proxy erroring in front of the aggregator does not surface as an HTTP failure: tap-agent reports it as an invalid gRPC compression flag, and the flag number is the first byte of the proxy’s error body, 101 for "error code: NNN" and 60 for an HTML page. Ignore the flag and read the HTTP status at the end of the message.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'tap-agent is failing to aggregate for some other reason, or is not running',
        check: 'The ceiling is the same whatever stopped aggregation, so a dead aggregator, a stopped agent and a failing redemption all arrive here looking identical. tap_sender_denied goes to 1 at the moment of denial and tap_sender_fee_tracker_grt_total climbs in a straight line to tap_max_fee_per_sender_grt_total beforehand; whether that line is climbing or flat says whether receipts are still arriving and only aggregation is broken.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'The sender’s escrow no longer covers what you are holding',
        check: 'The other half of the deny condition, and it fires with no aggregation failure at all. Pending RAVs plus unaggregated fees exceeding the sender’s escrow balance denies them just the same, and indexer-service prints the identical error. Compare tap_sender_escrow_balance_grt_total against pending plus unaggregated before assuming the aggregator is at fault.',
        more: '/indexers/payments-graphtally/',
      },
      {
        cause: 'Invalid receipts have quietly accumulated',
        check: 'Invalid receipt fees count toward the same ceiling and never go down, so a slow trickle denies a sender eventually with nothing else wrong anywhere. tap_invalid_receipt_fees_grt_total is the one to watch, and it is the only one of these four that will not clear itself.',
        more: '/indexers/payments-graphtally/',
      },
    ],
    worked: [{ n: 30, was: 'the mainnet aggregator serving a Cloudflare 526, reported as gRPC compression flag 101' }],
  },
];
