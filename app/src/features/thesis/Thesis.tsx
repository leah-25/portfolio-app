import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
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
import type { HoldingRecord } from '../../store/holdingsStore';

const CONVICTION_LABEL: Record<number, string> = {
  1: 'Tentative', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Highest',
};
const CONVICTION_VARIANT: Record<number, 'muted' | 'default' | 'warn' | 'gain' | 'accent'> = {
  1: 'muted', 2: 'default', 3: 'warn', 4: 'gain', 5: 'accent',
};

export default function Thesis() {
  const { holdings } = useHoldingsStore();
  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState<HoldingRecord | null>(null);

  // Only show holdings with a thesis body
  const thesisHoldings = holdings.filter((h) => h.thesisBody.trim().length > 0);

  function openAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(h: HoldingRecord) {
    setEditTarget(h);
    setFormOpen(true);
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
        {thesisHoldings.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="No theses recorded"
            description="Add a holding with an investment thesis to track conviction over time."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Plus size={14} />
                Add holding
              </Button>
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
                  <Button variant="ghost" size="sm" onClick={() => openEdit(h)}>
                    Edit
                  </Button>
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
