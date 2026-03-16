import { useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, TrendingUp, TrendingDown, ChevronRight,
  Layers, FileText, BookOpen, ArrowLeftRight,
  ShieldAlert, Settings, Target, AlertCircle, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import NoteCard from '../../components/ui/NoteCard';
import Button from '../../components/ui/Button';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useMarketStore } from '../../store/marketStore';
import { formatCompact, formatPct, formatDate } from '../../lib/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Static editorial mock content — no store exists yet for these
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_YEAR = 2030;

interface NoteItem {
  id:        string;
  type:      'weekly' | 'quarterly';
  period:    string;
  title:     string;
  excerpt:   string;
  tags:      string[];
  updatedAt: string;
}

const RECENT_NOTES: NoteItem[] = [
  {
    id: 'w11',
    type: 'weekly',
    period: 'Week 11 · 2025',
    title: 'NVDA earnings preview — data center demand holding strong',
    excerpt: 'Ahead of Q1 earnings, channel checks suggest hyperscaler orders remain robust. Blackwell ramp is on track. Maintaining full position with high conviction.',
    tags: ['NVDA', 'AI', 'semiconductors'],
    updatedAt: '2025-03-10T14:22:00Z',
  },
  {
    id: 'q1',
    type: 'quarterly',
    period: 'Q1 2025',
    title: 'Q1 review — thesis drift, rebalance decisions, CAGR pacing',
    excerpt: 'NVDA drifted +3% above target weight. Trimmed and redeployed to AMZN. All core theses intact. Portfolio tracking at 15.5% of 10× goal.',
    tags: ['rebalance', 'NVDA', 'AMZN', 'quarterly'],
    updatedAt: '2025-03-31T12:00:00Z',
  },
];

interface RiskItem {
  id:            string;
  kind:          'risk' | 'catalyst';
  holding:       string | null;
  title:         string;
  status:        'open' | 'monitoring' | 'resolved';
  expectedDate?: string;
}

const OPEN_RISKS: RiskItem[] = [
  {
    id: '1', kind: 'risk', holding: 'NVDA',
    title: 'Export controls restricting H100/H200 sales to China',
    status: 'monitoring',
  },
  {
    id: '2', kind: 'risk', holding: 'TSLA',
    title: 'BEV market share erosion — BYD and legacy OEMs accelerating',
    status: 'open',
  },
  {
    id: '3', kind: 'catalyst', holding: 'NVDA',
    title: 'Blackwell GPU full production ramp',
    status: 'open', expectedDate: 'Q2 2025',
  },
  {
    id: '4', kind: 'catalyst', holding: 'BTC',
    title: 'Post-halvening supply shock tailwind',
    status: 'monitoring', expectedDate: 'Apr–Oct 2024',
  },
];

const LAST_REBALANCE = {
  date: '2025-03-15T00:00:00Z',
  action: 'Trimmed NVDA (+3.0% → target), funded AMZN (−2.0% → target)',
  rationale:
    'NVDA drifted above target following the January rally. Rebalanced to fund underweight AMZN position. No thesis changes — purely a weight correction.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Color palette for allocation donut
// ─────────────────────────────────────────────────────────────────────────────

// Stocks → indigo/violet, Crypto → amber/orange, ETF → emerald, Other → zinc
const TYPE_PALETTE: Record<string, string[]> = {
  stock:  ['#6366f1', '#818cf8', '#a78bfa', '#c4b5fd', '#7c3aed'],
  crypto: ['#f59e0b', '#fb923c', '#fbbf24'],
  etf:    ['#4ade80', '#34d399', '#6ee7b7'],
};
const FALLBACK_COLORS = ['#6366f1', '#818cf8', '#f59e0b', '#a78bfa', '#4ade80', '#38bdf8', '#fb923c'];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string;
  value:    string;
  positive?: boolean;
  negative?: boolean;
  change?:   string;
  sub?:      string;
  progress?: number;  // 0–1
  accent?:   boolean;
}

function KpiCard({ label, value, positive, negative, change, sub, progress, accent }: KpiCardProps) {
  const valueClass = positive ? 'text-gain-text' : negative ? 'text-loss-text' : 'text-text-primary';
  const ChangeIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className={[
      'rounded-card bg-surface-raised p-5 flex flex-col gap-3 shadow-card',
      accent
        ? 'border border-accent/25 shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_1px_3px_0_rgba(0,0,0,0.5)]'
        : 'border border-surface-border',
    ].join(' ')}>
      <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className={['text-2xl font-semibold num leading-none', valueClass].join(' ')}>
        {value}
      </span>
      {change && (
        <div className={[
          'flex items-center gap-1 text-xs num font-medium',
          positive ? 'text-gain-text' : negative ? 'text-loss-text' : 'text-text-muted',
        ].join(' ')}>
          {(positive || negative) && <ChangeIcon size={12} strokeWidth={2.5} />}
          {change}
        </div>
      )}
      {sub && progress == null && (
        <span className="text-xs text-text-muted leading-snug">{sub}</span>
      )}
      {progress != null && (
        <div className="space-y-2">
          <div className="relative h-1.5 rounded-full bg-surface-overlay overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-700"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          {sub && <span className="text-xs text-text-muted leading-snug">{sub}</span>}
        </div>
      )}
    </div>
  );
}

function SectionHead({
  title, sub, to, linkLabel = 'View all',
}: {
  title: string;
  sub?: string;
  to: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary leading-snug">{title}</h3>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
      <Link
        to={to}
        className="flex flex-shrink-0 items-center gap-0.5 text-xs text-accent hover:underline underline-offset-2 mt-0.5"
      >
        {linkLabel}
        <ChevronRight size={11} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

interface AllocationSlice { symbol: string; name: string; pct: number; color: string; }

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload: AllocationSlice }[] }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-md border border-surface-border bg-surface-overlay px-3 py-2 shadow-card-md text-xs">
      <span className="font-semibold text-text-primary">{slice.symbol}</span>
      <span className="text-text-muted ml-2">{slice.pct.toFixed(1)}%</span>
    </div>
  );
}

function RiskRow({ item }: { item: RiskItem }) {
  const statusVariant = { open: 'warn', monitoring: 'default', resolved: 'gain' } as const;
  const KindIcon = item.kind === 'catalyst' ? Zap : AlertCircle;

  return (
    <div className="group flex items-start gap-3 py-3 border-b border-surface-border last:border-0 cursor-default">
      <div className={[
        'mt-0.5 flex-shrink-0 h-5 w-5 rounded flex items-center justify-center',
        item.kind === 'catalyst' ? 'bg-accent-subtle text-accent' : 'bg-surface-overlay text-text-muted',
      ].join(' ')}>
        <KindIcon size={11} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">{item.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant={statusVariant[item.status]} dot size="sm">{item.status}</Badge>
          {item.holding && <Tag size="xs">{item.holding}</Tag>}
          {item.expectedDate && <span className="text-2xs text-text-muted">{item.expectedDate}</span>}
        </div>
      </div>
    </div>
  );
}

function QuickNavTile({ to, Icon, label, meta }: { to: string; Icon: LucideIcon; label: string; meta: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-2.5 rounded-card border border-surface-border bg-surface-raised p-4 transition-all duration-150 hover:border-accent/30 hover:bg-surface-overlay hover:shadow-card-md"
    >
      <div className="flex items-center justify-between">
        <Icon size={16} strokeWidth={1.75} className="text-text-muted group-hover:text-accent transition-colors duration-150" />
        <ChevronRight size={12} className="text-surface-muted group-hover:text-text-muted transition-colors" />
      </div>
      <div>
        <div className="text-sm font-semibold text-text-primary">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">{meta}</div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { holdings } = useHoldingsStore();
  const { quotes, loading, lastUpdated, refresh } = useMarketStore();

  // ── Market data refresh ──────────────────────────────────────────────────
  const allSymbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);
  const doRefresh  = useCallback(() => refresh(allSymbols), [refresh, allSymbols]);
  useEffect(() => { doRefresh(); }, [doRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enrich with live prices ──────────────────────────────────────────────
  const enriched = useMemo(() =>
    holdings.map((h) => {
      const q = quotes[h.symbol];
      if (!q) return h;
      const currentValue = h.quantity * q.price;
      const totalCost    = h.quantity * h.costBasis;
      const pnl          = currentValue - totalCost;
      const pnlPct       = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      return { ...h, currentValue, pnl, pnlPct };
    }),
    [holdings, quotes],
  );

  // ── Recompute weights from live values ──────────────────────────────────
  const totalValue = useMemo(() => enriched.reduce((s, h) => s + h.currentValue, 0), [enriched]);

  const withWeights = useMemo(() =>
    enriched.map((h) => ({
      ...h,
      weight: totalValue > 0 ? (h.currentValue / totalValue) * 100 : h.weight,
    })),
    [enriched, totalValue],
  );

  // ── KPI calculations ─────────────────────────────────────────────────────
  const totalCost = useMemo(
    () => holdings.reduce((s, h) => s + h.quantity * h.costBasis, 0),
    [holdings],
  );
  const unrealisedPnl = totalValue - totalCost;
  const pnlPct        = totalCost > 0 ? unrealisedPnl / totalCost : 0;
  const target10x     = totalCost * 10;
  const progress10x   = target10x > 0 ? totalValue / target10x : 0;
  const yearsLeft     = TARGET_YEAR - new Date().getFullYear();
  const requiredCagr  = progress10x > 0 && yearsLeft > 0 && totalValue > 0
    ? Math.pow(target10x / totalValue, 1 / yearsLeft) - 1
    : 0;

  // ── Top holdings (up to 5 by value) ─────────────────────────────────────
  const topHoldings = useMemo(
    () => [...withWeights].sort((a, b) => b.currentValue - a.currentValue).slice(0, 5),
    [withWeights],
  );
  const maxWeight = Math.max(...topHoldings.map((h) => h.weight), 0.01);

  // ── Allocation donut slices ──────────────────────────────────────────────
  const allocationSlices: AllocationSlice[] = useMemo(() => {
    const sorted   = [...withWeights].sort((a, b) => b.currentValue - a.currentValue);
    const counters: Record<string, number> = {};
    const named    = sorted.map((h) => {
      const t   = h.type;
      const idx = counters[t] ?? 0;
      counters[t] = idx + 1;
      const palette = TYPE_PALETTE[t] ?? FALLBACK_COLORS;
      return {
        symbol: h.symbol,
        name:   h.name,
        pct:    totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
        color:  palette[idx % palette.length],
        _value: h.currentValue,
      };
    });

    // Group holdings < 2% into "Other"
    const MIN_PCT  = 2;
    const shown    = named.filter((s) => s.pct >= MIN_PCT);
    const hidden   = named.filter((s) => s.pct < MIN_PCT);
    const otherPct = hidden.reduce((s, h) => s + h.pct, 0);

    return [
      ...shown.map(({ _value: _, ...s }) => s),
      ...(hidden.length > 0 ? [{ symbol: 'Other', name: `Other (${hidden.length})`, pct: otherPct, color: '#3f3f46' }] : []),
    ];
  }, [withWeights, totalValue]);

  // ── Derived counts for Quick Nav ─────────────────────────────────────────
  const driftCount = holdings.filter((h) => h.thesisDrift).length;

  const quickNav: { to: string; Icon: LucideIcon; label: string; meta: string }[] = [
    { to: '/holdings',  Icon: Layers,        label: 'Holdings',  meta: `${holdings.length} position${holdings.length !== 1 ? 's' : ''}` },
    { to: '/thesis',    Icon: FileText,       label: 'Thesis',    meta: driftCount > 0 ? `${driftCount} drift alert${driftCount !== 1 ? 's' : ''}` : 'All current' },
    { to: '/notes',     Icon: BookOpen,       label: 'Notes',     meta: '14 entries' },
    { to: '/rebalance', Icon: ArrowLeftRight, label: 'Rebalance', meta: 'Last: Mar 15' },
    { to: '/risk',      Icon: ShieldAlert,    label: 'Risk',      meta: `${OPEN_RISKS.filter(r => r.status !== 'resolved').length} open items` },
    { to: '/settings',  Icon: Settings,       label: 'Settings',  meta: 'Configure' },
  ];

  // ── Description line ─────────────────────────────────────────────────────
  const hasLivePrices  = Object.keys(quotes).length > 0;
  const lastUpdatedStr = lastUpdated
    ? `Live · ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Cost-basis prices';
  const description = hasLivePrices ? lastUpdatedStr : 'Cost-basis prices — add an API key in Settings for live data';

  return (
    <>
      <PageHeader
        eyebrow={`${TARGET_YEAR} · 10× Target`}
        title="Portfolio Overview"
        description={description}
        actions={
          <Button variant="ghost" size="sm" onClick={doRefresh} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      <PageContainer>
        <div className="space-y-5">

          {/* ──────────────────────────────────────────────────────────────────
              Section 1 · KPI strip
          ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Portfolio Value"
              value={formatCompact(totalValue, 'USD')}
              sub={`${holdings.length} position${holdings.length !== 1 ? 's' : ''}`}
              accent
            />
            <KpiCard
              label="Total Cost Basis"
              value={formatCompact(totalCost, 'USD')}
              sub="total invested"
            />
            <KpiCard
              label="Unrealised P&L"
              value={`${unrealisedPnl >= 0 ? '+' : ''}${formatCompact(Math.abs(unrealisedPnl), 'USD')}`}
              change={formatPct(pnlPct)}
              positive={unrealisedPnl > 0}
              negative={unrealisedPnl < 0}
            />
            <KpiCard
              label="10× Progress"
              value={`${(progress10x * 100).toFixed(1)}%`}
              progress={progress10x}
              sub={`${formatCompact(totalValue, 'USD')} of ${formatCompact(target10x, 'USD')} · ~${(requiredCagr * 100).toFixed(0)}% CAGR req.`}
            />
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              Section 2 · Holdings (3/5) + Allocation donut (2/5)
          ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Top holdings */}
            <Card padding="none" className="lg:col-span-3">
              <div className="px-5 pt-5 pb-0">
                <SectionHead
                  title="Top Holdings"
                  sub={`${holdings.length} positions · by current value`}
                  to="/holdings"
                />
                <div className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_3.5rem] gap-x-3 pb-2 border-b border-surface-border">
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Asset</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">Weight</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">Value</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">P&L</span>
                </div>
              </div>

              <div className="px-4 pb-5">
                {topHoldings.length === 0 ? (
                  <p className="text-xs text-text-muted py-6 text-center">No holdings yet.</p>
                ) : topHoldings.map((h) => (
                  <Link
                    key={h.id}
                    to={`/holdings/${h.symbol}`}
                    className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_3.5rem] gap-x-3 items-center py-2.5 -mx-1 px-1 rounded-md hover:bg-surface-overlay transition-colors border-b border-surface-border/40 last:border-0"
                  >
                    {/* Asset */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={[
                        'h-7 w-7 rounded-lg border flex items-center justify-center flex-shrink-0',
                        h.type === 'crypto'
                          ? 'bg-warn-subtle border-warn-border/25'
                          : 'bg-surface-overlay border-surface-border',
                      ].join(' ')}>
                        <span className={[
                          'text-2xs font-bold',
                          h.type === 'crypto' ? 'text-warn-text' : 'text-text-muted',
                        ].join(' ')}>
                          {h.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary leading-none">{h.symbol}</div>
                        <div className="text-xs text-text-muted mt-0.5 truncate">{h.name}</div>
                      </div>
                    </div>

                    {/* Weight + mini bar */}
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-12 h-1 rounded-full bg-surface-overlay overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(h.weight / maxWeight) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs num text-text-muted w-8 text-right">
                        {h.weight.toFixed(0)}%
                      </span>
                    </div>

                    {/* Value */}
                    <div className="text-sm num text-text-secondary text-right">
                      {formatCompact(h.currentValue, 'USD')}
                    </div>

                    {/* P&L % */}
                    <div className={[
                      'flex items-center justify-end gap-0.5 text-xs num font-medium',
                      h.pnlPct >= 0 ? 'text-gain-text' : 'text-loss-text',
                    ].join(' ')}>
                      {h.pnlPct >= 0
                        ? <TrendingUp size={11} strokeWidth={2.5} />
                        : <TrendingDown size={11} strokeWidth={2.5} />}
                      {Math.abs(h.pnlPct).toFixed(1)}%
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Allocation donut */}
            <Card className="lg:col-span-2">
              <SectionHead
                title="Allocation"
                sub="Current portfolio weights"
                to="/rebalance"
                linkLabel="Rebalance"
              />

              <div className="relative">
                <ResponsiveContainer width="100%" height={168}>
                  <PieChart>
                    <Pie
                      data={allocationSlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      dataKey="pct"
                      strokeWidth={2}
                      stroke="#18181b"
                      startAngle={90}
                      endAngle={-270}
                      animationBegin={100}
                      animationDuration={700}
                    >
                      {allocationSlices.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-base font-semibold num text-text-primary leading-none">
                      {formatCompact(totalValue, 'USD')}
                    </div>
                    <div className="text-2xs text-text-muted mt-1 uppercase tracking-widest">Total</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {allocationSlices.map((slice) => (
                  <div key={slice.symbol} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: slice.color }} />
                      <span className="text-xs font-medium text-text-secondary">{slice.symbol}</span>
                      <span className="text-xs text-text-muted hidden sm:inline truncate max-w-[90px]">{slice.name}</span>
                    </div>
                    <span className="text-xs num text-text-muted">{slice.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              Section 3 · Recent notes (left) + Risks & catalysts (right)
          ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Card padding="none">
              <div className="px-5 pt-5 pb-4">
                <SectionHead
                  title="Research Notes"
                  sub="Latest weekly and quarterly entries"
                  to="/notes"
                />
              </div>
              <div className="px-5 pb-5 space-y-3">
                {RECENT_NOTES.map((note) => (
                  <NoteCard
                    key={note.id}
                    type={note.type}
                    period={note.period}
                    title={note.title}
                    excerpt={note.excerpt}
                    tags={note.tags}
                    updatedAt={note.updatedAt}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </Card>

            <Card padding="none">
              <div className="px-5 pt-5 pb-4">
                <SectionHead
                  title="Risks & Catalysts"
                  sub="Open items requiring attention"
                  to="/risk"
                  linkLabel="View register"
                />
              </div>
              <div className="px-5 pb-3">
                {OPEN_RISKS.map((item) => (
                  <RiskRow key={item.id} item={item} />
                ))}
              </div>
              <div className="px-5 pb-4 pt-1 flex items-center gap-4 text-2xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-warn inline-block" />
                  {OPEN_RISKS.filter(r => r.kind === 'risk' && r.status !== 'resolved').length} open risks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />
                  {OPEN_RISKS.filter(r => r.kind === 'catalyst').length} catalysts tracked
                </span>
              </div>
            </Card>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              Section 4 · Last rebalance (left) + Quick nav (right)
          ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Card>
              <SectionHead
                title="Last Rebalance Decision"
                sub={formatDate(LAST_REBALANCE.date)}
                to="/rebalance"
                linkLabel="Full log"
              />
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded bg-accent-subtle flex items-center justify-center">
                  <Target size={11} className="text-accent" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-medium text-text-primary leading-snug">
                  {LAST_REBALANCE.action}
                </p>
              </div>
              <div className="rounded-md bg-surface-overlay border border-surface-border px-3.5 py-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  {LAST_REBALANCE.rationale}
                </p>
              </div>
            </Card>

            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Quick Access</h3>
              <div className="grid grid-cols-3 gap-3">
                {quickNav.map(({ to, Icon, label, meta }) => (
                  <QuickNavTile key={to} to={to} Icon={Icon} label={label} meta={meta} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </PageContainer>
    </>
  );
}
