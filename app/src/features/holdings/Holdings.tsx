import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Settings2, Sparkles, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import { Table, Thead, Tbody, Tr, Th, Td, TableEmpty } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import ConvictionPips from '../../components/ui/ConvictionPips';
import HoldingDrawer from './HoldingDrawer';
import HoldingForm from './HoldingForm';
import PortfolioAnalysis from '../analysis/PortfolioAnalysis';
import { RISK_VARIANT } from './constants';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useMarketStore } from '../../store/marketStore';
import { formatCurrency, formatPct, formatDate } from '../../lib/formatters';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { HoldingRecord, Lot } from './types';

type SortCol      = 'symbol' | 'currentValue' | 'pnlPct' | 'weight' | 'conviction' | 'lastReviewed';
type SortDir      = 'asc' | 'desc';
type TypeFilter   = 'all' | 'stock' | 'crypto' | 'etf';
type ThesisFilter = 'all' | 'current' | 'drift' | 'none';
type RiskFilter   = 'all' | 'low' | 'medium' | 'high';


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


// ── Main page ─────────────────────────────────────────────────────────────────

export default function Holdings() {
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all');
  const [thesisFilter, setThesisFilter] = useState<ThesisFilter>('all');
  const [riskFilter,   setRiskFilter]   = useState<RiskFilter>('all');
  const [sort,         setSort]         = useState<{ col: SortCol; dir: SortDir }>({ col: 'currentValue', dir: 'desc' });
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [showAnalysis,  setShowAnalysis]  = useState(false);
  const [formHolding,   setFormHolding]   = useState<import('./types').HoldingRecord | null>(null);
  const [showForm,      setShowForm]      = useState(false);

  // ── Holdings store ────────────────────────────────────────────────────────
  const { holdings } = useHoldingsStore();

  // ── Market data ───────────────────────────────────────────────────────────
  const { quotes, loading, error, lastUpdated, refreshInterval, refresh, clearError } =
    useMarketStore();

  const allSymbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);

  const doRefresh = useCallback(() => refresh(allSymbols), [refresh, allSymbols]);

  // Initial fetch + auto-refresh interval
  useEffect(() => {
    doRefresh();
    if (refreshInterval <= 0) return;
    const id = setInterval(doRefresh, refreshInterval * 60 * 1000);
    return () => clearInterval(id);
  }, [doRefresh, refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enrich stored holdings with live quote data ───────────────────────────
  const enriched = useMemo(() =>
    holdings.map((h) => {
      const q = quotes[h.symbol];
      if (!q) return h;
      const currentValue = h.quantity * q.price;
      const totalCost    = h.quantity * h.costBasis;
      const pnl          = currentValue - totalCost;
      const pnlPct       = (pnl / totalCost) * 100;
      return { ...h, currentValue, pnl, pnlPct };
    }),
    [holdings, quotes],
  );

  const rows = useMemo(() => {
    let out = enriched.filter((h) => {
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
  }, [enriched, search, typeFilter, thesisFilter, riskFilter, sort]);

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

  const selected = holdings.find((h) => h.id === selectedId) ?? null;

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

            {/* Market data status */}
            <div className="ml-auto flex items-center gap-2">
              {loading && (
                <span className="flex items-center gap-1.5 text-2xs text-text-muted">
                  <RefreshCw size={11} className="animate-spin" />
                  Updating…
                </span>
              )}
              {!loading && lastUpdated && !error && (
                <span className="text-2xs text-text-muted num">
                  Live · {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {!loading && (
                <button
                  onClick={doRefresh}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  title="Refresh prices"
                >
                  <RefreshCw size={13} />
                </button>
              )}
              <button
                onClick={() => { setFormHolding(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-overlay border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
              <button
                onClick={() => setShowAnalysis(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                <Sparkles size={12} />
                Analyze
              </button>
            </div>
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

        {/* ── Market data notice / error ────────────────────────────── */}
        {error === 'NO_API_KEY' && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-accent-subtle border-b border-accent-border/40 text-xs text-text-secondary">
            <Settings2 size={13} className="text-accent flex-shrink-0" />
            Prices are estimates.{' '}
            <Link to="/settings" className="text-accent underline hover:text-accent-hover">
              Add your FMP API key
            </Link>
            {' '}for live market data.
            <button onClick={clearError} className="ml-auto text-text-muted hover:text-text-primary">✕</button>
          </div>
        )}
        {error && error !== 'NO_API_KEY' && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-loss-subtle border-b border-loss-border/40 text-xs text-loss-text">
            <AlertCircle size={13} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={doRefresh}   className="underline hover:no-underline">Retry</button>
            <button onClick={clearError}  className="ml-2 text-text-muted hover:text-text-primary">✕</button>
          </div>
        )}

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
                <TableEmpty
                  cols={7}
                  message={
                    holdings.length === 0
                      ? 'No holdings yet. Click "Add" to add your first position.'
                      : 'No holdings match your filters.'
                  }
                />
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
                      {(() => {
                        const q = quotes[h.symbol];
                        return q ? (
                          <>
                            <p className="text-2xs text-text-muted num">
                              {h.quantity} × {formatCurrency(q.price, 'USD')}
                            </p>
                            <p className={`text-2xs num ${q.change >= 0 ? 'text-gain-text' : 'text-loss-text'}`}>
                              {q.change >= 0 ? '+' : ''}{formatCurrency(q.change, 'USD')} ({q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%) today
                            </p>
                          </>
                        ) : (
                          <p className="text-2xs text-text-muted num">{h.quantity} × {formatCurrency(h.costBasis, 'USD')}</p>
                        );
                      })()}
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
        onEdit={(h) => { setFormHolding(h); setShowForm(true); }}
      />

      {/* ── AI analysis panel ─────────────────────────────────────────── */}
      <PortfolioAnalysis
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        holdings={enriched}
      />

      {/* ── Add / Edit holding modal ───────────────────────────────────── */}
      <HoldingForm
        holding={formHolding}
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  );
}
