import { useState } from 'react';
import { Plus, ShieldAlert, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import RiskForm from './RiskForm';
import { useRiskStore, type RiskEntry } from '../../store/riskStore';

const STATUS_VARIANT: Record<string, 'default' | 'warn' | 'gain' | 'muted'> = {
  open:       'warn',
  monitoring: 'default',
  resolved:   'gain',
};

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: RiskEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card variant="flat" hoverable>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[entry.status]} dot>
            {entry.status}
          </Badge>
          {entry.holding && <Tag size="xs">{entry.holding}</Tag>}
        </div>
        {entry.expectedDate && (
          <span className="text-2xs text-text-muted flex-shrink-0">{entry.expectedDate}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-text-primary mb-1 leading-snug">
        {entry.title}
      </p>
      <p className="text-xs text-text-muted leading-relaxed truncate-2 mb-3">
        {entry.body}
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onDelete}
          className="p-1 rounded text-text-muted hover:text-loss-text hover:bg-loss-subtle transition-colors"
          aria-label="Delete"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={onEdit}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          aria-label="Edit"
        >
          <Pencil size={13} />
        </button>
      </div>
    </Card>
  );
}

export default function Risk() {
  const { entries, deleteEntry } = useRiskStore();
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<RiskEntry | null>(null);

  const risks     = entries.filter((e) => e.kind === 'risk');
  const catalysts = entries.filter((e) => e.kind === 'catalyst');

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(e: RiskEntry) { setEditTarget(e); setFormOpen(true); }

  return (
    <>
      <PageHeader
        title="Risk & Catalysts"
        description="Risk register and upcoming catalyst tracker"
        actions={
          <Button variant="secondary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Add entry
          </Button>
        }
      />
      <PageContainer>
        <PageGrid cols={2}>
          {/* Risks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Risks</h3>
            {risks.length === 0 ? (
              <EmptyState Icon={ShieldAlert} title="No risks logged" />
            ) : (
              risks.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => openEdit(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))
            )}
          </div>

          {/* Catalysts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Catalysts</h3>
            {catalysts.length === 0 ? (
              <EmptyState Icon={ShieldAlert} title="No catalysts logged" />
            ) : (
              catalysts.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => openEdit(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))
            )}
          </div>
        </PageGrid>
      </PageContainer>

      <RiskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        entry={editTarget}
      />
    </>
  );
}
