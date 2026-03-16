import Anthropic from '@anthropic-ai/sdk';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

// Format a news context map (symbol → headline strings) into a prompt block.
function formatNewsBlock(news?: Record<string, string[]>): string {
  if (!news) return '';
  const symbols = Object.keys(news).filter((s) => (news[s]?.length ?? 0) > 0);
  if (symbols.length === 0) return '';
  const lines = ['Recent news context (use to inform your analysis):'];
  for (const sym of symbols) {
    lines.push(`${sym}:`);
    news[sym].forEach((h) => lines.push(`  • ${h}`));
  }
  return lines.join('\n');
}

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
  newsContext?: Record<string, string[]>,
): Promise<GeneratedTargetAllocation[]> {
  const systemPrompt =
    'You are a portfolio manager building an aggressive growth portfolio targeting 10× returns by 2030. ' +
    'The investor accepts high volatility and concentrated risk in exchange for asymmetric upside. ' +
    'Targets must sum to exactly 100. ' +
    'Overweight high-conviction, high-upside positions even if risk is rated high. ' +
    'Underweight or trim positions with thesis drift, low conviction, or limited upside to 10×. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON array.';

  const lines = holdings
    .map(
      (h) =>
        `${h.symbol} (${h.name}): current ${h.weight.toFixed(1)}%, ` +
        `conviction ${h.conviction ?? 'none'}/5, P&L ${h.pnlPct > 0 ? '+' : ''}${h.pnlPct.toFixed(1)}%, ` +
        `risk=${h.riskLevel}${h.thesisDrift ? ', THESIS DRIFT' : ''}, ${h.type}, ${h.sector}`,
    )
    .join('\n');

  const newsBlock = formatNewsBlock(newsContext);

  const prompt =
    `Set target weights for this aggressive growth portfolio (goal: 10× by 2030):\n${lines}\n\n` +
    (newsBlock ? `${newsBlock}\n\n` : '') +
    `Rules:\n` +
    `- Targets must sum to 100.\n` +
    `- Prioritise positions with the highest potential for 10× upside by 2030.\n` +
    `- High conviction (4–5/5) = earn a large allocation (20%+) if the 10× case is credible.\n` +
    `- Thesis drift positions should be reduced or trimmed — they are no longer trusted.\n` +
    `- Risk level alone is NOT a reason to reduce weight; upside potential is the primary driver.\n` +
    `- Factor in recent news when assessing momentum and near-term risk to each position.\n` +
    `- Keep targets in clean 1% increments.\n\n` +
    `Return a JSON array (one entry per holding):\n` +
    `[\n` +
    `  { "symbol": "RKLB", "targetWeight": 20, "rationale": "one sentence tying weight to 10× thesis" }\n` +
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
  newsContext?: Record<string, string[]>,
): Promise<GeneratedRebalance> {
  const systemPrompt =
    'You are a disciplined portfolio manager running an aggressive growth portfolio with a 10× by 2030 goal. ' +
    'Suggest specific rebalance trades that move the portfolio closer to its target weights and strengthen ' +
    'the 10× thesis — prioritising the highest-upside positions. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON object.';

  const table = rows
    .map((r) => {
      const parts = [
        `${r.symbol}:`,
        `target ${r.target}%,`,
        `actual ${r.actual.toFixed(1)}%,`,
        `drift ${r.delta > 0 ? '+' : ''}${r.delta.toFixed(1)}%`,
      ];
      if (r.pnlPct != null)     parts.push(`P&L ${r.pnlPct > 0 ? '+' : ''}${r.pnlPct.toFixed(1)}%`);
      if (r.conviction != null) parts.push(`conviction ${r.conviction}/5`);
      if (r.thesisDrift)        parts.push('THESIS DRIFT');
      if (r.riskLevel)          parts.push(`risk=${r.riskLevel}`);
      if (r.sector)             parts.push(`(${r.sector})`);
      return parts.join(' ');
    })
    .join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const newsBlock = formatNewsBlock(newsContext);

  const prompt =
    `Portfolio rebalance analysis as of ${today} (goal: 10× by 2030):\n${table}\n\n` +
    (newsBlock ? `${newsBlock}\n\n` : '') +
    `Suggest specific rebalance trades. Priorities in order:\n` +
    `1. Trim positions that are above target — free up capital for underweights.\n` +
    `2. Add to high-conviction positions that are below target — these are the 10× bets.\n` +
    `3. Reduce or exit any thesis-drift positions — capital is better deployed elsewhere.\n` +
    `4. Factor in recent news — a negative catalyst may warrant extra caution on a trim; a strong catalyst may justify adding sooner.\n` +
    `5. Consider tax efficiency for trims (higher unrealised P&L = larger tax event).\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "action": "one-line summary of specific trades e.g. \\"Trim IREN (+4%→target), add RKLB (-3%→target)\\"",\n` +
    `  "rationale": "2–3 sentences tying the trades to the 10× goal, current drift, and any relevant recent news"\n` +
    `}`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedRebalance>(text);
}
