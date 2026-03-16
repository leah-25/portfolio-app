import { useState } from 'react';
import { Plus, ArrowLeftRight, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react';
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
import { generateRebalanceSuggestion, type RebalanceRow } from '../../lib/ai/generate';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

export default function Rebalance() {
  const { entries, deleteEntry } = useRebalanceStore();
  const { holdings } = useHoldingsStore();
  const { anthropicKey } = useAIStore();
  const hasAI = USE_SERVER_KEY || !!anthropicKey;

  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState<RebalanceEntry | null>(null);
  const [formPrefill, setFormPrefill] = useState<{ action?: string; rationale?: string } | undefined>();
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState<string | null>(null);

  // Derive target vs actual from holdings store (enriched for AI)
  const allocationRows: RebalanceRow[] = holdings
    .filter((h) => h.targetWeight != null)
    .map((h) => ({
      symbol:      h.symbol,
      target:      h.targetWeight ?? 0,
      actual:      parseFloat(h.weight.toFixed(1)),
      delta:       parseFloat((h.weight - (h.targetWeight ?? 0)).toFixed(1)),
      pnlPct:      h.pnlPct,
      conviction:  h.conviction,
      thesisDrift: h.thesisDrift,
      riskLevel:   h.riskLevel,
      sector:      h.sector,
    }))
    .sort((a, b) => b.target - a.target);

  function openAdd() { setEditTarget(null); setFormPrefill(undefined); setFormOpen(true); }
  function openEdit(e: RebalanceEntry) { setEditTarget(e); setFormPrefill(undefined); setFormOpen(true); }

  async function handleAISuggest() {
    if (allocationRows.length === 0) return;
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generateRebalanceSuggestion(allocationRows, anthropicKey || undefined);
      setEditTarget(null);
      setFormPrefill({ action: result.action, rationale: result.rationale });
      setFormOpen(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Rebalance Log"
        description="Target allocation vs current weights and decision history"
        actions={
          <div className="flex items-center gap-2">
            {hasAI && allocationRows.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAISuggest}
                disabled={generating}
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                AI suggest
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
          {/* Target vs Actual */}
          <Card padding="none">
            <CardHeader title="Target vs Actual" subtitle="Drift from target weight" padded />
            {allocationRows.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="text-xs text-text-muted">
                  Set target weights on your holdings to see drift here.
                </p>
              </div>
            ) : (
              <Table flush>
                <Thead>
                  <Tr>
                    <Th>Symbol</Th>
                    <Th numeric>Target</Th>
                    <Th numeric>Actual</Th>
                    <Th numeric>Delta</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {allocationRows.map((r) => (
                    <Tr key={r.symbol}>
                      <Td><span className="font-semibold text-text-primary">{r.symbol}</span></Td>
                      <Td numeric muted>{r.target}%</Td>
                      <Td numeric>{r.actual.toFixed(1)}%</Td>
                      <Td numeric sentiment={r.delta > 0.5 ? 'loss' : r.delta < -0.5 ? 'gain' : 'neutral'}>
                        {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}%
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>

          {/* Decision log */}
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
