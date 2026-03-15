import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import { Table, Thead, Tbody, Tr, Th, Td, TableEmpty } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import HoldingDrawer from './HoldingDrawer';
import { formatCurrency, formatPct, formatDate } from '../../lib/formatters';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Lot {
  date: string;
  quantity: number;
  price: number;
}

export interface HoldingRecord {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
  sector: string;
  quantity: number;
  costBasis: number;       // per unit
  currentValue: number;    // total current value
  pnl: number;
  pnlPct: number;
  weight: number;          // % of portfolio
  targetWeight: number | null;
  conviction: 1 | 2 | 3 | 4 | 5 | null;
  thesisDrift: boolean;
  thesisBody: string;
  lastReviewed: string;    // ISO date
  riskLevel: 'low' | 'medium' | 'high';
  lots: Lot[];
}

type SortCol      = 'symbol' | 'currentValue' | 'pnlPct' | 'weight' | 'conviction' | 'lastReviewed';
type SortDir      = 'asc' | 'desc';
type TypeFilter   = 'all' | 'stock' | 'crypto' | 'etf';
type ThesisFilter = 'all' | 'current' | 'drift' | 'none';
type RiskFilter   = 'all' | 'low' | 'medium' | 'high';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: HoldingRecord[] = [
  {
    id: '1', symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', sector: 'Semiconductors',
    quantity: 45, costBasis: 220, currentValue: 57_600, pnl: 47_700, pnlPct: 481.8,
    weight: 28.0, targetWeight: 25,
    conviction: 5, thesisDrift: false,
    thesisBody: 'Dominant GPU platform for AI training and inference. Blackwell ramp validates the data-center thesis. Hyperscaler CapEx tailwinds multi-year. Hold full position.',
    lastReviewed: '2025-03-10T00:00:00Z', riskLevel: 'medium',
    lots: [
      { date: '2022-09-14', quantity: 20, price: 135 },
      { date: '2023-02-28', quantity: 15, price: 234 },
      { date: '2024-01-15', quantity: 10, price: 495 },
    ],
  },
  {
    id: '2', symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', sector: 'Software',
    quantity: 30, costBasis: 260, currentValue: 34_800, pnl: 27_000, pnlPct: 346.2,
    weight: 16.9, targetWeight: 20,
    conviction: 4, thesisDrift: false,
    thesisBody: "Cloud (Azure) + AI (Copilot) flywheel. Pricing power through enterprise lock-in. OpenAI partnership adds optionality. Underweight vs target — adding on weakness.",
    lastReviewed: '2025-02-20T00:00:00Z', riskLevel: 'low',
    lots: [
      { date: '2021-11-03', quantity: 15, price: 305 },
      { date: '2022-10-17', quantity: 15, price: 215 },
    ],
  },
  {
    id: '3', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', sector: 'Digital Assets',
    quantity: 0.42, costBasis: 28_500, currentValue: 30_870, pnl: 18_900, pnlPct: 150.0,
    weight: 15.0, targetWeight: 15,
    conviction: 4, thesisDrift: false,
    thesisBody: 'Macro hedge and scarce digital store of value. Halvening-driven supply shocks historically precede 12-18 month bull runs. ETF inflows add a demand vector absent in prior cycles.',
    lastReviewed: '2025-03-01T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2022-12-20', quantity: 0.2, price: 16_500 },
      { date: '2023-08-08', quantity: 0.22, price: 29_400 },
    ],
  },
  {
    id: '4', symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', sector: 'Automotive / EV',
    quantity: 60, costBasis: 185, currentValue: 22_920, pnl: 11_820, pnlPct: 106.7,
    weight: 11.1, targetWeight: 10,
    conviction: 3, thesisDrift: true,
    thesisBody: 'Energy storage + autonomy platform play. Core auto thesis under pressure from BYD and margin erosion. Monitoring FSD progress as the key re-rating catalyst.',
    lastReviewed: '2024-11-15T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2022-12-29', quantity: 40, price: 123 },
      { date: '2023-05-10', quantity: 20, price: 171 },
    ],
  },
  {
    id: '5', symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock', sector: 'E-commerce / Cloud',
    quantity: 55, costBasis: 140, currentValue: 20_075, pnl: 12_375, pnlPct: 160.7,
    weight: 9.7, targetWeight: 12,
    conviction: 4, thesisDrift: false,
    thesisBody: 'AWS margin expansion + retail profitability turn. Prime ecosystem flywheel and advertising accelerate FCF. Underweight versus target — actively adding.',
    lastReviewed: '2025-02-05T00:00:00Z', riskLevel: 'low',
    lots: [
      { date: '2022-11-22', quantity: 35, price: 94 },
      { date: '2023-09-18', quantity: 20, price: 131 },
    ],
  },
  {
    id: '6', symbol: 'ETH', name: 'Ethereum', type: 'crypto', sector: 'Digital Assets',
    quantity: 8.5, costBasis: 1_450, currentValue: 13_770, pnl: 1_445, pnlPct: 11.7,
    weight: 6.7, targetWeight: 8,
    conviction: 3, thesisDrift: false,
    thesisBody: 'Smart contract settlement layer. EIP-4844 lowers L2 fees. Staking yield adds carry. Underweight — thesis intact, adding after BTC confirmation.',
    lastReviewed: '2025-01-22T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2023-06-14', quantity: 5, price: 1_800 },
      { date: '2023-10-02', quantity: 3.5, price: 1_650 },
    ],
  },
  {
    id: '7', symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock', sector: 'Social / AI',
    quantity: 22, costBasis: 148, currentValue: 13_200, pnl: 9_944, pnlPct: 305.5,
    weight: 6.4, targetWeight: 6,
    conviction: 4, thesisDrift: false,
    thesisBody: "Advertising flywheel amplified by AI. Threads gaining share. Reality Labs losses narrowing. Zuckerberg's year of efficiency delivered. Full position — thesis confirmed.",
    lastReviewed: '2025-03-05T00:00:00Z', riskLevel: 'medium',
    lots: [
      { date: '2022-10-31', quantity: 22, price: 148 },
    ],
  },
  {
    id: '8', symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock', sector: 'Enterprise AI',
    quantity: 200, costBasis: 9.5, currentValue: 8_200, pnl: 6_300, pnlPct: 331.6,
    weight: 4.0, targetWeight: 4,
    conviction: 3, thesisDrift: true,
    thesisBody: 'AIP platform adoption driving commercial inflection. Government contracts provide baseline. Position is smaller conviction than others — monitoring commercial growth rate.',
    lastReviewed: '2024-10-18T00:00:00Z', riskLevel: 'medium',
    lots: [
      { date: '2021-03-15', quantity: 200, price: 24.5 },
    ],
  },
];

// ── Filter pill group ─────────────────────────────────────────────────────────

interface PillOption<T extends string> { value: T; label: string }

function FilterGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
            value === opt.value
              ? 'bg-accent text-white'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary hover:bg-surface-border',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Conviction pips ───────────────────────────────────────────────────────────

function ConvictionPips({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text-muted text-xs">—</span>;
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={[
            'w-1.5 h-3 rounded-sm',
            i < value ? 'bg-accent' : 'bg-surface-border',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ── Review date cell ──────────────────────────────────────────────────────────

function ReviewCell({ iso }: { iso: string }) {
  const daysDiff = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  const stale = daysDiff > 90;
  const warn  = daysDiff > 60 && !stale;

  return (
    <span className={[
      'text-xs num',
      stale ? 'text-loss-text' : warn ? 'text-warn-text' : 'text-text-muted',
    ].join(' ')}>
      {formatDate(iso)}
    </span>
  );
}

// ── Weight bar ────────────────────────────────────────────────────────────────

function WeightBar({ actual, target }: { actual: number; target: number }) {
  const drift    = actual - target;
  const over     = drift > 0.5;
  const under    = drift < -0.5;
  const barColor = over ? 'bg-warn-DEFAULT' : under ? 'bg-accent' : 'bg-gain-DEFAULT';
  const width    = Math.min((actual / (target * 1.6)) * 100, 100);

  return (
    <div className="w-14 h-1 rounded-full bg-surface-border overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor} transition-all`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ── Asset icon ────────────────────────────────────────────────────────────────

function AssetIcon({ type }: { type: 'stock' | 'crypto' | 'etf' }) {
  const colors: Record<string, string> = {
    stock:  'bg-accent-subtle text-accent border-accent-border',
    crypto: 'bg-warn-subtle text-warn-text border-warn-border',
    etf:    'bg-surface-overlay text-text-secondary border-surface-border',
  };
  const labels: Record<string, string> = { stock: 'S', crypto: 'C', etf: 'E' };

  return (
    <div className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-2xs font-bold ${colors[type]}`}>
      {labels[type]}
    </div>
  );
}

// ── Filter options ────────────────────────────────────────────────────────────

const TYPE_OPTIONS:   PillOption<TypeFilter>[]   = [
  { value: 'all', label: 'All' }, { value: 'stock', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' }, { value: 'etf', label: 'ETFs' },
];
const THESIS_OPTIONS: PillOption<ThesisFilter>[] = [
  { value: 'all', label: 'All' }, { value: 'current', label: 'Current' },
  { value: 'drift', label: 'Needs review' }, { value: 'none', label: 'No thesis' },
];
const RISK_OPTIONS:   PillOption<RiskFilter>[]   = [
  { value: 'all', label: 'All' }, { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
];

const RISK_VARIANT: Record<string, 'gain' | 'warn' | 'loss'> = {
  low: 'gain', medium: 'warn', high: 'loss',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Holdings() {
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all');
  const [thesisFilter, setThesisFilter] = useState<ThesisFilter>('all');
  const [riskFilter,   setRiskFilter]   = useState<RiskFilter>('all');
  const [sort,         setSort]         = useState<{ col: SortCol; dir: SortDir }>({ col: 'currentValue', dir: 'desc' });
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);

  const rows = useMemo(() => {
    let out = MOCK.filter((h) => {
      if (search) {
        const q = search.toLowerCase();
        if (!h.symbol.toLowerCase().includes(q) && !h.name.toLowerCase().includes(q)) return false;
      }
      if (typeFilter   !== 'all' && h.type      !== typeFilter)   return false;
      if (riskFilter   !== 'all' && h.riskLevel !== riskFilter)   return false;
      if (thesisFilter === 'current' && (h.thesisDrift || !h.thesisBody)) return false;
      if (thesisFilter === 'drift'   && !h.thesisDrift)           return false;
      if (thesisFilter === 'none'    && h.thesisBody)             return false;
      return true;
    });

    return [...out].sort((a, b) => {
      let cmp = 0;
      switch (sort.col) {
        case 'symbol':       cmp = a.symbol.localeCompare(b.symbol); break;
        case 'currentValue': cmp = a.currentValue - b.currentValue;  break;
        case 'pnlPct':       cmp = a.pnlPct - b.pnlPct;             break;
        case 'weight':       cmp = a.weight - b.weight;              break;
        case 'conviction':   cmp = (a.conviction ?? 0) - (b.conviction ?? 0); break;
        case 'lastReviewed': cmp = new Date(a.lastReviewed).getTime() - new Date(b.lastReviewed).getTime(); break;
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [search, typeFilter, thesisFilter, riskFilter, sort]);

  const totalValue = rows.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl   = rows.reduce((s, h) => s + h.pnl, 0);

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    );
  }

  function sortDir(col: SortCol): 'asc' | 'desc' | 'none' {
    return sort.col === col ? sort.dir : 'none';
  }

  const selected = MOCK.find((h) => h.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Holdings"
        description="Position overview, thesis status, and risk profile"
      />

      <PageContainer flush>
        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-sm border-b border-surface-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search ticker or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={[
                  'w-full h-8 pl-8 pr-3 text-xs rounded-lg',
                  'bg-surface-overlay border border-surface-border',
                  'text-text-primary placeholder:text-text-muted',
                  'focus:outline-none focus:ring-1 focus:ring-accent-border focus:border-accent-border',
                  'transition-colors',
                ].join(' ')}
              />
            </div>

            {/* Type filter */}
            <FilterGroup options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />

            {/* Toggle advanced filters */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                showFilters
                  ? 'bg-accent-subtle text-accent border border-accent-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay border border-transparent',
              ].join(' ')}
            >
              <SlidersHorizontal size={13} />
              Filters
            </button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 mt-2.5 pt-2.5 border-t border-surface-border">
              <div className="flex items-center gap-2">
                <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Thesis</span>
                <FilterGroup options={THESIS_OPTIONS} value={thesisFilter} onChange={setThesisFilter} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Risk</span>
                <FilterGroup options={RISK_OPTIONS} value={riskFilter} onChange={setRiskFilter} />
              </div>
            </div>
          )}
        </div>

        {/* ── Summary strip ─────────────────────────────────────────── */}
        <div className="flex items-center gap-5 px-6 py-2.5 border-b border-surface-border text-xs text-text-muted">
          <span>
            <span className="font-semibold text-text-secondary num">{rows.length}</span> holdings
          </span>
          <span>
            Total <span className="font-semibold text-text-secondary num">{formatCurrency(totalValue, 'USD')}</span>
          </span>
          <span className={totalPnl >= 0 ? 'text-gain-text' : 'text-loss-text'}>
            {totalPnl >= 0
              ? <TrendingUp size={12} className="inline mr-1" />
              : <TrendingDown size={12} className="inline mr-1" />}
            <span className="font-semibold num">
              {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl, 'USD')}
            </span>
            {' '}total P&L
          </span>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <Table flush>
            <Thead sticky>
              <Tr>
                <Th sortable sortDir={sortDir('symbol')} onSort={() => toggleSort('symbol')} width="200px">
                  Asset
                </Th>
                <Th numeric sortable sortDir={sortDir('currentValue')} onSort={() => toggleSort('currentValue')}>
                  Position
                </Th>
                <Th numeric sortable sortDir={sortDir('pnlPct')} onSort={() => toggleSort('pnlPct')}>
                  P&L
                </Th>
                <Th numeric sortable sortDir={sortDir('weight')} onSort={() => toggleSort('weight')}>
                  Weight
                </Th>
                <Th sortable sortDir={sortDir('conviction')} onSort={() => toggleSort('conviction')}>
                  Thesis
                </Th>
                <Th>Risk</Th>
                <Th sortable sortDir={sortDir('lastReviewed')} onSort={() => toggleSort('lastReviewed')}>
                  Last Review
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 ? (
                <TableEmpty cols={7} message="No holdings match your filters." />
              ) : (
                rows.map((h) => (
                  <Tr
                    key={h.id}
                    clickable
                    onClick={() => setSelectedId(h.id === selectedId ? null : h.id)}
                    className={h.id === selectedId ? 'bg-accent-subtle/40' : ''}
                  >
                    {/* Asset */}
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <AssetIcon type={h.type} />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm">{h.symbol}</p>
                          <p className="text-2xs text-text-muted truncate max-w-[130px]">{h.name}</p>
                        </div>
                        {h.thesisDrift && (
                          <span
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-warn-DEFAULT"
                            title="Thesis drift — needs review"
                          />
                        )}
                      </div>
                    </Td>

                    {/* Position */}
                    <Td numeric>
                      <p className="font-semibold text-text-primary text-sm num">{formatCurrency(h.currentValue, 'USD')}</p>
                      <p className="text-2xs text-text-muted num">{h.quantity} × {formatCurrency(h.costBasis, 'USD')}</p>
                    </Td>

                    {/* P&L */}
                    <Td numeric sentiment={h.pnl >= 0 ? 'gain' : 'loss'}>
                      <p className="font-semibold text-sm num">{formatPct(h.pnlPct)}</p>
                      <p className="text-2xs num opacity-80">
                        {h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl, 'USD')}
                      </p>
                    </Td>

                    {/* Weight */}
                    <Td numeric>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium text-text-primary num text-sm">{h.weight.toFixed(1)}%</span>
                        {h.targetWeight != null && (
                          <WeightBar actual={h.weight} target={h.targetWeight} />
                        )}
                      </div>
                    </Td>

                    {/* Thesis / conviction */}
                    <Td>
                      <ConvictionPips value={h.conviction} />
                    </Td>

                    {/* Risk */}
                    <Td>
                      <Badge variant={RISK_VARIANT[h.riskLevel]} size="sm">
                        {h.riskLevel.charAt(0).toUpperCase() + h.riskLevel.slice(1)}
                      </Badge>
                    </Td>

                    {/* Last reviewed */}
                    <Td>
                      <ReviewCell iso={h.lastReviewed} />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      </PageContainer>

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      <HoldingDrawer
        holding={selected}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
