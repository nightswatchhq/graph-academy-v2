#!/usr/bin/env node
// Reconciles registry values that carry an `onchain_ref` against the network
// subgraph, and reports where they disagree.
//
// Deliberately inert without a gateway API key. A reconciliation job that
// silently returns "all fine" because it could not reach anything is worse than
// no job at all: it converts an unchecked registry into one that looks checked.
// So a missing key exits non-zero and says so.
import { paramEntries, c } from './lib.mjs';

const KEY = process.env.GRAPH_API_KEY;
const ENDPOINT = process.env.NETWORK_SUBGRAPH_URL;

const refs = paramEntries.filter(([, p]) => p.onchain_ref);

console.log(`${c.bold}on-chain reconciliation${c.reset}`);
console.log(`${c.dim}${refs.length} parameters carry an onchain_ref${c.reset}\n`);
for (const [key, p] of refs) {
  console.log(`  ${key.padEnd(34)} ${String(p.display).padEnd(16)} ${p.onchain_ref}`);
}

if (!KEY || !ENDPOINT) {
  console.log(
    `\n${c.yellow}skip${c.reset}  GRAPH_API_KEY and NETWORK_SUBGRAPH_URL are not both set, ` +
      `so nothing was read from chain.`,
  );
  console.log(
    `${c.dim}      This exits non-zero on purpose. A reconciliation that reports success ` +
      `without\n      reading anything is the failure it is meant to catch.${c.reset}`,
  );
  process.exit(2);
}

// The query shape depends on which subgraph is configured, so it is supplied
// rather than assumed. Set NETWORK_SUBGRAPH_QUERY to a GraphQL document whose
// response is a flat object keyed by registry parameter name.
const QUERY = process.env.NETWORK_SUBGRAPH_QUERY;
if (!QUERY) {
  console.log(`\n${c.red}fail${c.reset}  NETWORK_SUBGRAPH_QUERY is not set.`);
  process.exit(1);
}

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!res.ok) {
    console.log(`\n${c.red}fail${c.reset}  gateway returned ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  if (body.errors) {
    console.log(`\n${c.red}fail${c.reset}  ${JSON.stringify(body.errors)}`);
    process.exit(1);
  }
  const live = body.data ?? {};
  const drift = [];
  for (const [key, p] of refs) {
    if (!(key in live)) continue;
    if (String(live[key]) !== String(p.value)) {
      drift.push(`${key}: registry says ${p.value}, chain says ${live[key]}`);
    }
  }
  for (const d of drift) console.log(`${c.red}drift${c.reset} ${d}`);
  console.log(
    `\n${drift.length === 0 ? c.green + 'ok' + c.reset : c.red + 'fail' + c.reset}` +
      `    ${drift.length} parameters have drifted from chain`,
  );
  process.exit(drift.length > 0 ? 1 : 0);
} catch (err) {
  console.log(`\n${c.red}fail${c.reset}  ${err.message}`);
  process.exit(1);
}
