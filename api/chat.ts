import Anthropic from '@anthropic-ai/sdk';
import knowledge from './_knowledge.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Limits. Deliberately mean.
//
// Read this before loosening anything. Sonnet 5 is $2/1M in and $10/1M out. A
// request here costs roughly $0.01, so the daily cap below is the difference
// between a few dollars a month and an unbounded bill.
//
// These counters live in module scope, which means PER WARM INSTANCE. Vercel
// runs several, so the real global ceiling is higher than DAILY_GLOBAL by
// whatever the concurrency is. That is a backstop, not a guarantee. The only
// hard guarantee is the spend limit set on the API key in the Anthropic
// Console, and that is where the real protection belongs.
// ---------------------------------------------------------------------------
const MAX_INPUT_CHARS = 500;
const MAX_HISTORY_TURNS = 3;
const MAX_OUTPUT_TOKENS = 500;
const RETRIEVE_CHUNKS = 3;

const PER_IP_WINDOW_MS = 15 * 60 * 1000;
const PER_IP_PER_WINDOW = 5;
const PER_IP_PER_DAY = 20;
const DAILY_GLOBAL = Number(process.env.CHAT_DAILY_CAP ?? 150);

type Bucket = { window: number[]; day: number[] };
const ipBuckets = new Map<string, Bucket>();
let globalDay: number[] = [];

const DAY_MS = 24 * 60 * 60 * 1000;
const prune = (arr: number[], ms: number) => {
  const cut = Date.now() - ms;
  return arr.filter((t) => t > cut);
};

function rateLimit(ip: string): { ok: true } | { ok: false; reason: string; retryAfter: number } {
  globalDay = prune(globalDay, DAY_MS);
  if (globalDay.length >= DAILY_GLOBAL) {
    return {
      ok: false,
      retryAfter: 3600,
      reason:
        'This assistant has hit its daily budget. It is funded by one person, so the cap is deliberately low. Everything it knows is on the site itself, and the catalogue and search are always open.',
    };
  }

  const b = ipBuckets.get(ip) ?? { window: [], day: [] };
  b.window = prune(b.window, PER_IP_WINDOW_MS);
  b.day = prune(b.day, DAY_MS);

  if (b.window.length >= PER_IP_PER_WINDOW) {
    return { ok: false, retryAfter: 900, reason: 'Too many questions in a short window. Try again in fifteen minutes.' };
  }
  if (b.day.length >= PER_IP_PER_DAY) {
    return { ok: false, retryAfter: 3600, reason: 'That is the daily limit from one address. Try again tomorrow.' };
  }

  const now = Date.now();
  b.window.push(now);
  b.day.push(now);
  ipBuckets.set(ip, b);
  globalDay.push(now);

  // keep the map from growing without bound on a long-lived instance
  if (ipBuckets.size > 5000) {
    for (const [k, v] of ipBuckets) if (v.day.length === 0) ipBuckets.delete(k);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Retrieval. Keyword scoring, no embeddings: an embedding call per question
// would double the request count and the cost for a corpus this small.
// ---------------------------------------------------------------------------
const STOP = new Set(('a an the and or but if then than that this these those of in on at to for with from by as '
  + 'is are was were be been being it its you your we our they their i not no do does did have has had can could '
  + 'should would will may might must about into over under just so such only also more most other some any each '
  + 'which who what when where why how me my').split(' '));

const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9_\- ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

type Chunk = { kind: string; title: string; section: string; url: string; text: string; terms: string[]; date?: string | null };
const CHUNKS = knowledge.chunks as Chunk[];

const DF = new Map<string, number>();
for (const c of CHUNKS) for (const t of new Set(c.terms)) DF.set(t, (DF.get(t) ?? 0) + 1);
const N = CHUNKS.length;

function retrieve(query: string, k: number): Chunk[] {
  const q = tokenize(query);
  if (q.length === 0) return [];
  const scored = CHUNKS.map((c) => {
    const tf = new Map<string, number>();
    for (const t of c.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of new Set(q)) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + N / (1 + (DF.get(t) ?? 0)));
      score += idf * (f / (f + 1.2));
    }
    // an entry is maintained and dated; a dispatch is a snapshot. Prefer the
    // maintained thing when both match.
    if (c.kind === 'entry') score *= 1.15;
    return { c, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k).map((s) => s.c);
}

// ---------------------------------------------------------------------------
const SYSTEM_RULES = `You answer questions about The Graph protocol for The Graph Academy, a community-owned library at learn-thegraph.com.

How to answer:
- Ground every protocol claim in the SOURCES or the REGISTRY below. If they do not cover it, say you do not know and point at the catalogue. Never guess a number.
- Quote registry values exactly as given, and give the date they were read. A number without its date is not an answer here.
- Where the registry marks a parameter disputed, say the sources disagree and give both. Do not pick a winner.
- Link to the page an answer came from, as a relative path like /delegators/rewards-and-cuts/.
- Distinguish entries from dispatches. An entry is maintained and carries a re-verification date. A dispatch is dated writing left as written, so say when it was written.
- Be brief. Three short paragraphs at most, usually one. No bullet lists unless the answer is genuinely a list.
- Never give financial or investment advice. Explain mechanisms and let the reader decide.
- No em dashes. No exclamation marks. Plain declarative sentences.
- If asked something not about The Graph, say that is not what this library holds.`;

function registryBlock(): string {
  return (knowledge.registry as any[])
    .map((p) => `${p.label} (${p.key}) = ${p.value} [${p.status}, read ${p.verified}]${p.note ? ` NOTE: ${p.note}` : ''}`)
    .join('\n');
}

function indexBlock(): string {
  return (knowledge.index as any[]).map((p) => `${p.url} ${p.title} (${p.kind})`).join('\n');
}

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'The assistant is not configured.' }, 503);
  }
  if (process.env.CHAT_ENABLED === 'false') {
    return json({ error: 'The assistant is switched off. The catalogue and search are unaffected.' }, 503);
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'Ask something.' }, 400);
  if (message.length > MAX_INPUT_CHARS) {
    return json({ error: `Questions are capped at ${MAX_INPUT_CHARS} characters.` }, 400);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const limit = rateLimit(ip);
  if (!limit.ok) {
    return json({ error: limit.reason }, 429, { 'retry-after': String(limit.retryAfter) });
  }

  const history = Array.isArray(body.history)
    ? (body.history as { role: string; content: string }[])
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 1500) }))
    : [];

  const hits = retrieve(`${history.slice(-2).map((h) => h.content).join(' ')} ${message}`, RETRIEVE_CHUNKS);
  const sources = hits.length
    ? hits
        .map(
          (h) =>
            `--- ${h.kind === 'entry' ? 'ENTRY' : `DISPATCH written ${h.date ?? 'undated'}`}: ${h.title} / ${h.section}\nurl: ${h.url}\n${h.text}`,
        )
        .join('\n\n')
    : 'No section of the library matched this question closely.';

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: MAX_OUTPUT_TOKENS,
      // Thinking off and effort low: this is retrieval-grounded question
      // answering, not reasoning work, and both cost output tokens.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: `${SYSTEM_RULES}\n\nREGISTRY (every protocol number this library holds, with the date somebody read the source):\n${registryBlock()}\n\nINDEX (every page, so you can point at one you were not given):\n${indexBlock()}`,
          // The rules, registry and index are identical on every request, so
          // they cache. This is the single biggest cost lever here.
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      messages: [
        ...history,
        { role: 'user', content: `SOURCES retrieved for this question:\n\n${sources}\n\n---\n\nQuestion: ${message}` },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const u = response.usage;
    const cost =
      ((u.input_tokens ?? 0) * 2 +
        (u.cache_creation_input_tokens ?? 0) * 2.5 +
        (u.cache_read_input_tokens ?? 0) * 0.2 +
        (u.output_tokens ?? 0) * 10) /
      1e6;

    return json({
      reply: text,
      sources: hits.map((h) => ({ title: h.title, url: h.url, kind: h.kind })),
      usage: { costUsd: Number(cost.toFixed(5)), cachedInput: u.cache_read_input_tokens ?? 0 },
      remainingToday: Math.max(0, DAILY_GLOBAL - globalDay.length),
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'The model is rate limited. Try again shortly.' }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return json({ error: 'The assistant is misconfigured.' }, 503);
    }
    console.error('chat error', err instanceof Error ? err.message : err);
    return json({ error: 'Something went wrong answering that.' }, 502);
  }
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });
}
