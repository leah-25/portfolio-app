// Pure prompt builder — no browser APIs, importable by both client and Vite middleware.

export interface PromptHolding {
  symbol: string;
  name: string;
  type: string;
  sector: string;
  weight: number;
  targetWeight: number | null;
  quantity: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
  conviction: number | null;
  riskLevel: string;
  thesisDrift: boolean;
  thesisBody: string;
  lots: { date: string; quantity: number; price: number }[];
}

export interface PromptQuote {
  price: number;
  changePercent: number;
}

export function buildPrompt(
  holdings: PromptHolding[],
  quotes: Record<string, PromptQuote>,
): string {
  const totalValue = holdings.reduce((sum, h) => sum + h.costBasis * h.quantity + h.pnl, 0);
  const totalCost  = holdings.reduce((sum, h) => sum + h.costBasis * h.quantity, 0);
  const totalPnl   = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const driftCount = holdings.filter(h => h.thesisDrift).length;

  // ── Sector breakdown ────────────────────────────────────────────────────────
  const sectorMap: Record<string, { value: number; cost: number; count: number }> = {};
  for (const h of holdings) {
    const sector = h.sector || 'Unknown';
    if (!sectorMap[sector]) sectorMap[sector] = { value: 0, cost: 0, count: 0 };
    sectorMap[sector].value += h.costBasis * h.quantity + h.pnl;
    sectorMap[sector].cost  += h.costBasis * h.quantity;
    sectorMap[sector].count += 1;
  }
  const sectorLines = Object.entries(sectorMap)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([sector, d]) => {
      const pct    = totalValue > 0 ? (d.value / totalValue) * 100 : 0;
      const pnl    = d.value - d.cost;
      const pnlPct = d.cost > 0 ? (pnl / d.cost) * 100 : 0;
      return `  ${sector.padEnd(24)} ${pct.toFixed(1).padStart(5)}%  ${d.count} pos  P&L: ${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`;
    })
    .join('\n');

  // ── Risk & drift summary ────────────────────────────────────────────────────
  const driftHoldings = holdings.filter(h => h.thesisDrift);
  const highRisk      = holdings.filter(h => h.riskLevel === 'high' && !h.thesisDrift);
  const lowConviction = holdings.filter(h => (h.conviction ?? 3) <= 2 && !h.thesisDrift);

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

  // ── Holdings detail ─────────────────────────────────────────────────────────
  const holdingLines = holdings.map(h => {
    const q = quotes[h.symbol];
    const livePrice = q
      ? `$${q.price.toFixed(2)} (today: ${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
      : 'price N/A';
    const conviction = h.conviction ?? 'unrated';
    const drift = h.thesisDrift ? ' ⚠ THESIS DRIFT' : '';

    const recentLots = (h.lots ?? []).slice(-3);
    const lotLines = recentLots.length > 0
      ? '\n    Lots (recent 3): ' +
        recentLots.map(l => `${l.date} ${l.quantity}×$${l.price.toLocaleString()}`).join(', ')
      : '';

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
Please provide a concise, high-signal portfolio analysis. Use exactly this structure with the 5 section headers below, separated by --- dividers:

## Overall Assessment
One tight paragraph on whether this portfolio is well-positioned for the 2030 10× goal. Call out the single biggest strength and the single biggest concern.

---

## Concentration & Diversification
Comment on position sizing, sector exposure, and over/under-weight risks. Be specific about weights and sectors.

---

## Thesis Drift Warnings
For each position flagged with thesis drift: state the urgency and a single recommended action. If none flagged, say so briefly. Append [DRIFT] inline after any position symbol you mention that has drift.

---

## Top Opportunities
Exactly 3 numbered action items (trim, add, or exit). Each should be one sentence naming the ticker and the specific rationale from the thesis/conviction data. Append [OPP] after opportunities and [RISK] after risk-increasing actions.

---

## Risk Snapshot
2–3 bullet points covering macro or sector-level risks the portfolio should watch in the next 12 months. Be specific to what's actually in the portfolio.

Formatting rules:
- Use **bold** only for ticker symbols and key metrics.
- Append [DRIFT], [RISK], or [OPP] inline (no space before) after the relevant word to tag it — e.g. "NVDA[DRIFT]" or "trim AAPL[OPP]".
- No extra headers, no commentary outside the 5 sections.
- Be direct, data-driven, and under 400 words total.`;
}
