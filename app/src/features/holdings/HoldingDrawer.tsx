import { X, ExternalLink, Plus, FileText, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import ConvictionPips from '../../components/ui/ConvictionPips';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { RISK_VARIANT, TYPE_VARIANT } from './constants';
import { formatCurrency, formatPct, formatDate, formatRelative } from '../../lib/formatters';
import type { HoldingRecord } from './Holdings';

interface HoldingDrawerProps {
  holding: HoldingRecord | null;
  onClose: () => void;
}


export default function HoldingDrawer({ holding, onClose }: HoldingDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const open = holding !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={[
          'fixed inset-y-0 right-0 z-40 w-full max-w-md flex flex-col',
          'bg-surface-raised border-l border-surface-border shadow-2xl',
          'transition-transform duration-250 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {holding && <DrawerContent holding={holding} onClose={onClose} />}
      </div>
    </>
  );
}

function DrawerContent({ holding, onClose }: { holding: HoldingRecord; onClose: () => void }) {
  const driftWarning = holding.thesisDrift;
  const reviewedAgo = formatRelative(holding.lastReviewed);
  const reviewedDate = formatDate(holding.lastReviewed);

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-surface-border flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={TYPE_VARIANT[holding.type]}>{holding.type.toUpperCase()}</Badge>
            <Tag size="xs">{holding.sector}</Tag>
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">{holding.symbol}</h2>
          <p className="text-sm text-text-muted mt-0.5 truncate">{holding.name}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Position stats */}
        <div className="px-5 py-4 border-b border-surface-border">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-3">Position</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCell label="Current Value" value={formatCurrency(holding.currentValue, 'USD')} />
            <StatCell label="Cost Basis"    value={formatCurrency(holding.costBasis * holding.quantity, 'USD')} />
            <StatCell
              label="Unrealised P&L"
              value={formatPct(holding.pnlPct)}
              sentiment={holding.pnl >= 0 ? 'gain' : 'loss'}
              subValue={formatCurrency(holding.pnl, 'USD')}
            />
            <div>
              <p className="text-2xs text-text-muted mb-1">Weight vs Target</p>
              <p className="text-sm font-semibold num text-text-primary">
                {holding.weight.toFixed(1)}%
                <span className={[
                  'ml-1.5 text-xs num',
                  holding.weight > (holding.targetWeight ?? holding.weight)
                    ? 'text-warn-text'
                    : 'text-text-muted',
                ].join(' ')}>
                  / {holding.targetWeight != null ? `${holding.targetWeight}% target` : '—'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Lots table */}
        <div className="px-5 py-4 border-b border-surface-border">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-3">Lots</p>
          <Table flush>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th numeric>Qty</Th>
                <Th numeric>Avg Price</Th>
                <Th numeric>Cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {holding.lots.map((lot, i) => (
                <Tr key={i}>
                  <Td muted>{formatDate(lot.date)}</Td>
                  <Td numeric>{lot.quantity}</Td>
                  <Td numeric>{formatCurrency(lot.price, 'USD')}</Td>
                  <Td numeric>{formatCurrency(lot.quantity * lot.price, 'USD')}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        {/* Thesis */}
        <div className="px-5 py-4 border-b border-surface-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Investment Thesis</p>
            {holding.conviction != null && (
              <ConvictionPips value={holding.conviction} showLabel />
            )}
          </div>

          {driftWarning && (
            <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg bg-warn-subtle border border-warn-border">
              <AlertTriangle size={14} className="text-warn-text flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warn-text">Thesis may have drifted — not reviewed in 90+ days.</p>
            </div>
          )}

          {holding.thesisBody ? (
            <p className="text-sm text-text-secondary leading-relaxed">{holding.thesisBody}</p>
          ) : (
            <p className="text-sm text-text-muted italic">No thesis recorded.</p>
          )}

          <p className="text-2xs text-text-muted mt-3">
            Last reviewed: <span className="text-text-secondary">{reviewedDate}</span>
            <span className="ml-1 text-text-muted">({reviewedAgo})</span>
          </p>
        </div>

        {/* Risk level */}
        <div className="px-5 py-4">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-2">Risk Level</p>
          <Badge variant={RISK_VARIANT[holding.riskLevel]}>
            {holding.riskLevel.charAt(0).toUpperCase() + holding.riskLevel.slice(1)}
          </Badge>
        </div>
      </div>

      {/* ── Footer actions ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-surface-border flex-shrink-0">
        <Link to={`/holdings/${holding.symbol}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full">
            <FileText size={14} />
            View Detail
          </Button>
        </Link>
        <Button variant="secondary" size="sm">
          <Plus size={14} />
          Add Note
        </Button>
        <Button variant="ghost" size="sm">
          <ExternalLink size={14} />
        </Button>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  subValue,
  sentiment,
}: {
  label: string;
  value: string;
  subValue?: string;
  sentiment?: 'gain' | 'loss';
}) {
  const valueClass = sentiment === 'gain'
    ? 'text-gain-text'
    : sentiment === 'loss'
      ? 'text-loss-text'
      : 'text-text-primary';

  return (
    <div>
      <p className="text-2xs text-text-muted mb-1">{label}</p>
      <p className={`text-sm font-semibold num ${valueClass}`}>{value}</p>
      {subValue && (
        <p className={`text-2xs num mt-0.5 ${valueClass} opacity-70`}>{subValue}</p>
      )}
    </div>
  );
}

