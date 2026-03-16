import { Plus, ArrowLeftRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

const MOCK_TARGETS = [
  { symbol: 'NVDA', target: 25, actual: 28.0, delta: +3.0 },
  { symbol: 'MSFT', target: 20, actual: 18.0, delta: -2.0 },
  { symbol: 'BTC',  target: 15, actual: 15.0, delta:  0.0 },
  { symbol: 'TSLA', target: 10, actual: 12.0, delta: +2.0 },
  { symbol: 'AMZN', target: 12, actual: 10.0, delta: -2.0 },
  { symbol: 'ETH',  target:  8, actual:  6.7, delta: -1.3 },
  { symbol: 'META', target:  6, actual:  6.4, delta: +0.4 },
  { symbol: 'PLTR', target:  4, actual:  4.0, delta:  0.0 },
];

const MOCK_LOG = [
  { date: '2025-03-15', action: 'Sold NVDA (+3% → +0%), bought AMZN (-2% → 0%)', rationale: 'NVDA drifted above target following Jan rally. Rebalanced to fund underweight AMZN position.' },
  { date: '2024-12-31', action: 'Added BTC on dip, trimmed TSLA', rationale: 'Year-end rebalance. BTC thesis intact, TSLA uncertainty warranted a reduce.' },
];

export default function Rebalance() {
  return (
    <>
      <PageHeader
        title="Rebalance Log"
        description="Target allocation vs current weights and decision history"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={14} />
            Log decision
          </Button>
        }
      />
      <PageContainer>
        <PageGrid cols={2}>
          {/* Target vs Actual */}
          <Card padding="none">
            <CardHeader title="Target vs Actual" subtitle="Drift from target weight" padded />
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
                {MOCK_TARGETS.map((r) => (
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
          </Card>

          {/* Decision log */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Decision History</h3>
            {MOCK_LOG.length === 0 ? (
              <EmptyState
                Icon={ArrowLeftRight}
                title="No decisions logged"
                description="Record rebalance decisions with rationale to build an audit trail."
              />
            ) : (
              MOCK_LOG.map((entry, i) => (
                <Card key={i} variant="flat">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="default">{entry.date}</Badge>
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">{entry.action}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{entry.rationale}</p>
                </Card>
              ))
            )}
          </div>
        </PageGrid>
      </PageContainer>
    </>
  );
}
