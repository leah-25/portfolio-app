import { RefreshCw } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid, PageSection } from '../../components/layout/PageContainer';
import Card, { CardHeader } from '../../components/ui/Card';
import { Stat } from '../../components/ui/Stat';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function Dashboard() {
  return (
    <>
      <PageHeader
        eyebrow="2030 Target"
        title="Portfolio Overview"
        description="Last updated · just now"
        actions={
          <Button variant="ghost" size="sm">
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      <PageContainer>
        <PageSection>
          {/* KPI row */}
          <PageGrid cols={4}>
            <Card>
              <Stat label="Total Value"      value="₩214,500,000" sub="as of today" />
            </Card>
            <Card>
              <Stat label="Total Cost Basis" value="₩138,200,000" />
            </Card>
            <Card>
              <Stat label="Unrealised P&L"   value="+₩76,300,000" positive sub="+55.2%" />
            </Card>
            <Card>
              <Stat label="10x Progress"     value="15.5%"         sub="₩214.5M of ₩1.38B target" />
            </Card>
          </PageGrid>

          {/* Main content row */}
          <PageGrid cols={2}>
            {/* Allocation */}
            <Card>
              <CardHeader title="Allocation" subtitle="Current vs target weights" />
              <div className="space-y-3">
                {MOCK_ALLOCATION.map((row) => (
                  <div key={row.symbol} className="flex items-center gap-3">
                    <div className="w-12 text-xs font-semibold text-text-primary">{row.symbol}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${(row.actual / 40) * 100}%` }}
                      />
                    </div>
                    <div className="w-10 text-right text-xs num text-text-secondary">{row.actual}%</div>
                    <Badge variant={row.actual > row.target ? 'warn' : 'muted'} size="sm">
                      {row.target}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Holdings summary */}
            <Card>
              <CardHeader title="Holdings" subtitle="8 positions" />
              <div className="space-y-2">
                {MOCK_HOLDINGS.map((h) => (
                  <div key={h.symbol} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-surface-overlay flex items-center justify-center">
                        <span className="text-2xs font-bold text-text-secondary">{h.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{h.symbol}</div>
                        <div className="text-xs text-text-muted">{h.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm num text-text-primary">{h.value}</div>
                      <div className={['text-xs num', h.pnl >= 0 ? 'text-gain' : 'text-loss'].join(' ')}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </PageGrid>
        </PageSection>
      </PageContainer>
    </>
  );
}

const MOCK_ALLOCATION = [
  { symbol: 'NVDA', actual: 28, target: 25 },
  { symbol: 'MSFT', actual: 18, target: 20 },
  { symbol: 'BTC',  actual: 15, target: 15 },
  { symbol: 'TSLA', actual: 12, target: 10 },
  { symbol: 'AMZN', actual: 10, target: 12 },
];

const MOCK_HOLDINGS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp',   value: '₩60.0M', pnl: 182.4 },
  { symbol: 'MSFT', name: 'Microsoft',     value: '₩38.6M', pnl:  44.1 },
  { symbol: 'BTC',  name: 'Bitcoin',       value: '₩32.2M', pnl:  97.3 },
  { symbol: 'TSLA', name: 'Tesla',         value: '₩25.7M', pnl: -12.8 },
  { symbol: 'AMZN', name: 'Amazon',        value: '₩21.4M', pnl:  28.6 },
];
