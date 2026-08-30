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
        cause: 'There is genuinely no matching data',
        check: 'The only benign case, and it is indistinguishable from the other two in the response. That is why the status check is not optional.',
        more: '/developers/query-from-an-app/',
      },
    ],
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
        cause: 'Nobody maintains that subgraph any more',
        check: 'Find who published it in Graph Explorer and when it was last updated.',
        more: '/consumers/getting-data/',
      },
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
        cause: 'Mutable entities that never actually change',
        check: 'Every update maintains a block range on the previous version. Event-log entities can almost always be immutable.',
        more: '/developers/indexing-performance/',
      },
    ],
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
];
