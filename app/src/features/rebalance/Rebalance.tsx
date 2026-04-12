import { useState } from 'react';
import { Plus, ArrowLeftRight, Pencil, Trash2, Sparkles, Loader2, Check, X } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import RebalanceLogForm from './RebalanceLogForm';
import { useRebalanceStore, type RebalanceEntry } from '../../store/rebalanceStore';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useAIStore } from '../../store/aiStore';
import { useMarketStore } from '../../store/marketStore';
import { usePortfolioGoalStore } from '../../store/portfolioStore';
import {
  generateRebalanceSuggestion,
  generateTargetAllocations,
  buildGoalContext,
  type RebalanceRow,
  type GeneratedTargetAllocation,
} from '../../lib/ai/generate';
import { fetchNewsContext } from '../../lib/marketData/polygonNews';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

// ── Inline-editable target cell ───────────────────────────────────────────────
function TargetCell({
  value,
  pending,
  onChange,
  onSave,
  onDiscard,
}: {
  value: number | null;
  pending: boolean;   // unsaved AI or manual edit
  onChange: (v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState('');

  function startEdit() {
    setLocal(value != null ? String(value) : '');
    setEditing(true);
  }

  function commit() {
    onChange(local);
    onSave();
    setEditing(false);
  }

  function cancel() {
    onDiscard();
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          step={5}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className="w-16 text-right text-xs bg-surface-overlay border border-border-default rounded px-1 py-0.5 focus:outline-none focus:border-accent"
        />
        <span className="text-xs text-text-muted">%</span>
        <button onClick={commit} className="text-gain-text hover:opacity-80"><Check size={12} /></button>
        <button onClick={cancel} className="text-text-muted hover:text-text-primary"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 justify-end cursor-pointer group"
      onClick={startEdit}
      title="Click to edit target"
    >
      {value != null ? (
        <span className={`text-xs tabular-nums ${pending ? 'text-accent font-semibold' : 'text-text-muted'}`}>
          {value}%
        </span>
      ) : (
        <span className="text-2xs text-text-muted italic group-hover:text-accent">set target</span>
      )}
      {pending && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className="text-gain-text hover:opacity-80"
            title="Save"
          >
            <Check size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDiscard(); }}
            className="text-text-muted hover:text-text-primary"
            title="Discard"
          >
            <X size={11} />
          </button>
        </div>
      )}
      {!pending && value == null && (
        <Pencil size={10} className="opacity-0 group-hover:opacity-60 text-accent transition-opacity" />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Rebalance() {
  const { entries, deleteEntry }       = useRebalanceStore();
  const { holdings, updateHolding }            = useHoldingsStore();
  const { anthropicKey }                       = useAIStore();
  const { apiKey: marketApiKey, provider }     = useMarketStore();
  const { goalMultiple, goalYear }             = usePortfolioGoalStore();
  const hasAI = USE_SERVER_KEY || !!anthropicKey;
  const hasPolygonNews = provider === 'polygon' && !!marketApiKey;

  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<RebalanceEntry | null>(null);
  const [formPrefill, setFormPrefill]   = useState<{ action?: string; rationale?: string } | undefined>();

  // Per-symbol pending target edits (not yet saved to holdings store)
  const [pendingTargets, setPendingTargets] = useState<Record<string, number | null>>({});
  // AI-suggested targets with rationales (shown as a preview panel)
  const [aiSuggestions, setAiSuggestions]   = useState<GeneratedTargetAllocation[] | null>(null);

  const [generatingTargets, setGeneratingTargets]   = useState(false);
  const [generatingActions, setGeneratingActions]   = useState(false);
  const [genError, setGenError]                     = useState<string | null>(null);

  // Actual cash = whatever isn't allocated to holdings
  const cashActual = parseFloat(
    Math.max(0, 100 - holdings.reduce((s, h) => s + h.weight, 0)).toFixed(1),
  );
  const cashSuggestion = aiSuggestions?.find((s) => s.symbol === 'CASH') ?? null;

  // Build rows combining live holdings + pending edits
  const allRows = holdings.map((h) => {
    const pendingVal = pendingTargets[h.symbol];
    const effectiveTarget = pendingVal !== undefined ? pendingVal : h.targetWeight;
    return {
      id:          h.id,
      symbol:      h.symbol,
      target:      effectiveTarget,
      actual:      parseFloat(h.weight.toFixed(1)),
      delta:       effectiveTarget != null
                     ? parseFloat((h.weight - effectiveTarget).toFixed(1))
                     : null,
      pnlPct:      h.pnlPct,
      conviction:  h.conviction,
      thesisDrift: h.thesisDrift,
      thesisBody:  h.thesisBody,
      riskLevel:   h.riskLevel,
      sector:      h.sector,
      hasPending:  pendingVal !== undefined,
    };
  }).sort((a, b) => (b.target ?? 0) - (a.target ?? 0));

  // Build rows for AI action suggestion (only those with a target)
  const rowsForAction: RebalanceRow[] = allRows
    .filter((r) => r.target != null)
    .map((r) => ({
      symbol:      r.symbol,
      target:      r.target!,
      actual:      r.actual,
      delta:       r.delta!,
      pnlPct:      r.pnlPct,
      conviction:  r.conviction,
      thesisBody:  r.thesisBody,
      thesisDrift: r.thesisDrift,
      riskLevel:   r.riskLevel,
      sector:      r.sector,
    }));

  const pendingCount = Object.keys(pendingTargets).length;

  // ── Target helpers ──────────────────────────────────────────────────────────
  function setPending(symbol: string, raw: string) {
    const v = raw === '' ? null : parseFloat(raw);
    setPendingTargets((prev) => ({ ...prev, [symbol]: isNaN(v as number) ? null : v }));
  }

  function saveTarget(id: string, symbol: string) {
    if (pendingTargets[symbol] !== undefined) {
      updateHolding(id, { targetWeight: pendingTargets[symbol] });
      setPendingTargets((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
    }
  }

  function discardTarget(symbol: string) {
    setPendingTargets((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
    setAiSuggestions((prev) => prev ? prev.filter((s) => s.symbol !== symbol) : prev);
  }

  function saveAllPending() {
    holdings.forEach((h) => {
      if (pendingTargets[h.symbol] !== undefined) {
        updateHolding(h.id, { targetWeight: pendingTargets[h.symbol] });
      }
    });
    setPendingTargets({});
    setAiSuggestions(null);
  }

  // ── AI: suggest targets ─────────────────────────────────────────────────────
  async function handleSuggestTargets() {
    setGeneratingTargets(true);
    setGenError(null);
    try {
      const symbols = holdings.map((h) => h.symbol);
      const newsContext = hasPolygonNews
        ? await fetchNewsContext(symbols, marketApiKey)
        : undefined;

      const results = await generateTargetAllocations(
        holdings.map((h) => ({
          symbol: h.symbol, name: h.name, type: h.type, sector: h.sector,
          weight: h.weight, pnlPct: h.pnlPct, conviction: h.conviction,
          thesisDrift: h.thesisDrift, riskLevel: h.riskLevel,
        })),
        anthropicKey || undefined,
        newsContext,
        buildGoalContext(goalMultiple, goalYear),
      );
      // Persist AI targets immediately so they survive navigation
      results.forEach((r) => {
        const h = holdings.find((h) => h.symbol === r.symbol);
        if (h) updateHolding(h.id, { targetWeight: r.targetWeight });
      });
      setAiSuggestions(results);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingTargets(false);
    }
  }

  // ── AI: suggest action ──────────────────────────────────────────────────────
  async function handleSuggestAction() {
    if (rowsForAction.length === 0) return;
    setGeneratingActions(true);
    setGenError(null);
    try {
      const symbols = rowsForAction.map((r) => r.symbol);
      const newsContext = hasPolygonNews
        ? await fetchNewsContext(symbols, marketApiKey)
        : undefined;

      const result = await generateRebalanceSuggestion(
        rowsForAction,
        anthropicKey || undefined,
        newsContext,
        buildGoalContext(goalMultiple, goalYear),
      );
      setEditTarget(null);
      setFormPrefill({ action: result.action, rationale: result.rationale });
      setFormOpen(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingActions(false);
    }
  }

  function openAdd()                  { setEditTarget(null); setFormPrefill(undefined); setFormOpen(true); }
  function openEdit(e: RebalanceEntry){ setEditTarget(e);    setFormPrefill(undefined); setFormOpen(true); }

  const generating = generatingTargets || generatingActions;

  return (
    <>
      <PageHeader
        title="Rebalance"
        description="Set target weights, track drift, and log decisions"
        actions={
          <div className="flex items-center gap-2">
            {hasAI && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSuggestAction}
                disabled={generating || rowsForAction.length === 0}
                title="AI suggests a rebalance trade based on current drift"
              >
                {generatingActions ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Suggest action
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={14} />
              Log decision
            </Button>
          </div>
        }
      />

      <PageContainer>
        {genError && (
          <div className="mb-4 p-3 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss-text">
            {genError}
          </div>
        )}

        <PageGrid cols={2}>
          {/* ── Allocation table ── */}
          <div className="space-y-3">
            <Card padding="none">
              <CardHeader
                title="Target vs Actual"
                subtitle={
                  pendingCount > 0
                    ? `${pendingCount} unsaved target${pendingCount > 1 ? 's' : ''} — click ✓ to save`
                    : 'Click any target to edit inline'
                }
                padded
                actions={
                  pendingCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button variant="primary" size="sm" onClick={saveAllPending}>
                        <Check size={12} />
                        Save all
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setPendingTargets({}); setAiSuggestions(null); }}>
                        Discard
                      </Button>
                    </div>
                  ) : hasAI && holdings.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestTargets}
                      disabled={generatingTargets}
                      title="AI suggests target weights for all holdings"
                    >
                      {generatingTargets ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Suggest targets
                    </Button>
                  ) : undefined
                }
              />
              {holdings.length === 0 ? (
                <div className="px-4 pb-4 text-xs text-text-muted">
                  Add holdings to set targets and track drift.
                </div>
              ) : (
                <Table flush>
                  <Thead>
                    <Tr>
                      <Th>Symbol</Th>
                      <Th numeric>Target</Th>
                      <Th numeric>Actual</Th>
                      <Th numeric>Drift</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {allRows.map((r) => (
                      <Tr key={r.symbol}>
                        <Td>
                          <span className="font-semibold text-text-primary">{r.symbol}</span>
                        </Td>
                        <Td numeric>
                          <TargetCell
                            value={r.target ?? null}
                            pending={r.hasPending}
                            onChange={(v) => setPending(r.symbol, v)}
                            onSave={() => saveTarget(r.id, r.symbol)}
                            onDiscard={() => discardTarget(r.symbol)}
                          />
                        </Td>
                        <Td numeric>{r.actual.toFixed(1)}%</Td>
                        <Td
                          numeric
                          sentiment={
                            r.delta == null ? 'neutral'
                            : r.delta > 0.5 ? 'loss'
                            : r.delta < -0.5 ? 'gain'
                            : 'neutral'
                          }
                        >
                          {r.delta != null
                            ? `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(1)}%`
                            : '—'}
                        </Td>
                      </Tr>
                    ))}
                    {cashSuggestion && (() => {
                      const cashTarget = cashSuggestion.targetWeight;
                      const cashDelta  = parseFloat((cashActual - cashTarget).toFixed(1));
                      return (
                        <Tr key="CASH">
                          <Td>
                            <span className="font-semibold text-text-muted">CASH</span>
                          </Td>
                          <Td numeric>
                            <span className="text-xs tabular-nums text-text-muted">{cashTarget}%</span>
                          </Td>
                          <Td numeric>
                            <span className="text-xs tabular-nums text-text-muted">{cashActual.toFixed(1)}%</span>
                          </Td>
                          <Td
                            numeric
                            sentiment={
                              cashDelta > 0.5 ? 'gain'
                              : cashDelta < -0.5 ? 'loss'
                              : 'neutral'
                            }
                          >
                            {`${cashDelta > 0 ? '+' : ''}${cashDelta.toFixed(1)}%`}
                          </Td>
                        </Tr>
                      );
                    })()}
                  </Tbody>
                </Table>
              )}
            </Card>

            {/* AI target rationales */}
            {aiSuggestions && aiSuggestions.length > 0 && (
              <Card variant="flat" padding="sm">
                <p className="text-2xs font-semibold text-accent uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Sparkles size={10} /> AI target rationales
                </p>
                <ul className="space-y-1">
                  {aiSuggestions.filter((s) => s.symbol !== 'CASH').map((s) => (
                    <li key={s.symbol} className="text-xs text-text-muted leading-relaxed">
                      <span className="font-semibold text-text-primary">{s.symbol} {s.targetWeight}%</span>
                      {' — '}{s.rationale}
                    </li>
                  ))}
                  {cashSuggestion && (
                    <li key="CASH" className="text-xs text-text-muted leading-relaxed border-t border-border-subtle pt-1 mt-1">
                      <span className="font-semibold text-text-muted">CASH {cashSuggestion.targetWeight}%</span>
                      {' — '}{cashSuggestion.rationale}
                    </li>
                  )}
                </ul>
              </Card>
            )}
          </div>

          {/* ── Decision log ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Decision History</h3>
            {entries.length === 0 ? (
              <EmptyState
                Icon={ArrowLeftRight}
                title="No decisions logged"
                description="Record rebalance decisions with rationale to build an audit trail."
                action={
                  <Button variant="primary" size="sm" onClick={openAdd}>
                    <Plus size={14} />
                    Log first decision
                  </Button>
                }
              />
            ) : (
              entries.map((entry) => (
                <Card key={entry.id} variant="flat">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="default">{entry.date}</Badge>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1 rounded text-text-muted hover:text-loss-text hover:bg-loss-subtle transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">{entry.action}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{entry.rationale}</p>
                </Card>
              ))
            )}
          </div>
        </PageGrid>
      </PageContainer>

      <RebalanceLogForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        entry={editTarget}
        prefill={formPrefill}
      />
    </>
  );
}
