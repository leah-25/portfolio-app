import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ChevronLeft, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, Clock, BarChart2, BookOpen,
  ArrowLeftRight, ShieldAlert, Zap, RefreshCw, Sparkles, Loader2,
} from 'lucide-react';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader, CardDivider } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import ConvictionPips from '../../components/ui/ConvictionPips';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useMarketStore } from '../../store/marketStore';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useAIStore } from '../../store/aiStore';
import { formatCurrency, formatCompact, formatPct, formatDate } from '../../lib/formatters';
import { generateStockDetail } from '../../lib/analysis/stockDetail';
import { fetchSymbolNews } from '../../lib/marketData/polygonNews';

// ── Stock data shape ─────────────────────────────────────────────────────────

interface StockData {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
  sector: string;
  description: string;
  // Position snapshot
  currentPrice: number;
  quantity: number;
  currentValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
  weight: number;
  targetWeight: number;
  // Thesis
  conviction: 1 | 2 | 3 | 4 | 5;
  thesisUpdatedAt: string;
  thesisBody: string;
  bullCase: string[];
  bearCase: string[];
  // Drift history
  driftHistory: { date: string; conviction: number; note: string }[];
  // KPIs
  kpis: { metric: string; target: string; current: string; status: 'on-track' | 'watch' | 'miss' }[];
  // Risks
  risks: { title: string; status: 'open' | 'monitoring' | 'resolved'; body: string }[];
  // Catalysts
  catalysts: { title: string; date: string; status: 'pending' | 'confirmed' | 'passed' }[];
  // Linked notes
  notes: { id: string; period: string; title: string; updatedAt: string }[];
  // Rebalance history
  rebalances: { date: string; action: string; rationale: string }[];
}


// Fallback for unknown symbols
function getFallbackData(symbol: string): StockData {
  return {
    symbol, name: symbol, type: 'stock', sector: 'Unknown',
    description: 'No company data available for this symbol.',
    currentPrice: 0, quantity: 0, currentValue: 0, costBasis: 0,
    pnl: 0, pnlPct: 0, weight: 0, targetWeight: 0,
    conviction: 3, thesisUpdatedAt: new Date().toISOString(),
    thesisBody: '', bullCase: [], bearCase: [], driftHistory: [],
    kpis: [], risks: [], catalysts: [], notes: [], rebalances: [],
  };
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-text-muted flex-shrink-0" />}
            {title}
          </span>
        }
      />
      <CardDivider />
      <div className="pt-1">{children}</div>
    </Card>
  );
}


// ── KPI status icon ───────────────────────────────────────────────────────────

const KPI_META = {
  'on-track': { icon: CheckCircle2, class: 'text-gain-text', label: 'On track' },
  'watch':    { icon: Clock,        class: 'text-warn-text',  label: 'Watch'    },
  'miss':     { icon: XCircle,      class: 'text-loss-text',  label: 'Miss'     },
};

// ── Catalyst status ───────────────────────────────────────────────────────────

const CATALYST_META = {
  pending:   { variant: 'warn'    as const, dot: true  },
  confirmed: { variant: 'accent'  as const, dot: true  },
  passed:    { variant: 'muted'   as const, dot: false },
};

// ── Main page ─────────────────────────────────────────────────────────────────

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

export default function StockDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const upper = symbol.toUpperCase();

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Position data from the persistent store
  const { holdings } = useHoldingsStore();
  const holding = holdings.find((h) => h.symbol === upper);
  const { anthropicKey, stockDetailCache, setStockDetailCache } = useAIStore();
  const { apiKey: marketApiKey, provider } = useMarketStore();
  const canAnalyze = (USE_SERVER_KEY || !!anthropicKey) && !!holding;
  const hasPolygonNews = provider === 'polygon' && !!marketApiKey;

  // AI-generated content for this symbol (persisted across sessions)
  const cachedEntry = stockDetailCache[upper];

  const aiData = cachedEntry?.data;

  // Merged data object for the template — store wins on position fields, AI wins on content fields
  const data: StockData = {
    ...getFallbackData(upper),
    ...(aiData ? {
      description: aiData.description,
      bullCase:    aiData.bullCase,
      bearCase:    aiData.bearCase,
      kpis:        aiData.kpis,
      risks:       aiData.risks,
      catalysts:   aiData.catalysts,
    } : {}),
    ...(holding ? {
      symbol:       holding.symbol,
      name:         holding.name,
      type:         holding.type,
      sector:       holding.sector,
      quantity:     holding.quantity,
      costBasis:    holding.costBasis,
      currentValue: holding.currentValue,
      pnl:          holding.pnl,
      pnlPct:       holding.pnlPct,
      weight:       holding.weight,
      targetWeight: holding.targetWeight ?? 0,
      conviction:   holding.conviction ?? 3,
      thesisBody:   holding.thesisBody,
      thesisUpdatedAt: holding.lastReviewed,
    } : {}),
  };

  const { quotes, loading, refresh } = useMarketStore();

  // Fetch this symbol's quote on mount
  useEffect(() => { refresh([upper]); }, [upper]); // eslint-disable-line react-hooks/exhaustive-deps

  const quote = quotes[upper];

  // Merge live price into position calculations
  const currentValue = quote ? data.quantity * quote.price : data.currentValue;
  const totalCost    = data.quantity * data.costBasis;
  const pnl          = currentValue - totalCost;
  const pnlPct       = totalCost > 0 ? pnl / totalCost : 0;
  const gain         = pnl >= 0;

  async function handleAnalyze(forceRefresh = false) {
    if (!holding) return;
    if (!forceRefresh && cachedEntry) return; // already have data
    setGenerating(true);
    setGenError(null);
    try {
      const recentNews = hasPolygonNews
        ? await Promise.race([
            fetchSymbolNews(upper, marketApiKey).then((items) =>
              items.map(
                (n) => `[${n.published}] ${n.title}${n.description ? ` — ${n.description.slice(0, 120)}` : ''}`,
              ),
            ),
            new Promise<undefined>((r) => setTimeout(() => r(undefined), 5_000)),
          ])
        : undefined;

      const result = await generateStockDetail(holding, {
        apiKey: anthropicKey || undefined,
        currentPrice: quote?.price,
        recentNews,
      });
      setStockDetailCache(upper, result);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="border-b border-surface-border bg-surface-raised/40 px-6 py-5">
        {/* Breadcrumb */}
        <Link
          to="/holdings"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary mb-3 transition-colors"
        >
          <ChevronLeft size={13} />
          Holdings
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">{data.symbol}</h1>
              <Badge variant={data.type === 'crypto' ? 'warn' : 'accent'}>{data.type.toUpperCase()}</Badge>
              <Tag size="sm">{data.sector}</Tag>
              {canAnalyze && !cachedEntry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAnalyze()}
                  disabled={generating}
                  title="Generate AI analysis for this holding"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {generating ? 'Analyzing…' : 'Analyze'}
                </Button>
              )}
              {canAnalyze && cachedEntry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAnalyze(true)}
                  disabled={generating}
                  title="Regenerate AI analysis"
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {generating ? 'Regenerating…' : 'Regenerate'}
                </Button>
              )}
            </div>
            <p className="text-sm text-text-muted">{data.name}</p>
          </div>

          {/* Position stats strip */}
          <div className="flex flex-wrap gap-6 items-end">
            {/* Live price */}
            {quote ? (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-1">Price</p>
                <p className="text-lg font-semibold num text-text-primary leading-none">
                  {formatCurrency(quote.price, 'USD')}
                </p>
                <p className={`text-2xs num mt-0.5 ${quote.change >= 0 ? 'text-gain-text' : 'text-loss-text'}`}>
                  {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change, 'USD')}
                  {' '}({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%) today
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                <RefreshCw size={11} className="animate-spin" /> Loading price…
              </div>
            ) : null}

            <HeroStat label="Position Value" value={formatCurrency(currentValue, 'USD')} />
            <HeroStat
              label="Total P&L"
              value={`${gain ? '+' : ''}${formatPct(pnlPct)}`}
              sub={`${gain ? '+' : ''}${formatCurrency(pnl, 'USD')}`}
              sentiment={gain ? 'gain' : 'loss'}
            />
            <HeroStat label="Avg Cost" value={formatCurrency(data.costBasis, 'USD')} sub={`${data.quantity} units`} />
            <HeroStat
              label="Weight"
              value={`${data.weight.toFixed(1)}%`}
              sub={`Target ${data.targetWeight}%`}
              sentiment={data.weight > data.targetWeight + 0.5 ? 'warn' : undefined}
            />
            {quote?.marketCap ? (
              <HeroStat label="Market Cap" value={formatCompact(quote.marketCap, 'USD')} />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <PageContainer>
        <div className="space-y-5">

          {/* Error banner */}
          {genError && (
            <div className="p-3 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss-text">
              {genError}
            </div>
          )}

          {/* Generating banner */}
          {generating && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-surface-border text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin flex-shrink-0" />
              Claude is generating analysis for {upper}…
            </div>
          )}

          {/* AI-sourced badge */}
          {cachedEntry && !generating && (
            <div className="flex items-center gap-1.5 text-2xs text-text-muted">
              <Sparkles size={11} className="text-accent" />
              AI-generated · {formatDate(new Date(cachedEntry.timestamp).toISOString())}
            </div>
          )}

          {/* Row 1: Summary + Thesis */}
          <PageGrid cols={2}>
            {/* Company summary */}
            <Section title="Company Summary" icon={BarChart2}>
              <p className="text-sm text-text-secondary leading-relaxed">{data.description}</p>
            </Section>

            {/* Current thesis */}
            <Section title="Current Thesis" icon={BookOpen}>
              {data.thesisBody ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <ConvictionPips value={data.conviction} showLabel />
                    <span className="text-2xs text-text-muted">
                      Updated {formatDate(data.thesisUpdatedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{data.thesisBody}</p>
                </>
              ) : (
                <p className="text-sm text-text-muted py-2">
                  No thesis yet — generate one from the{' '}
                  <a href="/thesis" className="text-accent hover:underline">Thesis tab</a>.
                </p>
              )}
            </Section>
          </PageGrid>

          {/* Row 2: Bull / Bear */}
          <PageGrid cols={2}>
            <BullBearCard type="bull" points={data.bullCase} />
            <BullBearCard type="bear" points={data.bearCase} />
          </PageGrid>

          {/* Row 3: Thesis drift tracker (full width) */}
          <Section title="Thesis Drift Tracker" icon={TrendingUp}>
            {data.driftHistory.length === 0 ? (
              <p className="text-sm text-text-muted">No conviction history recorded.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-surface-border" />
                <ol className="space-y-5 pl-10">
                  {[...data.driftHistory].reverse().map((entry, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? entry.conviction - prev.conviction : 0;
                    return (
                      <li key={i} className="relative">
                        {/* Dot */}
                        <div className={[
                          'absolute -left-10 top-0.5 w-[14px] h-[14px] rounded-full border-2 border-surface-raised flex items-center justify-center',
                          entry.conviction >= 4 ? 'bg-accent' : entry.conviction === 3 ? 'bg-warn-DEFAULT' : 'bg-surface-muted',
                        ].join(' ')} />

                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-text-muted num">{formatDate(entry.date)}</span>
                          <ConvictionPips value={entry.conviction} size="sm" />
                          {delta !== 0 && (
                            <span className={`text-2xs font-semibold ${delta > 0 ? 'text-gain-text' : 'text-loss-text'}`}>
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{entry.note}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </Section>

          {/* Row 4: KPI watchlist (full width) */}
          <Section title="KPI Watchlist" icon={BarChart2}>
            {data.kpis.length === 0 ? (
              <EmptyState Icon={BarChart2} title="No KPIs tracked" />
            ) : (
              <Table flush>
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th numeric>Target</Th>
                    <Th numeric>Current</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.kpis.map((kpi, i) => {
                    const meta = KPI_META[kpi.status];
                    const KpiIcon = meta.icon;
                    return (
                      <Tr key={i}>
                        <Td>
                          <span className="text-sm font-medium text-text-primary">{kpi.metric}</span>
                        </Td>
                        <Td numeric muted>{kpi.target}</Td>
                        <Td numeric>
                          <span className="font-medium text-text-primary">{kpi.current}</span>
                        </Td>
                        <Td>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.class}`}>
                            <KpiIcon size={13} strokeWidth={2} />
                            {meta.label}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </Section>

          {/* Row 5: Risk log + Catalyst timeline */}
          <PageGrid cols={2}>
            {/* Risk log */}
            <Section title="Risk Log" icon={ShieldAlert}>
              {data.risks.length === 0 ? (
                <EmptyState Icon={ShieldAlert} title="No risks logged" />
              ) : (
                <div className="space-y-3">
                  {data.risks.map((r, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Badge
                          variant={r.status === 'open' ? 'warn' : r.status === 'monitoring' ? 'default' : 'gain'}
                          dot
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary mb-0.5 leading-snug">{r.title}</p>
                        <p className="text-xs text-text-muted leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Catalyst timeline */}
            <Section title="Catalyst Timeline" icon={Zap}>
              {data.catalysts.length === 0 ? (
                <EmptyState Icon={Zap} title="No catalysts logged" />
              ) : (
                <div className="space-y-3">
                  {data.catalysts.map((c, i) => {
                    const meta = CATALYST_META[c.status];
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Badge variant={meta.variant} dot={meta.dot} size="sm">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={[
                            'text-sm font-semibold leading-snug',
                            c.status === 'passed' ? 'text-text-muted' : 'text-text-primary',
                          ].join(' ')}>
                            {c.title}
                          </p>
                          <p className="text-2xs text-text-muted mt-0.5 num">{c.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </PageGrid>

          {/* Row 6: Linked notes + Rebalance history */}
          <PageGrid cols={2}>
            {/* Linked research notes */}
            <Section title="Linked Research Notes" icon={BookOpen}>
              {data.notes.length === 0 ? (
                <EmptyState Icon={BookOpen} title="No linked notes" />
              ) : (
                <div className="space-y-2">
                  {data.notes.map((note) => (
                    <Link
                      key={note.id}
                      to="/notes"
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface hover:bg-surface-overlay border border-surface-border hover:border-surface-muted transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted mb-0.5">{note.period}</p>
                        <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-accent transition-colors line-clamp-2">
                          {note.title}
                        </p>
                      </div>
                      <span className="text-2xs text-text-muted flex-shrink-0 mt-0.5 num">
                        {formatDate(note.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            {/* Rebalance history */}
            <Section title="Rebalance History" icon={ArrowLeftRight}>
              {data.rebalances.length === 0 ? (
                <EmptyState Icon={ArrowLeftRight} title="No rebalances recorded" />
              ) : (
                <div className="space-y-3">
                  {data.rebalances.map((r, i) => (
                    <div key={i} className="border-l-2 border-surface-border pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" size="sm">{formatDate(r.date)}</Badge>
                      </div>
                      <p className="text-sm font-medium text-text-primary mb-1">{r.action}</p>
                      <p className="text-xs text-text-muted leading-relaxed">{r.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </PageGrid>

        </div>
      </PageContainer>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  sub,
  sentiment,
}: {
  label: string;
  value: string;
  sub?: string;
  sentiment?: 'gain' | 'loss' | 'warn';
}) {
  const sentimentMap: Record<string, string> = {
    gain: 'text-gain-text',
    loss: 'text-loss-text',
    warn: 'text-warn-text',
  };
  const valueClass = sentiment ? sentimentMap[sentiment] : 'text-text-primary';

  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold num leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-2xs text-text-muted num mt-0.5">{sub}</p>}
    </div>
  );
}

function BullBearCard({ type, points }: { type: 'bull' | 'bear'; points: string[] }) {
  const isBull = type === 'bull';
  return (
    <Card>
      <CardHeader
        title={
          <span className={`flex items-center gap-2 ${isBull ? 'text-gain-text' : 'text-loss-text'}`}>
            {isBull
              ? <TrendingUp  size={15} className="flex-shrink-0" />
              : <TrendingDown size={15} className="flex-shrink-0" />}
            {isBull ? 'Bull Case' : 'Bear Case'}
          </span>
        }
      />
      <CardDivider />
      <div className="pt-1">
        {points.length === 0 ? (
          <p className="text-sm text-text-muted">No points recorded.</p>
        ) : (
          <ul className="space-y-2.5">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={`flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${isBull ? 'bg-gain-DEFAULT' : 'bg-loss-DEFAULT'}`} />
                <p className="text-sm text-text-secondary leading-relaxed">{p}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
