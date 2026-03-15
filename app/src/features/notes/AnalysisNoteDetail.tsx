import { useEffect, useRef } from 'react';
import { X, Trash2, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import MarkdownBlock from '../../components/ui/MarkdownBlock';
import type { AnalysisNote } from '../../store/researchNotesStore';
import { formatCompact } from '../../lib/formatters';

interface Props {
  note: AnalysisNote | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function AnalysisNoteDetail({ note, onClose, onDelete }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!note) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [note, onClose]);

  useEffect(() => {
    document.body.style.overflow = note ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [note]);

  if (!note) return null;

  const { portfolioSnapshot: snap, aiResponse, timestamp, symbols } = note;
  const totalPnl = snap.totalValue - snap.totalCost;
  const totalPnlPct = snap.totalCost > 0 ? (totalPnl / snap.totalCost) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-surface-overlay border-l border-surface-border shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-surface-border px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            <div>
              <span className="text-sm font-semibold text-text-primary">AI Analysis</span>
              <span className="ml-2 text-xs text-text-muted">{formatDateTime(timestamp)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(note.id); onClose(); }}
              title="Delete note"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-loss-subtle hover:text-loss-text transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">

          {/* Portfolio snapshot */}
          <div className="border-b border-surface-border bg-surface-base px-5 py-4">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-3">
              Portfolio Snapshot
            </p>

            {/* Summary KPIs */}
            <div className="flex gap-6 mb-3">
              <div>
                <p className="text-2xs text-text-muted mb-0.5">Value</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatCompact(snap.totalValue, 'USD')}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted mb-0.5">Cost basis</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatCompact(snap.totalCost, 'USD')}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted mb-0.5">Unrealised P&L</p>
                <p className={[
                  'text-sm font-semibold',
                  totalPnl >= 0 ? 'text-gain-text' : 'text-loss-text',
                ].join(' ')}>
                  {totalPnl >= 0 ? '+' : ''}{formatCompact(totalPnl, 'USD')}
                  <span className="text-xs font-normal ml-1">
                    ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Holdings table */}
            <div className="overflow-x-auto rounded-md border border-surface-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-raised">
                    <th className="px-3 py-2 text-left font-medium text-text-muted">Symbol</th>
                    <th className="px-3 py-2 text-right font-medium text-text-muted">Weight</th>
                    <th className="px-3 py-2 text-right font-medium text-text-muted">Value</th>
                    <th className="px-3 py-2 text-right font-medium text-text-muted">P&L</th>
                    <th className="px-3 py-2 text-center font-medium text-text-muted">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.holdings.map((h) => (
                    <tr key={h.symbol} className="border-b border-surface-border/50 last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-text-primary">{h.symbol}</span>
                          {h.thesisDrift && (
                            <span className="text-warn-text text-2xs">⚠</span>
                          )}
                        </div>
                        <div className="text-2xs text-text-muted truncate max-w-[120px]">{h.sector}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary">
                        {h.weight.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary">
                        {formatCompact(h.currentValue, 'USD')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={h.pnl >= 0 ? 'text-gain-text' : 'text-loss-text'}>
                          <span className="inline-flex items-center gap-0.5">
                            {h.pnl >= 0
                              ? <TrendingUp size={10} />
                              : <TrendingDown size={10} />}
                            {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-text-secondary">
                        {h.conviction ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI response */}
          <div className="px-6 py-5 pb-8">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-4">
              AI Analysis
            </p>
            <MarkdownBlock text={aiResponse} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-5 py-3 flex-shrink-0">
          <p className="text-xs text-text-muted">
            Powered by <strong className="text-text-secondary">Claude Opus 4.6</strong>
            {' · '}{snap.holdings.length} holdings
            {symbols.length > 0 && ` · ${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? ` +${symbols.length - 5}` : ''}`}
          </p>
        </div>
      </div>
    </div>
  );
}
