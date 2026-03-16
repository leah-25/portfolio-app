import { useState } from 'react';
import { Plus, FileText, Sparkles, Loader2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader, CardFooter } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import HoldingForm from '../holdings/HoldingForm';
import { formatRelative } from '../../lib/formatters';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useAIStore } from '../../store/aiStore';
import { generateThesis } from '../../lib/ai/generate';
import type { HoldingRecord } from '../../store/holdingsStore';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

const CONVICTION_LABEL: Record<number, string> = {
  1: 'Tentative', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Highest',
};
const CONVICTION_VARIANT: Record<number, 'muted' | 'default' | 'warn' | 'gain' | 'accent'> = {
  1: 'muted', 2: 'default', 3: 'warn', 4: 'gain', 5: 'accent',
};

export default function Thesis() {
  const { holdings, updateHolding } = useHoldingsStore();
  const { anthropicKey } = useAIStore();
  const hasAI = USE_SERVER_KEY || !!anthropicKey;

  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState<HoldingRecord | null>(null);
  const [generating, setGenerating]   = useState<string | null>(null); // holdingId being generated
  const [genError, setGenError]       = useState<string | null>(null);

  const thesisHoldings = holdings.filter((h) => h.thesisBody.trim().length > 0);
  const noThesisHoldings = holdings.filter((h) => !h.thesisBody.trim());

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(h: HoldingRecord) { setEditTarget(h); setFormOpen(true); }

  async function handleGenerateThesis(h: HoldingRecord) {
    setGenerating(h.id);
    setGenError(null);
    try {
      const result = await generateThesis(
        { symbol: h.symbol, name: h.name, type: h.type, sector: h.sector, weight: h.weight },
        anthropicKey || undefined,
      );
      updateHolding(h.id, {
        thesisBody:   result.thesisBody,
        conviction:   result.conviction,
        lastReviewed: new Date().toISOString(),
      });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Thesis Journal"
        description="Investment conviction and drift monitoring per holding"
        actions={
          <Button variant="secondary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Add holding
          </Button>
        }
      />
      <PageContainer>
        {genError && (
          <div className="mb-4 p-3 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss-text">
            {genError}
          </div>
        )}

        {/* Holdings without a thesis — show generate prompts */}
        {hasAI && noThesisHoldings.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              No thesis yet — generate with AI
            </p>
            <div className="flex flex-wrap gap-2">
              {noThesisHoldings.map((h) => (
                <Button
                  key={h.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateThesis(h)}
                  disabled={generating !== null}
                >
                  {generating === h.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {h.symbol}
                </Button>
              ))}
            </div>
          </div>
        )}

        {thesisHoldings.length === 0 && noThesisHoldings.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="No holdings yet"
            description="Add a holding with an investment thesis to track conviction over time."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Plus size={14} />
                Add holding
              </Button>
            }
          />
        ) : thesisHoldings.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="No theses written yet"
            description={
              hasAI
                ? 'Click a symbol above to generate a thesis with AI, or edit a holding to write one manually.'
                : 'Edit a holding to add an investment thesis.'
            }
          />
        ) : (
          <PageGrid cols={2}>
            {thesisHoldings.map((h) => (
              <Card key={h.id} hoverable>
                <CardHeader
                  title={h.symbol}
                  subtitle={h.name}
                  actions={
                    <div className="flex items-center gap-2">
                      {h.thesisDrift && <Badge variant="warn" dot>Drift</Badge>}
                      {h.conviction != null && (
                        <Badge variant={CONVICTION_VARIANT[h.conviction]}>
                          {CONVICTION_LABEL[h.conviction]}
                        </Badge>
                      )}
                    </div>
                  }
                />

                {/* Conviction pips */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={[
                        'h-1 flex-1 rounded-full transition-colors',
                        h.conviction != null && n <= h.conviction
                          ? 'bg-accent'
                          : 'bg-surface-overlay',
                      ].join(' ')}
                    />
                  ))}
                </div>

                <p className="text-xs text-text-muted leading-relaxed truncate-3 mb-3">
                  {h.thesisBody}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {h.sector && <Tag size="xs">{h.sector}</Tag>}
                  <Tag size="xs">{h.type}</Tag>
                  {h.riskLevel && <Tag size="xs">{h.riskLevel} risk</Tag>}
                </div>

                <CardFooter>
                  <span className="text-xs text-text-muted">
                    Reviewed {formatRelative(h.lastReviewed ?? new Date().toISOString())}
                  </span>
                  <div className="flex items-center gap-1">
                    {hasAI && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateThesis(h)}
                        disabled={generating !== null}
                        title="Re-generate thesis with AI"
                      >
                        {generating === h.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Sparkles size={12} />}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(h)}>
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </PageGrid>
        )}
      </PageContainer>

      <HoldingForm
        holding={editTarget}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
