import { parse } from 'smol-toml';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type ParamStatus = 'current' | 'deprecated' | 'disputed';

export interface ParamChange {
  /** ISO date, or a year where only the release is established. */
  date: string;
  from: string;
  to: string;
  /** The GIP or release that made the change. */
  via: string;
  note?: string;
  source: string;
}

export interface Param {
  key: string;
  label: string;
  value: string | number | boolean;
  unit: string;
  display: string;
  status: ParamStatus;
  source: string;
  quote?: string;
  note?: string;
  note_source?: string;
  /** True only where official sources actually contradict each other. */
  conflict?: boolean;
  onchain_ref?: string;
  verified: string;
  history?: ParamChange[];
}

const registryPath = fileURLToPath(new URL('../../data/parameters.toml', import.meta.url));
const raw = parse(readFileSync(registryPath, 'utf8')) as Record<string, unknown>;

export const PROTOCOL_VERSION = String(raw.protocol_version ?? 'unversioned');

export const params: Record<string, Param> = Object.fromEntries(
  Object.entries(raw)
    .filter(([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v))
    .map(([key, v]) => [key, { key, ...(v as object) } as Param]),
);

/**
 * Look up a parameter. Throws at build time on a miss, which is the point:
 * a lesson that references a retired parameter should fail the build rather
 * than render an empty span.
 */
export function param(key: string): Param {
  const p = params[key];
  if (!p) {
    throw new Error(
      `Unknown protocol parameter "${key}". Known keys: ${Object.keys(params).join(', ')}`,
    );
  }
  return p;
}

/** Parameters older than `days`, oldest first. Drives the freshness report. */
export function staleParams(days = 90, today = new Date()): Param[] {
  const cutoff = today.getTime() - days * 86400_000;
  return Object.values(params)
    .filter((p) => new Date(p.verified).getTime() < cutoff)
    .sort((a, b) => a.verified.localeCompare(b.verified));
}

/**
 * Only parameters where official sources genuinely contradict each other. A note
 * alone is not a conflict: most notes are context, and reporting them as
 * disagreements would inflate the count and devalue the real ones.
 */
export function conflictedParams(): Param[] {
  return Object.values(params).filter((p) => p.conflict === true);
}

export const paramGroups: { title: string; keys: string[] }[] = [
  {
    title: 'Indexing',
    keys: [
      'min_indexer_self_stake',
      'max_delegation_ratio',
      'max_poi_staleness_days',
      'allocation_lifetime',
      'max_slash_pct',
      'recommended_slash_pct',
      'fisherman_dispute_deposit',
    ],
  },
  {
    title: 'Delegation',
    keys: [
      'undelegation_period_days',
      'delegation_tax_pct',
      'max_simultaneous_undelegations',
      'delegated_stake_slashable',
    ],
  },
  {
    title: 'Curation',
    keys: ['curation_tax_pct', 'l2_curation_curve', 'recommended_dev_signal'],
  },
  {
    title: 'Tokenomics',
    keys: ['annual_issuance_pct', 'initial_supply', 'query_fee_burn_pct', 'settlement_layer'],
  },
  {
    title: 'Query fee rebates',
    keys: ['rebate_lambda', 'rebate_alpha', 'cobb_douglas_burn_pct'],
  },
  {
    title: 'Issuance routing',
    keys: ['innovation_allocation_pct', 'subgraph_service_issuance_per_block'],
  },
  {
    title: 'Rewards eligibility',
    keys: [
      'reo_active_days_required',
      'reo_evaluation_window_days',
      'reo_eligibility_period_days',
      'reo_query_latency_ms',
      'reo_query_blocks_behind',
    ],
  },
];

/**
 * Every recorded parameter change, newest first. The registry knows what a value
 * is; this is the part no other source keeps. The documentation shows current
 * state and dashboards show live state, and neither remembers what the number
 * used to be or what moved it.
 */
export function parameterChanges(): (ParamChange & { key: string; label: string })[] {
  return Object.values(params)
    .flatMap((p) => (p.history ?? []).map((h) => ({ ...h, key: p.key, label: p.label })))
    .sort((a, b) => b.date.localeCompare(a.date));
}
