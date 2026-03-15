import Anthropic from '@anthropic-ai/sdk';
import type { HoldingRecord } from '../../features/holdings/types';
import type { Quote } from '../marketData';

export interface AnalysisOptions {
  apiKey: string;
  holdings: HoldingRecord[];
  quotes: Record<string, Quote>;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

// ── Cache key ────────────────────────────────────────────────────────────────
// Derived only from portfolio structure (not live prices) so the cache
// survives minor price ticks but invalidates on any real portfolio change.
export function buildCacheKey(holdings: HoldingRecord[]): string {
  return holdings
    .slice()
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(h =>
      [h.symbol, h.quantity, h.costBasis, h.thesisDrift ? 1 : 0,
       h.riskLevel, h.conviction ?? 0, h.lots.length,
       (h.thesisBody ?? '').slice(0, 80)].join(':')
    )
    .join('|');
}

function buildPrompt(holdings: HoldingRecord[], quotes: Record<string, Quote>): string {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost  = holdings.reduce((sum, h) => sum + h.costBasis * h.quantity, 0);
  const totalPnl   = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const driftCount = holdings.filter(h => h.thesisDrift).length;

  // ── Sector breakdown ────────────────────────────────────────────────────────
  const sectorMap: Record<string, { value: number; cost: number; count: number }> = {};
  for (const h of holdings) {
    const sector = h.sector || 'Unknown';
    if (!sectorMap[sector]) sectorMap[sector] = { value: 0, cost: 0, count: 0 };
    sectorMap[sector].value += h.currentValue;
    sectorMap[sector].cost  += h.costBasis * h.quantity;
    sectorMap[sector].count += 1;
  }
  const sectorLines = Object.entries(sectorMap)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([sector, d]) => {
      const pct  = totalValue > 0 ? (d.value / totalValue) * 100 : 0;
      const pnl  = d.value - d.cost;
      const pnlPct = d.cost > 0 ? (pnl / d.cost) * 100 : 0;
      return `  ${sector.padEnd(24)} ${pct.toFixed(1).padStart(5)}%  ${d.count} pos  P&L: ${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`;
    })
    .join('\n');

  // ── Risk & drift summary ────────────────────────────────────────────────────
  const driftHoldings   = holdings.filter(h => h.thesisDrift);
  const highRisk        = holdings.filter(h => h.riskLevel === 'high' && !h.thesisDrift);
  const lowConviction   = holdings.filter(h => (h.conviction ?? 3) <= 2 && !h.thesisDrift);

  const riskLines: string[] = [];
  if (driftHoldings.length) {
    riskLines.push('⚠ THESIS DRIFT (urgent review required):');
    driftHoldings.forEach(h => riskLines.push(`  • ${h.symbol} (${h.name}) — conviction ${h.conviction ?? '?'}/5, risk ${h.riskLevel}`));
  }
  if (highRisk.length) {
    riskLines.push('🔴 HIGH RISK positions:');
    highRisk.forEach(h => riskLines.push(`  • ${h.symbol} — conviction ${h.conviction ?? '?'}/5, weight ${h.weight.toFixed(1)}%`));
  }
  if (lowConviction.length) {
    riskLines.push('🟡 LOW CONVICTION positions (≤2/5):');
    lowConviction.forEach(h => riskLines.push(`  • ${h.symbol} — conviction ${h.conviction ?? '?'}/5, weight ${h.weight.toFixed(1)}%`));
  }
  const riskSection = riskLines.length ? riskLines.join('\n') : '  None flagged.';

  // ── Holdings detail (with lot history) ─────────────────────────────────────
  const holdingLines = holdings.map(h => {
    const q = quotes[h.symbol];
    const livePrice = q
      ? `$${q.price.toFixed(2)} (today: ${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
      : 'price N/A';
    const conviction = h.conviction ?? 'unrated';
    const drift = h.thesisDrift ? ' ⚠ THESIS DRIFT' : '';

    // Keep only the 3 most recent lots to limit prompt size
    const recentLots = (h.lots ?? []).slice(-3);
    const lotLines = recentLots.length > 0
      ? '\n    Lots (recent 3): ' +
        recentLots.map(l => `${l.date} ${l.quantity}×$${l.price.toLocaleString()}`).join(', ')
      : '';

    // Truncate thesis to 200 chars to keep prompt compact
    const thesis = (h.thesisBody ?? '').slice(0, 200) || 'None.';

    return [
      `  • ${h.symbol} (${h.name}) — ${h.type.toUpperCase()}, ${h.sector}`,
      `    Weight: ${h.weight.toFixed(1)}% | Target: ${h.targetWeight != null ? h.targetWeight + '%' : 'none'}`,
      `    Qty: ${h.quantity} | Cost: $${h.costBasis.toLocaleString()} | Live: ${livePrice}`,
      `    P&L: ${h.pnl >= 0 ? '+' : ''}$${h.pnl.toLocaleString()} (${h.pnlPct >= 0 ? '+' : ''}${h.pnlPct.toFixed(1)}%)`,
      `    Conviction: ${conviction}/5 | Risk: ${h.riskLevel}${drift}`,
      `    Thesis: ${thesis}`,
      lotLines,
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return `You are a senior portfolio analyst reviewing a personal investment portfolio. The investor's goal is a 10× return by 2030.

## Portfolio Summary
- Total value: $${totalValue.toLocaleString()}
- Total cost basis: $${totalCost.toLocaleString()}
- Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(1)}%)
- Holdings: ${holdings.length} positions
- Thesis drift alerts: ${driftCount}

## Sector Breakdown
${sectorLines || '  No sector data.'}

## Risk & Drift Summary
${riskSection}

## Holdings Detail
${holdingLines}

## Analysis Request
Please provide a concise, high-signal portfolio analysis covering:

1. **Overall Assessment** — Is this portfolio well-positioned for the 2030 10× goal? Key strengths and concerns.
2. **Concentration & Diversification** — Comment on position sizing, sector exposure, and any over/under-weight risks.
3. **Thesis Drift Warnings** — For positions flagged with thesis drift, assess urgency and recommended action.
4. **Top Opportunities** — 2–3 specific actions (trim, add, or exit) backed by the thesis data.
5. **Risk Snapshot** — Macro or sector-level risks the portfolio should watch in the next 12 months.

Be direct, data-driven, and actionable. Use the conviction ratings, lot history, and thesis bodies to inform your recommendations.`;
}

export async function analyzePortfolio(opts: AnalysisOptions): Promise<void> {
  const { apiKey, holdings, quotes, onChunk, signal } = opts;

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stream = client.messages.stream(
    {
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      messages: [
        { role: 'user', content: buildPrompt(holdings, quotes) },
      ],
    },
    { signal },
  );

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text);
    }
  }

  await stream.finalMessage();
}
