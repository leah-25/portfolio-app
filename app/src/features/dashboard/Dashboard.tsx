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
import { formatCompact, formatPct, formatDate } from '../../lib/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — replace with Zustand store data in Phase 2
// ─────────────────────────────────────────────────────────────────────────────

const KPI = {
  totalValue:      214_500_000,   // ₩
  costBasis:       138_200_000,   // ₩
  unrealisedPnl:    76_300_000,   // ₩
  pnlPct:               0.552,   // 55.2%
  target10x:     1_382_000_000,   // ₩ — 10× cost basis
  targetYear:            2030,
  progress10x:          0.1554,  // 214.5M / 1382M
  requiredCagr:          0.454,  // to hit target from today in ~4.8 yrs
  positionCount:            8,
} as const;

interface HoldingRow {
  symbol: string;
  name:   string;
  type:   'stock' | 'crypto';
  value:  number;
  weight: number;  // 0–1
  pnlPct: number;  // signed, e.g. 0.829 = +82.9%
}

const TOP_HOLDINGS: HoldingRow[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp',  type: 'stock',  value: 60_000_000, weight: 0.280, pnlPct: +0.829 },
  { symbol: 'MSFT', name: 'Microsoft',    type: 'stock',  value: 38_600_000, weight: 0.180, pnlPct: +0.441 },
  { symbol: 'BTC',  name: 'Bitcoin',      type: 'crypto', value: 32_200_000, weight: 0.150, pnlPct: +0.975 },
  { symbol: 'TSLA', name: 'Tesla',        type: 'stock',  value: 25_700_000, weight: 0.120, pnlPct: -0.126 },
  { symbol: 'AMZN', name: 'Amazon',       type: 'stock',  value: 21_400_000, weight: 0.100, pnlPct: +0.289 },
];

interface AllocationSlice {
  symbol: string;
  name:   string;
  pct:    number;
  color:  string;
}

// Restrained palette: indigo family for stocks, amber for crypto, zinc for rest
const ALLOCATION: AllocationSlice[] = [
  { symbol: 'NVDA',  name: 'NVIDIA',      pct: 28.0, color: '#6366f1' },
  { symbol: 'MSFT',  name: 'Microsoft',   pct: 18.0, color: '#818cf8' },
  { symbol: 'BTC',   name: 'Bitcoin',     pct: 15.0, color: '#f59e0b' },
  { symbol: 'TSLA',  name: 'Tesla',       pct: 12.0, color: '#a78bfa' },
  { symbol: 'AMZN',  name: 'Amazon',      pct: 10.0, color: '#4ade80' },
  { symbol: 'Other', name: 'Other (3)',   pct: 17.0, color: '#3f3f46' },
];

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
    excerpt: 'NVDA drifted +3% above target weight. Trimmed and redeployed to AMZN. All core theses intact. Portfolio tracking at 15.5% of 10x goal.',
    tags: ['rebalance', 'NVDA', 'AMZN', 'quarterly'],
    updatedAt: '2025-03-31T12:00:00Z',
  },
];

interface RiskItem {
  id:           string;
  kind:         'risk' | 'catalyst';
  holding:      string | null;
  title:        string;
  status:       'open' | 'monitoring' | 'resolved';
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

const QUICK_NAV: { to: string; Icon: LucideIcon; label: string; meta: string }[] = [
  { to: '/holdings',  Icon: Layers,        label: 'Holdings',  meta: '8 positions'   },
  { to: '/thesis',    Icon: FileText,       label: 'Thesis',    meta: '1 drift alert' },
  { to: '/notes',     Icon: BookOpen,       label: 'Notes',     meta: '14 entries'    },
  { to: '/rebalance', Icon: ArrowLeftRight, label: 'Rebalance', meta: 'Last: Mar 15'  },
  { to: '/risk',      Icon: ShieldAlert,    label: 'Risk',      meta: '3 open items'  },
  { to: '/settings',  Icon: Settings,       label: 'Settings',  meta: 'Configure'     },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (Dashboard-specific, not reused elsewhere)
// ─────────────────────────────────────────────────────────────────────────────

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string;
  value:    string;
  positive?: boolean;
  negative?: boolean;
  change?:   string;   // pre-formatted "+55.2%"
  sub?:      string;
  progress?: number;   // 0–1 → renders mini progress bar
  accent?:   boolean;  // primary card gets indigo border tint
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

      {/* Change pill */}
      {change && (
        <div className={[
          'flex items-center gap-1 text-xs num font-medium',
          positive ? 'text-gain-text' : negative ? 'text-loss-text' : 'text-text-muted',
        ].join(' ')}>
          {(positive || negative) && <ChangeIcon size={12} strokeWidth={2.5} />}
          {change}
        </div>
      )}

      {/* Plain sub-text (no progress bar) */}
      {sub && progress == null && (
        <span className="text-xs text-text-muted leading-snug">{sub}</span>
      )}

      {/* Progress bar + sub-text */}
      {progress != null && (
        <div className="space-y-2">
          {/* Track */}
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

// ── Section title with "View all" link ────────────────────────────────────────

function SectionHead({
  title,
  sub,
  to,
  linkLabel = 'View all',
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

// ── Allocation donut custom tooltip ───────────────────────────────────────────

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

// ── Compact risk / catalyst row ───────────────────────────────────────────────

function RiskRow({ item }: { item: RiskItem }) {
  const statusVariant = {
    open:       'warn',
    monitoring: 'default',
    resolved:   'gain',
  } as const;

  const KindIcon = item.kind === 'catalyst' ? Zap : AlertCircle;

  return (
    <div className="group flex items-start gap-3 py-3 border-b border-surface-border last:border-0 cursor-default">
      {/* Kind icon */}
      <div className={[
        'mt-0.5 flex-shrink-0 h-5 w-5 rounded flex items-center justify-center',
        item.kind === 'catalyst'
          ? 'bg-accent-subtle text-accent'
          : 'bg-surface-overlay text-text-muted',
      ].join(' ')}>
        <KindIcon size={11} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant={statusVariant[item.status]} dot size="sm">
            {item.status}
          </Badge>
          {item.holding && <Tag size="xs">{item.holding}</Tag>}
          {item.expectedDate && (
            <span className="text-2xs text-text-muted">{item.expectedDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quick navigation tile ─────────────────────────────────────────────────────

function QuickNavTile({ to, Icon, label, meta }: { to: string; Icon: LucideIcon; label: string; meta: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-2.5 rounded-card border border-surface-border bg-surface-raised p-4 transition-all duration-150 hover:border-accent/30 hover:bg-surface-overlay hover:shadow-card-md"
    >
      <div className="flex items-center justify-between">
        <Icon
          size={16}
          strokeWidth={1.75}
          className="text-text-muted group-hover:text-accent transition-colors duration-150"
        />
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
  const maxWeight = Math.max(...TOP_HOLDINGS.map((h) => h.weight));

  return (
    <>
      <PageHeader
        eyebrow={`${KPI.targetYear} · 10× Target`}
        title="Portfolio Overview"
        description="Mock data — connect API keys in Settings to enable live prices"
        actions={
          <Button variant="ghost" size="sm">
            <RefreshCw size={13} />
            Refresh
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
              value={formatCompact(KPI.totalValue, 'KRW')}
              sub={`${KPI.positionCount} positions`}
              accent
            />
            <KpiCard
              label="Total Cost Basis"
              value={formatCompact(KPI.costBasis, 'KRW')}
              sub="total invested"
            />
            <KpiCard
              label="Unrealised P&L"
              value={`+${formatCompact(KPI.unrealisedPnl, 'KRW')}`}
              change={formatPct(KPI.pnlPct)}
              positive
            />
            <KpiCard
              label="10× Progress"
              value={`${(KPI.progress10x * 100).toFixed(1)}%`}
              progress={KPI.progress10x}
              sub={`${formatCompact(KPI.totalValue, 'KRW')} of ${formatCompact(KPI.target10x, 'KRW')} · ~${(KPI.requiredCagr * 100).toFixed(0)}% CAGR req.`}
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
                  sub={`${KPI.positionCount} positions · by current value`}
                  to="/holdings"
                />

                {/* Column labels */}
                <div className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_3.5rem] gap-x-3 pb-2 border-b border-surface-border">
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Asset</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">Weight</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">Value</span>
                  <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted text-right">P&L</span>
                </div>
              </div>

              {/* Holding rows */}
              <div className="px-4 pb-5">
                {TOP_HOLDINGS.map((h) => (
                  <div
                    key={h.symbol}
                    className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_3.5rem] gap-x-3 items-center py-2.5 -mx-1 px-1 rounded-md hover:bg-surface-overlay transition-colors cursor-pointer border-b border-surface-border/40 last:border-0"
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
                        {(h.weight * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Value */}
                    <div className="text-sm num text-text-secondary text-right">
                      {formatCompact(h.value, 'KRW')}
                    </div>

                    {/* P&L */}
                    <div className={[
                      'flex items-center justify-end gap-0.5 text-xs num font-medium',
                      h.pnlPct >= 0 ? 'text-gain-text' : 'text-loss-text',
                    ].join(' ')}>
                      {h.pnlPct >= 0
                        ? <TrendingUp size={11} strokeWidth={2.5} />
                        : <TrendingDown size={11} strokeWidth={2.5} />}
                      {Math.abs(h.pnlPct * 100).toFixed(1)}%
                    </div>
                  </div>
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

              {/* Donut chart with centered overlay label */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={168}>
                  <PieChart>
                    <Pie
                      data={ALLOCATION}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      dataKey="pct"
                      strokeWidth={2}
                      stroke="#18181b"  /* match page bg — creates gap between slices */
                      startAngle={90}
                      endAngle={-270}
                      animationBegin={100}
                      animationDuration={700}
                    >
                      {ALLOCATION.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-base font-semibold num text-text-primary leading-none">₩214.5M</div>
                    <div className="text-2xs text-text-muted mt-1 uppercase tracking-widest">Total</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {ALLOCATION.map((slice) => (
                  <div key={slice.symbol} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: slice.color }}
                      />
                      <span className="text-xs font-medium text-text-secondary">{slice.symbol}</span>
                      <span className="text-xs text-text-muted hidden sm:inline">{slice.name}</span>
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

            {/* Research notes */}
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

            {/* Risks & Catalysts */}
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
                  2 open risks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />
                  2 catalysts tracked
                </span>
              </div>
            </Card>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              Section 4 · Last rebalance (left) + Quick nav (right)
          ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Last rebalance decision */}
            <Card>
              <SectionHead
                title="Last Rebalance Decision"
                sub={formatDate(LAST_REBALANCE.date)}
                to="/rebalance"
                linkLabel="Full log"
              />

              {/* Action line */}
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded bg-accent-subtle flex items-center justify-center">
                  <Target size={11} className="text-accent" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-medium text-text-primary leading-snug">
                  {LAST_REBALANCE.action}
                </p>
              </div>

              {/* Rationale */}
              <div className="rounded-md bg-surface-overlay border border-surface-border px-3.5 py-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  {LAST_REBALANCE.rationale}
                </p>
              </div>
            </Card>

            {/* Quick access grid */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Quick Access</h3>
              <div className="grid grid-cols-3 gap-3">
                {QUICK_NAV.map(({ to, Icon, label, meta }) => (
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
