// Generates structured stock-detail content (bull/bear case, KPIs, risks,
// catalysts, description) for a single holding using Claude.
//
// Uses /api/generate (proxy) when VITE_USE_SERVER_KEY=true, otherwise calls
// the Anthropic SDK directly in the browser with the user-supplied key.

import Anthropic from '@anthropic-ai/sdk';
import type { HoldingRecord } from '../../features/holdings/types';

export interface GeneratedKPI {
  metric: string;
  target: string;
  current: string;
  status: 'on-track' | 'watch' | 'miss';
}

export interface GeneratedRisk {
  title: string;
  status: 'open' | 'monitoring' | 'resolved';
  body: string;
}

export interface GeneratedCatalyst {
  title: string;
  date: string;
  status: 'pending' | 'confirmed' | 'passed';
}

export interface GeneratedStockDetail {
  description: string;
  bullCase: string[];
  bearCase: string[];
  kpis: GeneratedKPI[];
  risks: GeneratedRisk[];
  catalysts: GeneratedCatalyst[];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial research assistant. Generate a structured analysis for a stock or asset position.
Return ONLY valid JSON — no markdown fences, no explanation, no text outside the JSON object.`;

function buildStockDetailPrompt(
  holding: HoldingRecord,
  currentPrice?: number,
  recentNews?: string[],
): string {
  const value = currentPrice
    ? holding.quantity * currentPrice
    : holding.currentValue;
  const pnl = value - holding.quantity * holding.costBasis;
  const pnlPct = holding.quantity * holding.costBasis > 0
    ? (pnl / (holding.quantity * holding.costBasis)) * 100
    : 0;

  const thesis = (holding.thesisBody ?? '').trim() || 'No thesis recorded.';

  return `Generate a detailed analysis for ${holding.symbol} (${holding.name}), a ${holding.type} in the ${holding.sector} sector.

Position details:
- Quantity: ${holding.quantity} units at avg cost $${holding.costBasis.toLocaleString()}
- Current value: $${value.toLocaleString()} (P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)
- Conviction: ${holding.conviction ?? 3}/5
- Risk level: ${holding.riskLevel}
- Investment thesis: ${thesis}
${recentNews && recentNews.length > 0 ? `
Recent news (use to ground your analysis in current context):
${recentNews.map((h) => `  • ${h}`).join('\n')}
` : ''}
Return a JSON object with EXACTLY this structure (no extra fields, no markdown):
{
  "description": "2–3 sentence description of what this company/asset does and its primary value driver",
  "bullCase": [
    "Specific bullish thesis point 1",
    "Specific bullish thesis point 2",
    "Specific bullish thesis point 3",
    "Specific bullish thesis point 4"
  ],
  "bearCase": [
    "Specific bearish risk or concern 1",
    "Specific bearish risk or concern 2",
    "Specific bearish risk or concern 3"
  ],
  "kpis": [
    { "metric": "Key metric name", "target": "Target value or threshold", "current": "Current or last reported value", "status": "on-track" },
    { "metric": "Key metric name", "target": "Target value or threshold", "current": "Current or last reported value", "status": "watch" },
    { "metric": "Key metric name", "target": "Target value or threshold", "current": "Current or last reported value", "status": "miss" }
  ],
  "risks": [
    { "title": "Risk title", "status": "open", "body": "1–2 sentence description of the risk and what to watch." },
    { "title": "Risk title", "status": "monitoring", "body": "1–2 sentence description of the risk and what to watch." }
  ],
  "catalysts": [
    { "title": "Upcoming event or catalyst", "date": "Quarter or month/year", "status": "pending" },
    { "title": "Upcoming event or catalyst", "date": "Quarter or month/year", "status": "confirmed" },
    { "title": "Past catalyst that already occurred", "date": "Past date or quarter", "status": "passed" }
  ]
}

Rules:
- kpis: 3–5 items, status must be exactly "on-track", "watch", or "miss"
- risks: 2–4 items, status must be exactly "open", "monitoring", or "resolved"
- catalysts: 2–4 items, status must be exactly "pending", "confirmed", or "passed"
- All values must be specific and grounded in what is known about this asset as of early 2026
- Use the investor's thesis above to tailor the bull/bear cases`;
}

// ── Transport helpers ─────────────────────────────────────────────────────────

async function generateViaProxy(prompt: string): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt: SYSTEM_PROMPT }),
  });

  if (!res.ok) {
    let msg = 'Proxy request failed';
    try {
      const body = await res.text();
      const parsed = JSON.parse(body) as Record<string, unknown>;
      msg = String(parsed.error ?? parsed.message ?? body);
    } catch { /* plain text captured above */ }
    throw new Error(msg);
  }

  const { text } = (await res.json()) as { text: string };
  return text;
}

async function generateDirectly(prompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = msg.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

// ── JSON parsing (tolerant) ───────────────────────────────────────────────────

function parseResponse(raw: string): GeneratedStockDetail {
  // Strip any accidental markdown fences
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error('Claude returned invalid JSON — please try again.');
  }

  const p = parsed as Record<string, unknown>;

  function asStrArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  }

  const kpiStatuses = new Set(['on-track', 'watch', 'miss']);
  const riskStatuses = new Set(['open', 'monitoring', 'resolved']);
  const catalystStatuses = new Set(['pending', 'confirmed', 'passed']);

  const kpis: GeneratedKPI[] = Array.isArray(p.kpis)
    ? (p.kpis as Record<string, unknown>[]).map((k) => ({
        metric:  String(k.metric  ?? ''),
        target:  String(k.target  ?? ''),
        current: String(k.current ?? ''),
        status:  kpiStatuses.has(String(k.status)) ? String(k.status) as GeneratedKPI['status'] : 'watch',
      }))
    : [];

  const risks: GeneratedRisk[] = Array.isArray(p.risks)
    ? (p.risks as Record<string, unknown>[]).map((r) => ({
        title:  String(r.title  ?? ''),
        status: riskStatuses.has(String(r.status)) ? String(r.status) as GeneratedRisk['status'] : 'open',
        body:   String(r.body   ?? ''),
      }))
    : [];

  const catalysts: GeneratedCatalyst[] = Array.isArray(p.catalysts)
    ? (p.catalysts as Record<string, unknown>[]).map((c) => ({
        title:  String(c.title  ?? ''),
        date:   String(c.date   ?? ''),
        status: catalystStatuses.has(String(c.status)) ? String(c.status) as GeneratedCatalyst['status'] : 'pending',
      }))
    : [];

  return {
    description: typeof p.description === 'string' ? p.description : '',
    bullCase:    asStrArray(p.bullCase),
    bearCase:    asStrArray(p.bearCase),
    kpis,
    risks,
    catalysts,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

export async function generateStockDetail(
  holding: HoldingRecord,
  opts: { apiKey?: string; currentPrice?: number; recentNews?: string[] } = {},
): Promise<GeneratedStockDetail> {
  const prompt = buildStockDetailPrompt(holding, opts.currentPrice, opts.recentNews);

  const raw = opts.apiKey
    ? await generateDirectly(prompt, opts.apiKey)
    : USE_SERVER_KEY
    ? await generateViaProxy(prompt)
    : (() => { throw new Error('No API key available. Add your Anthropic key in Settings.'); })();

  return parseResponse(raw);
}
