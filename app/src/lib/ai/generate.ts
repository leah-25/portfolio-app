import Anthropic from '@anthropic-ai/sdk';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

// ── Goal context ──────────────────────────────────────────────────────────────

export interface GoalContext {
  multiple:       number;   // e.g. 10
  year:           number;   // e.g. 2030
  yearsRemaining: number;
  label:          string;   // e.g. "10× by 2030 (4.8 years remaining)"
  runwayNote:     string | null;  // non-null when runway is short
}

export function buildGoalContext(multiple: number, year: number): GoalContext {
  const now    = new Date();
  const target = new Date(year, 11, 31); // Dec 31 of target year
  const yearsRemaining = Math.max(
    0,
    (target.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000),
  );
  const label = `${multiple}× by ${year} (${yearsRemaining.toFixed(1)} years remaining)`;

  let runwayNote: string | null = null;
  if (yearsRemaining < 1) {
    runwayNote =
      `CRITICAL: under 1 year remaining. Only hold positions with imminent, confirmed catalysts. ` +
      `Exit speculative long-duration bets immediately.`;
  } else if (yearsRemaining < 2) {
    runwayNote =
      `SHORT RUNWAY (${yearsRemaining.toFixed(1)} yrs): shift decisively toward positions with ` +
      `confirmed near-term catalysts. Trim or exit early-stage names that need 3+ years to mature.`;
  } else if (yearsRemaining < 3) {
    runwayNote =
      `MODERATE RUNWAY (${yearsRemaining.toFixed(1)} yrs): balance aggressive bets with positions ` +
      `that have near-term catalysts. Reduce deep-speculative exposure.`;
  }

  return { multiple, year, yearsRemaining, label, runwayNote };
}

// ── News context ──────────────────────────────────────────────────────────────

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
      let message = `Request failed (HTTP ${res.status})`;
      try {
        const text = await res.text();
        try { message = (JSON.parse(text) as { error?: string }).error ?? (text || message); }
        catch { message = text || message; }
      } catch { /* ignore read errors */ }
      throw new Error(message);
    }
    const data = await res.json() as { text: string };
    return data.text;
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });
  const content = msg.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

function parseJSON<T>(text: string): T {
  // Strip markdown code fences if Claude wraps the JSON
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  // Try to extract the outermost JSON object or array, tolerating any
  // preamble / postamble text Claude might add despite the system prompt.
  const firstObj     = stripped.indexOf('{');
  const firstArr     = stripped.indexOf('[');
  const lastObj      = stripped.lastIndexOf('}');
  const lastArr      = stripped.lastIndexOf(']');

  const objValid = firstObj !== -1 && lastObj > firstObj;
  const arrValid = firstArr !== -1 && lastArr > firstArr;

  let cleaned = stripped;
  if (arrValid && (!objValid || firstArr < firstObj)) {
    cleaned = stripped.slice(firstArr, lastArr + 1);
  } else if (objValid) {
    cleaned = stripped.slice(firstObj, lastObj + 1);
  }

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
  goal: GoalContext = buildGoalContext(10, 2030),
): Promise<GeneratedThesis> {
  const systemPrompt =
    `You are a professional investment analyst building an aggressive growth portfolio with a ` +
    `${goal.label} goal. Write concise, high-signal investment theses evaluated against that target. ` +
    `Respond with valid JSON only — no markdown, no explanation outside the JSON object.`;

  const prompt =
    `Write an investment thesis for:\n` +
    `Symbol: ${holding.symbol}\n` +
    `Name: ${holding.name}\n` +
    `Type: ${holding.type}\n` +
    `Sector: ${holding.sector}\n` +
    `Portfolio weight: ${holding.weight.toFixed(1)}%\n\n` +
    `The thesis must directly address whether this position has a credible path to ${goal.multiple}× ` +
    `by ${goal.year} (${goal.yearsRemaining.toFixed(1)} years from now). ` +
    `If the ${goal.multiple}× case is weak, say so clearly and suggest an appropriate conviction score.\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "thesisBody": "3-4 sentences: core bull case for ${goal.multiple}×, competitive moat, key catalyst, and main risk",\n` +
    `  "conviction": <integer 1–5 where 1=weak ${goal.multiple}× case, 3=plausible, 5=highest conviction>\n` +
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
  goal: GoalContext = buildGoalContext(10, 2030),
): Promise<GeneratedNote> {
  const systemPrompt =
    `You are a portfolio manager writing investment research notes for an aggressive growth portfolio ` +
    `targeting ${goal.label}. ` +
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
    `Goal: ${goal.label}\n` +
    `Portfolio: ${summary}\n\n` +
    (goal.runwayNote ? `⚠️ ${goal.runwayNote}\n\n` : '') +
    `Return JSON:\n` +
    `{\n` +
    `  "period": "${defaultPeriod}",\n` +
    `  "title": "concise title for this note",\n` +
    `  "body": "3–4 paragraph research note: progress toward ${goal.multiple}× goal, key observations, thesis updates, risks on the radar, forward outlook",\n` +
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
  goal: GoalContext = buildGoalContext(10, 2030),
): Promise<GeneratedRiskEntry[]> {
  const systemPrompt =
    `You are a portfolio risk analyst for an aggressive growth portfolio targeting ${goal.label}. ` +
    'Identify material risks and upcoming catalysts. ' +
    'Respond with valid JSON only — no markdown, no explanation outside the JSON array.';

  const lines = holdings
    .map((h) => `${h.symbol} — ${h.name} (${h.sector}, ${h.weight.toFixed(1)}%)`)
    .join('\n');

  const prompt =
    `Identify 2–3 key risks and 2–3 key catalysts for this portfolio (goal: ${goal.label}):\n${lines}\n\n` +
    (goal.runwayNote ? `⚠️ ${goal.runwayNote}\n\n` : '') +
    `Prioritise risks and catalysts that are most relevant to achieving the ${goal.multiple}× goal ` +
    `within the remaining timeframe.\n\n` +
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
  goal: GoalContext = buildGoalContext(10, 2030),
): Promise<GeneratedTargetAllocation[]> {
  const systemPrompt =
    `You are a portfolio manager building an aggressive growth portfolio targeting ${goal.label}. ` +
    'The investor accepts high volatility and concentrated risk in exchange for asymmetric upside. ' +
    'Targets must sum to exactly 100. ' +
    `Overweight high-conviction positions with a credible ${goal.multiple}× path even if risk is rated high. ` +
    'Underweight or trim positions with thesis drift, low conviction, or limited upside. ' +
    '\n\nCRITICAL RULES:\n' +
    `1. VALUATION CEILING TEST: Calculate each position's current market cap × ${goal.multiple}. If the result exceeds the total addressable market (TAM) of that industry by 2030, cap the target weight at 5% maximum — the ${goal.multiple}× math doesn't work for mega-caps.\n` +
    `2. SMALL-CAP ADVANTAGE: Positions with market cap under $5B have the easiest path to ${goal.multiple}× (smaller base). When conviction scores are equal, allocate MORE to smaller market cap names, not less.\n` +
    '3. CASH RESERVE: Reserve 5-10% as cash (do NOT allocate to holdings). Targets for holdings should sum to 90-95, not 100. The remaining 5-10% is dry powder for drawdown buying opportunities.\n' +
    '4. MEAN REVERSION OPPORTUNITY: Positions that are down >30% from their 52-week high BUT still have intact thesis (no drift flag) should be INCREASED in target weight, not decreased. Falling price with intact thesis = better entry point = higher asymmetric reward.\n' +
    '5. SINGLE POSITION CAP: No single position should exceed 25% target weight to limit concentration risk.\n' +
    '6. SECTOR CAP: Total exposure to any single sector should not exceed 50%.\n' +
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
    `Set target weights for this aggressive growth portfolio (goal: ${goal.label}):\n${lines}\n\n` +
    (newsBlock ? `${newsBlock}\n\n` : '') +
    (goal.runwayNote ? `⚠️ ${goal.runwayNote}\n\n` : '') +
    `Rules:\n` +
    `- Targets for holdings should sum to 90-95 (reserve 5-10% as cash).\n` +
    `- Prioritise positions with the highest potential for ${goal.multiple}× upside by ${goal.year}.\n` +
    `- High conviction (4–5/5) = earn a large allocation (15-25%) if the ${goal.multiple}× case is credible.\n` +
    `- No single position above 25% target weight.\n` +
    `- Thesis drift positions should be reduced or trimmed — they are no longer trusted.\n` +
    `- Risk level alone is NOT a reason to reduce weight; upside potential is the primary driver.\n` +
    `- IMPORTANT: A position that has fallen significantly in price but has NO thesis drift is a BUYING opportunity, not a sell signal. Increase its target weight.\n` +
    `- Smaller market cap = easier ${goal.multiple}× math. Favor smaller names when conviction is similar.\n` +
    `- Factor in recent news when assessing momentum and near-term risk to each position.\n` +
    `- Keep targets in clean 1% increments.\n\n` +
    `Return a JSON array (one entry per holding, plus one entry for CASH):\n` +
    `[\n` +
    `  { "symbol": "RKLB", "targetWeight": 20, "rationale": "one sentence tying weight to ${goal.multiple}× thesis" },\n` +
    `  { "symbol": "CASH", "targetWeight": 10, "rationale": "dry powder for drawdown opportunities" }\n` +
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
  thesisBody?: string;
  riskLevel?: string;
  sector?: string;
}

export async function generateRebalanceSuggestion(
  rows: RebalanceRow[],
  apiKey?: string,
  newsContext?: Record<string, string[]>,
  goal: GoalContext = buildGoalContext(10, 2030),
): Promise<GeneratedRebalance> {
  const systemPrompt =
    `You are a disciplined portfolio manager running an aggressive growth portfolio with a ${goal.label} goal. ` +
    'Suggest specific rebalance trades that move the portfolio closer to its target weights and strengthen ' +
    `the ${goal.multiple}× thesis — prioritising the highest-upside positions. ` +
    '\n\nKEY PRINCIPLES:\n' +
    '- NEVER sell a winning position just because it exceeded target weight by a small margin (<5%). Winners run.\n' +
    '- Only trim winners when they exceed target by >10% AND there is a better asymmetric opportunity to fund.\n' +
    '- Positions down >30% with NO thesis drift = ADD, not trim. Price decline ≠ thesis failure.\n' +
    '- Macro-driven selloffs (market-wide fear) are NOT a reason to sell individual positions. Only company-specific thesis breaks justify exits.\n' +
    '- Maximum capital moved in any single rebalance = 10% of portfolio. Avoid large sudden shifts.\n' +
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
      if (r.thesisBody)         parts.push(`\n  thesis: "${r.thesisBody.slice(0, 150)}${r.thesisBody.length > 150 ? '…' : ''}"`);
      return parts.join(' ');
    })
    .join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const newsBlock = formatNewsBlock(newsContext);

  const prompt =
    `Portfolio rebalance analysis as of ${today} (goal: ${goal.label}):\n${table}\n\n` +
    (newsBlock ? `${newsBlock}\n\n` : '') +
    (goal.runwayNote ? `⚠️ ${goal.runwayNote}\n\n` : '') +
    `Suggest specific rebalance trades. Priorities in order:\n` +
    `1. Add to high-conviction positions below target whose thesis supports a credible ${goal.multiple}× path.\n` +
    `2. Trim positions above target to free up capital — but do NOT trim below target for strong ${goal.multiple}× names.\n` +
    `3. Reduce or exit thesis-drift positions — capital is better deployed in the core ${goal.multiple}× bets.\n` +
    `4. Factor in recent news — a negative catalyst may warrant extra caution; a strong catalyst may justify adding sooner.\n` +
    `5. Consider tax efficiency for trims (higher unrealised P&L = larger tax event).\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "action": "one-line summary of specific trades e.g. \\"Trim IREN (+4%→target), add RKLB (-3%→target)\\"",\n` +
    `  "rationale": "2–3 sentences tying the trades to the ${goal.multiple}× goal, current drift, and any relevant recent news"\n` +
    `}`;

  const text = await callClaude(prompt, systemPrompt, apiKey);
  return parseJSON<GeneratedRebalance>(text);
}
