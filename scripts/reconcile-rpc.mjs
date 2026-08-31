#!/usr/bin/env node
// Reads the deployed contracts on Arbitrum One and compares them against the
// registry. No gateway key, no subgraph, no secrets: a public RPC and eth_call.
//
// This exists because scripts/reconcile-onchain.mjs needs three secrets, runs
// only on the nightly schedule, is continue-on-error, and had been reporting
// "skipped". On 2026-08-31 the registry recorded the GIP-0089 issuance split as
// live when the contract said otherwise, and nothing here noticed. A human did,
// by accident.
//
// The signatures below were each confirmed against the deployed contract before
// being written down. Several of the onchain_ref strings in the registry were
// not: every HorizonStaking function they named reverts. A reference that does
// not resolve is worse than none, because it looks like verification.
import { paramEntries, c } from './lib.mjs';

const RPC = process.env.ARB1_RPC ?? 'https://arb1.arbitrum.io/rpc';

const AT = {
  SubgraphService: '0xb2Bb92d0DE618878E438b55D5846cfecD9301105',
  DisputeManager: '0x2FE023a575449AcB698648eD21276293Fa176f96',
  GraphPayments: '0x7Aae8ae011927BC36Cb4d0d3e81f2E6E30daE06D',
  RewardsManager: '0x971B9d3d0Ae3ECa029CAB5eA1fB0F72c85e6a525',
  IssuanceAllocator: '0xb64f29b2d81140ffc3a135e319561a1bd03b1a7e',
  RewardsEligibilityOracle: '0x02753BaE61C08AbD4351Bce7F48524935C2Cc78E',
};

const E18 = 10n ** 18n;

/**
 * One entry per parameter this can actually read. `selector` is the first four
 * bytes of keccak256 of the signature, written out rather than computed so the
 * script needs no hashing dependency and so a wrong one is visible in review.
 * `word` picks a return slot for multi-value returns. `read` turns the raw
 * bigint into the registry's units.
 */
const CHECKS = [
  {
    key: 'min_indexer_self_stake',
    at: 'SubgraphService', sig: 'getProvisionTokensRange()(uint256,uint256)',
    selector: '0x819ba366', word: 0,
    read: (v) => Number(v / E18),
  },
  {
    key: 'max_delegation_ratio',
    at: 'SubgraphService', sig: 'getDelegationRatio()(uint32)',
    selector: '0x1ebb7c30', word: 0,
    read: (v) => Number(v),
  },
  {
    key: 'max_poi_staleness_days',
    at: 'SubgraphService', sig: 'maxPOIStaleness()(uint256)',
    selector: '0x85e82baf', word: 0,
    read: (v) => Number(v) / 86400,
  },
  {
    key: 'undelegation_period_days',
    at: 'SubgraphService', sig: 'getThawingPeriodRange()(uint64,uint64)',
    selector: '0x71ce020a', word: 0,
    read: (v) => Number(v) / 86400,
  },
  {
    key: 'fisherman_dispute_deposit',
    at: 'DisputeManager', sig: 'disputeDeposit()(uint256)',
    selector: '0x29e03ff1', word: 0,
    read: (v) => Number(v / E18),
  },
  {
    key: 'max_slash_pct',
    at: 'DisputeManager', sig: 'maxSlashingCut()(uint32)',
    selector: '0x0533e1ba', word: 0,
    read: (v) => Number(v) / 10000,
  },
  {
    key: 'query_fee_burn_pct',
    at: 'GraphPayments', sig: 'PROTOCOL_PAYMENT_CUT()(uint256)',
    selector: '0x1d526e50', word: 0,
    read: (v) => Number(v) / 10000,
  },
  {
    key: 'subgraph_service_issuance_per_block',
    at: 'RewardsManager', sig: 'issuancePerBlock()(uint256)',
    selector: '0x6c080f18', word: 0,
    read: (v) => Number((v * 1000n) / E18) / 1000,
  },
  {
    key: 'reo_eligibility_period_days',
    at: 'RewardsEligibilityOracle', sig: 'getEligibilityPeriod()(uint256)',
    selector: '0xd0a5379e', word: 0,
    read: (v) => Number(v) / 86400,
  },
];

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

const call = async (to, data, block) => rpc('eth_call', [{ to, data }, block]);
const wordAt = (hex, i) => BigInt('0x' + hex.slice(2).slice(i * 64, (i + 1) * 64));

/**
 * Two outcomes, and the distinction that makes them work.
 *
 * `value` is what the site teaches. Usually that is also what the contract
 * says, and then the comparison is trivial. Sometimes it is deliberately not:
 * `innovation_allocation_pct` teaches the 20% that governance approved, while
 * the contract currently allocates none of it. Both facts are true and the
 * lesson needs the first.
 *
 * So a parameter may carry `onchain_expect`, which is what the contract is
 * expected to return today. Where it is present it is what gets compared, and
 * the day the contract stops returning it this goes red and says so. That is
 * the whole mechanism: not "is the registry right" but "has the chain moved
 * since a human last looked".
 *
 * Guessing which of the two to compare would have been the wrong kind of
 * clever. An expectation nobody wrote down is not an expectation.
 */
const moved = [];
const unread = [];
let block;

try {
  block = Number(await rpc('eth_blockNumber', []));
} catch (e) {
  // A reconciliation that cannot reach the chain must not look like a pass.
  // This is the whole failure mode the script exists to close.
  console.log(`${c.red}fail${c.reset}  cannot reach ${RPC}: ${e.message}`);
  process.exit(1);
}

console.log(`${c.bold}on-chain reconciliation${c.reset}`);
console.log(`${c.dim}Arbitrum One, block ${block}, via ${RPC}${c.reset}\n`);

const byKey = Object.fromEntries(paramEntries);

for (const chk of CHECKS) {
  const p = byKey[chk.key];
  if (!p) { unread.push(`${chk.key}: checked on chain but not in the registry`); continue; }
  let live;
  try {
    const raw = await call(AT[chk.at], chk.selector, 'latest');
    if (!raw || raw === '0x') throw new Error('empty return');
    live = chk.read(wordAt(raw, chk.word));
  } catch (e) {
    unread.push(`${chk.key}: ${chk.at}.${chk.sig} did not return (${e.message})`);
    continue;
  }
  record(chk.key, p, live, `${chk.at}.${chk.sig}`);
}

function record(key, p, live, via) {
  const taught = Number(p.value);
  const expect = p.onchain_expect === undefined ? taught : Number(p.onchain_expect);
  const agrees = Math.abs(live - expect) < 1e-9;
  const aside = expect === taught ? '' : `  ${c.dim}(teaches ${taught})${c.reset}`;
  console.log(
    `  ${agrees ? `${c.green}=${c.reset}` : `${c.red}!${c.reset}`} ${key.padEnd(36)}` +
      ` expect ${String(expect).padEnd(12)} chain ${live}${aside}`,
  );
  if (!agrees) {
    moved.push(
      `${key}: expected ${expect}, chain says ${live} at block ${block}. ` +
        (expect === taught
          ? `Update value and add a history row.`
          : `The registry teaches ${taught} and expected the chain to still say ${expect}. ` +
            (Math.abs(live - taught) < 1e-9
              ? `The chain has now caught up with what the site teaches: drop onchain_expect, set status to current, and add a history row naming this block.`
              : `Read it properly before changing anything.`)) +
        ` (${via})`,
    );
  }
}

// The issuance split is two calls and a subtraction rather than one read, so it
// gets its own branch instead of being bent into the table above.
try {
  const total = wordAt(await call(AT.IssuanceAllocator, '0x79d5fc54', 'latest'), 0);
  const toRewards = wordAt(
    await call(
      AT.IssuanceAllocator,
      // getTargetAllocation(address), with the Rewards Manager as the argument
      '0x84c48422' + AT.RewardsManager.slice(2).toLowerCase().padStart(64, '0'),
      'latest',
    ),
    0,
  );
  const redirected = total === 0n ? 0 : Number(((total - toRewards) * 10000n) / total) / 100;
  record(
    'innovation_allocation_pct',
    byKey.innovation_allocation_pct,
    redirected,
    `IssuanceAllocator allocates ${toRewards} of ${total} to the Rewards Manager`,
  );
} catch (e) {
  unread.push(`innovation_allocation_pct: IssuanceAllocator did not return (${e.message})`);
}

// Every registry key naming a contract function that this script does not
// actually read. Named out loud rather than left implicit, because an
// onchain_ref carries an implication of verification that it has not earned.
const covered = new Set([...CHECKS.map((c) => c.key), 'innovation_allocation_pct']);
const claimed = paramEntries.filter(([k, p]) => p.onchain_ref && !covered.has(k)).map(([k]) => k);
const uncovered = paramEntries.length - covered.size;

console.log();
for (const u of unread) console.log(`${c.yellow}unread${c.reset}  ${u}`);
for (const m of moved) console.log(`${c.red}moved${c.reset}   ${m}`);
if (claimed.length) {
  console.log(
    `${c.yellow}note${c.reset}    ${claimed.length} parameter(s) carry an onchain_ref this script does not read: ` +
      claimed.join(', '),
  );
}
// Coverage stated out loud. Ten of twenty-eight sounds thin until you notice
// what the rest are: documented recommendations, historical values kept for
// teaching, and a handful that are compile-time constants with no getter. The
// number is here so nobody mistakes a green run for the whole registry having
// been checked against the chain.
console.log(
  `${c.dim}        ${covered.size} of ${paramEntries.length} registry parameters are readable by eth_call. ` +
    `The other ${uncovered} are not on chain, or are on chain with no getter.${c.reset}`,
);

const bad = moved.length + unread.length;
console.log(
  `\n${bad === 0 ? `${c.green}ok${c.reset}   ` : `${c.red}fail${c.reset} `}` +
    `   ${CHECKS.length + 1} parameters read from chain at block ${block}. ` +
    `${moved.length} moved since a human last looked, ${unread.length} unreadable`,
);
process.exit(bad > 0 ? 1 : 0);
