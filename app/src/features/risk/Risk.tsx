import { Plus, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

interface RiskEntry {
  id: string;
  kind: 'risk' | 'catalyst';
  holding: string | null;
  title: string;
  body: string;
  status: 'open' | 'monitoring' | 'resolved';
  expectedDate?: string;
}

const MOCK: RiskEntry[] = [
  { id: '1', kind: 'risk',     holding: 'NVDA', status: 'monitoring', title: 'Export controls on advanced GPUs',          body: 'US-China trade tensions could limit Nvidia\'s China datacenter revenue (~20% of total). Monitor policy announcements.' },
  { id: '2', kind: 'risk',     holding: 'TSLA', status: 'open',       title: 'BEV market share erosion',                  body: 'BYD and legacy OEMs accelerating EV production. Tesla\'s pricing power declining. High risk to margin thesis.' },
  { id: '3', kind: 'catalyst', holding: 'NVDA', status: 'open',       title: 'Blackwell GPU full ramp — Q2 2025',          body: 'Full production ramp expected Q2 2025. Success would validate $8B+ datacenter revenue quarter and re-rate the stock.', expectedDate: 'Q2 2025' },
  { id: '4', kind: 'catalyst', holding: 'BTC',  status: 'open',       title: 'Bitcoin halvening — April 2024',             body: 'Supply shock historically precedes 12-18mo bull runs. ETF inflows add a new demand vector absent in previous cycles.', expectedDate: 'Apr 2024' },
  { id: '5', kind: 'risk',     holding: null,   status: 'monitoring', title: 'Macro: Fed rate path uncertainty',           body: 'Higher-for-longer scenario pressures all growth holdings. Portfolio is 85% growth assets. Key risk to monitor.' },
  { id: '6', kind: 'catalyst', holding: 'META', status: 'resolved',   title: 'Reality Labs losses narrowing',              body: 'Q4 2024 showed smaller RL losses than expected. AI integration driving ad revenue. Thesis confirmed.' },
];

const STATUS_VARIANT: Record<string, 'default' | 'warn' | 'gain' | 'muted'> = {
  open:       'warn',
  monitoring: 'default',
  resolved:   'gain',
};

export default function Risk() {
  const risks     = MOCK.filter((e) => e.kind === 'risk');
  const catalysts = MOCK.filter((e) => e.kind === 'catalyst');

  return (
    <>
      <PageHeader
        title="Risk & Catalysts"
        description="Risk register and upcoming catalyst tracker"
        actions={
          <Button variant="secondary" size="sm">
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
                <Card key={entry.id} variant="flat" hoverable>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[entry.status]} dot>
                        {entry.status}
                      </Badge>
                      {entry.holding && <Tag size="xs">{entry.holding}</Tag>}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-text-primary mb-1 leading-snug">
                    {entry.title}
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed truncate-2">
                    {entry.body}
                  </p>
                </Card>
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
                <Card key={entry.id} variant="flat" hoverable>
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
                  <p className="text-xs text-text-muted leading-relaxed truncate-2">
                    {entry.body}
                  </p>
                </Card>
              ))
            )}
          </div>
        </PageGrid>
      </PageContainer>
    </>
  );
}
