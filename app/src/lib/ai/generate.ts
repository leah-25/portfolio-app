import Anthropic from '@anthropic-ai/sdk';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

// ── Core caller ───────────────────────────────────────────────────────────────

async function callClaude(
  prompt: string,
  systemPrompt: string,
  apiKey?: string,
): Promise<string> {
  if (USE_SERVER_KEY || !apiKey) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt }),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? `Request failed (HTTP ${res.status})`);
    }
    const data = await res.json() as { text: string };
    return data.text;
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });
  const content = msg.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

function parseJSON<T>(text: string): T {
  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

// ── Thesis ────────────────────────────────────────────────────────────────────

export interface GeneratedThesis {
  thesisBody: string;
  conviction: 1 | 2 | 3 | 4 | 5;
}

export async function generateThesis(
  holding: { symbol: string; name: string; type: string; sector: string; weight: number },
  apiKey?: string,
): Promise<GeneratedThesis> {
  const systemPrompt =
    'You are a professional investment analyst. Write concise, high-signal investment theses. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON object.';

  const prompt =
    `Write an investment thesis for:\n` +
    `Symbol: ${holding.symbol}\n` +
    `Name: ${holding.name}\n` +
    `Type: ${holding.type}\n` +
    `Sector: ${holding.sector}\n` +
    `Portfolio weight: ${holding.weight.toFixed(1)}%\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "thesisBody": "3-4 sentences covering the core bull case, competitive moat, key catalyst, and main risk",\n` +
    `  "conviction": <integer 1–5 where 1=tentative, 3=moderate, 5=highest conviction>\n` +
    `}`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedThesis>(text);
}

// ── Research Note ─────────────────────────────────────────────────────────────

export interface GeneratedNote {
  period: string;
  title: string;
  body: string;
  tags: string[];
}

export async function generateNote(
  holdings: Array<{ symbol: string; weight: number; thesisDrift: boolean }>,
  type: 'weekly' | 'quarterly',
  apiKey?: string,
): Promise<GeneratedNote> {
  const systemPrompt =
    'You are a portfolio manager writing investment research notes. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON object.';

  const summary = holdings
    .map((h) => `${h.symbol} (${h.weight.toFixed(1)}%${h.thesisDrift ? ', drift' : ''})`)
    .join(', ');

  const now = new Date();
  const weekNum = Math.ceil(
    (now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7,
  );
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const year = now.getFullYear();
  const defaultPeriod = type === 'weekly' ? `Week ${weekNum} · ${year}` : `${quarter} ${year}`;
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt =
    `Write a ${type} portfolio research note.\n` +
    `Date: ${dateStr}\n` +
    `Portfolio: ${summary}\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "period": "${defaultPeriod}",\n` +
    `  "title": "concise title for this note",\n` +
    `  "body": "3–4 paragraph research note: key observations, thesis updates, risks on the radar, forward outlook",\n` +
    `  "tags": ["3–5 relevant ticker symbols or themes"]\n` +
    `}`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedNote>(text);
}

// ── Risk & Catalysts ──────────────────────────────────────────────────────────

export interface GeneratedRiskEntry {
  kind: 'risk' | 'catalyst';
  holding: string | null;
  title: string;
  body: string;
  status: 'open' | 'monitoring' | 'resolved';
  expectedDate?: string;
}

export async function generateRiskEntries(
  holdings: Array<{ symbol: string; name: string; sector: string; weight: number }>,
  apiKey?: string,
): Promise<GeneratedRiskEntry[]> {
  const systemPrompt =
    'You are a portfolio risk analyst. Identify material risks and upcoming catalysts. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON array.';

  const lines = holdings
    .map((h) => `${h.symbol} — ${h.name} (${h.sector}, ${h.weight.toFixed(1)}%)`)
    .join('\n');

  const prompt =
    `Identify 2–3 key risks and 2–3 key catalysts for this portfolio:\n${lines}\n\n` +
    `Return a JSON array:\n` +
    `[\n` +
    `  {\n` +
    `    "kind": "risk" | "catalyst",\n` +
    `    "holding": "SYMBOL or null for portfolio-wide risk",\n` +
    `    "title": "short descriptive title",\n` +
    `    "body": "2–3 sentence explanation",\n` +
    `    "status": "open" | "monitoring" | "resolved",\n` +
    `    "expectedDate": "optional, e.g. Q3 2026 — only for catalysts"\n` +
    `  }\n` +
    `]`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedRiskEntry[]>(text);
}

// ── Target Allocation ─────────────────────────────────────────────────────────

export interface GeneratedTargetAllocation {
  symbol: string;
  targetWeight: number;   // 0–100, all entries sum to ~100
  rationale: string;      // one-sentence justification
}

export async function generateTargetAllocations(
  holdings: Array<{
    symbol: string;
    name: string;
    type: string;
    sector: string;
    weight: number;       // current actual weight
    pnlPct: number;
    conviction: number | null;
    thesisDrift: boolean;
    riskLevel: string;
  }>,
  apiKey?: string,
): Promise<GeneratedTargetAllocation[]> {
  const systemPrompt =
    'You are a portfolio manager setting disciplined target allocations. ' +
    'Targets must sum to exactly 100. Weight higher-conviction, lower-risk positions more. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON array.';

  const lines = holdings
    .map(
      (h) =>
        `${h.symbol} (${h.name}): current ${h.weight.toFixed(1)}%, ` +
        `conviction ${h.conviction ?? 'none'}/5, P&L ${h.pnlPct > 0 ? '+' : ''}${h.pnlPct.toFixed(1)}%, ` +
        `risk=${h.riskLevel}${h.thesisDrift ? ', THESIS DRIFT' : ''}, ${h.type}, ${h.sector}`,
    )
    .join('\n');

  const prompt =
    `Set target weights for this portfolio:\n${lines}\n\n` +
    `Rules: targets must sum to 100. Favour high-conviction, low-risk positions. ` +
    `Reduce weight on thesis-drifted holdings. Keep targets in clean 5% increments where possible.\n\n` +
    `Return a JSON array (one entry per holding):\n` +
    `[\n` +
    `  { "symbol": "NVDA", "targetWeight": 25, "rationale": "one sentence" }\n` +
    `]`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedTargetAllocation[]>(text);
}

// ── Rebalance ─────────────────────────────────────────────────────────────────

export interface GeneratedRebalance {
  action: string;
  rationale: string;
}

export interface RebalanceRow {
  symbol: string;
  target: number;
  actual: number;
  delta: number;
  // enriched context
  pnlPct?: number;
  conviction?: number | null;
  thesisDrift?: boolean;
  riskLevel?: string;
  sector?: string;
}

export async function generateRebalanceSuggestion(
  rows: RebalanceRow[],
  apiKey?: string,
): Promise<GeneratedRebalance> {
  const systemPrompt =
    'You are a disciplined portfolio manager. Suggest specific rebalance trades taking into account ' +
    'allocation drift, conviction, thesis integrity, unrealised gains/losses, and risk level. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON object.';

  const table = rows
    .map((r) => {
      const parts = [
        `${r.symbol}:`,
        `target ${r.target}%,`,
        `actual ${r.actual.toFixed(1)}%,`,
        `drift ${r.delta > 0 ? '+' : ''}${r.delta.toFixed(1)}%`,
      ];
      if (r.pnlPct != null)   parts.push(`P&L ${r.pnlPct > 0 ? '+' : ''}${r.pnlPct.toFixed(1)}%`);
      if (r.conviction != null) parts.push(`conviction ${r.conviction}/5`);
      if (r.thesisDrift)      parts.push('THESIS DRIFT');
      if (r.riskLevel)        parts.push(`risk=${r.riskLevel}`);
      if (r.sector)           parts.push(`(${r.sector})`);
      return parts.join(' ');
    })
    .join('\n');

  const today = new Date().toISOString().slice(0, 10);

  const prompt =
    `Portfolio analysis as of ${today}:\n${table}\n\n` +
    `Suggest specific rebalance trades. Prioritise reducing drift on high-conviction holdings, ` +
    `trimming positions with thesis drift, and consider tax efficiency (higher P&L = bigger tax hit on trim).\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "action": "one-line summary of trades e.g. \\"Trimmed NVDA (+3%→0%), added MSFT (-3%→0%)\\"",\n` +
    `  "rationale": "2–3 sentences explaining the rationale"\n` +
    `}`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedRebalance>(text);
}
