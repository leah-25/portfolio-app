import { Plus, FileText } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader, CardFooter } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { formatRelative } from '../../lib/formatters';

interface ThesisEntry {
  symbol: string;
  name: string;
  conviction: 1 | 2 | 3 | 4 | 5;
  body: string;
  lastReviewed: string;
  drift: boolean;
  tags: string[];
}

const MOCK_THESIS: ThesisEntry[] = [
  {
    symbol: 'NVDA', name: 'NVIDIA Corp', conviction: 5,
    body: 'NVDA is the infrastructure layer of the AI supercycle. GPU dominance in training workloads is near-unassailable through 2027. Blackwell ramp adds an additional growth vector. The moat is CUDA + ecosystem lock-in, not just hardware.',
    lastReviewed: '2025-03-10T00:00:00Z', drift: false,
    tags: ['AI infrastructure', 'semiconductors', 'monopoly'],
  },
  {
    symbol: 'TSLA', name: 'Tesla', conviction: 3,
    body: 'Auto thesis under pressure from BEV competition. Long-term bull case rests on FSD monetisation and energy storage. Position sized conservatively. Monitoring closely.',
    lastReviewed: '2025-01-15T00:00:00Z', drift: true,
    tags: ['EV', 'autonomy', 'monitoring'],
  },
  {
    symbol: 'BTC', name: 'Bitcoin', conviction: 4,
    body: 'Digital gold narrative strengthened by ETF approval and institutional adoption. Halvening in April 2024 a structural tailwind. Holding as portfolio insurance / asymmetric upside.',
    lastReviewed: '2025-02-28T00:00:00Z', drift: false,
    tags: ['crypto', 'macro hedge', 'store of value'],
  },
];

const CONVICTION_LABEL: Record<number, string> = {
  1: 'Tentative', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Highest',
};
const CONVICTION_VARIANT: Record<number, 'muted' | 'default' | 'warn' | 'gain' | 'accent'> = {
  1: 'muted', 2: 'default', 3: 'warn', 4: 'gain', 5: 'accent',
};

export default function Thesis() {
  return (
    <>
      <PageHeader
        title="Thesis Journal"
        description="Investment conviction and drift monitoring per holding"
        actions={
          <Button variant="secondary" size="sm">
            <Plus size={14} />
            Add thesis
          </Button>
        }
      />
      <PageContainer>
        {MOCK_THESIS.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="No theses recorded"
            description="Document your investment rationale for each holding to track conviction over time."
          />
        ) : (
          <PageGrid cols={2}>
            {MOCK_THESIS.map((t) => (
              <Card key={t.symbol} hoverable>
                <CardHeader
                  title={t.symbol}
                  subtitle={t.name}
                  actions={
                    <div className="flex items-center gap-2">
                      {t.drift && <Badge variant="warn" dot>Drift</Badge>}
                      <Badge variant={CONVICTION_VARIANT[t.conviction]}>
                        {CONVICTION_LABEL[t.conviction]}
                      </Badge>
                    </div>
                  }
                />

                {/* Conviction pips */}
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map((n) => (
                    <div
                      key={n}
                      className={[
                        'h-1 flex-1 rounded-full transition-colors',
                        n <= t.conviction ? 'bg-accent' : 'bg-surface-overlay',
                      ].join(' ')}
                    />
                  ))}
                </div>

                <p className="text-xs text-text-muted leading-relaxed truncate-3 mb-3">
                  {t.body}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {t.tags.map((tag) => <Tag key={tag} size="xs">{tag}</Tag>)}
                </div>

                <CardFooter>
                  <span className="text-xs text-text-muted">
                    Reviewed {formatRelative(t.lastReviewed)}
                  </span>
                  <Button variant="ghost" size="sm">Edit</Button>
                </CardFooter>
              </Card>
            ))}
          </PageGrid>
        )}
      </PageContainer>
    </>
  );
}
