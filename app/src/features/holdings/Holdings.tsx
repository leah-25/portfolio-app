import { Plus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import { Table, Thead, Tbody, Tr, Th, Td, TableEmpty } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const MOCK_ROWS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp',      type: 'stock',  qty: 85,      cost: '₩32.8M', value: '₩60.0M', pnl: '+₩27.2M', pnlPct: +82.9, weight: 28.0 },
  { symbol: 'MSFT', name: 'Microsoft',         type: 'stock',  qty: 110,     cost: '₩26.8M', value: '₩38.6M', pnl: '+₩11.8M', pnlPct: +44.0, weight: 18.0 },
  { symbol: 'BTC',  name: 'Bitcoin',           type: 'crypto', qty: 0.52,    cost: '₩16.3M', value: '₩32.2M', pnl: '+₩15.9M', pnlPct: +97.5, weight: 15.0 },
  { symbol: 'TSLA', name: 'Tesla',             type: 'stock',  qty: 200,     cost: '₩29.4M', value: '₩25.7M', pnl: '−₩3.7M',  pnlPct: -12.6, weight: 12.0 },
  { symbol: 'AMZN', name: 'Amazon',            type: 'stock',  qty: 120,     cost: '₩16.6M', value: '₩21.4M', pnl: '+₩4.8M',  pnlPct: +28.9, weight: 10.0 },
  { symbol: 'ETH',  name: 'Ethereum',          type: 'crypto', qty: 4.2,     cost: '₩9.8M',  value: '₩14.3M', pnl: '+₩4.5M',  pnlPct: +45.9, weight:  6.7 },
  { symbol: 'META', name: 'Meta Platforms',    type: 'stock',  qty: 55,      cost: '₩11.2M', value: '₩13.8M', pnl: '+₩2.6M',  pnlPct: +23.2, weight:  6.4 },
  { symbol: 'PLTR', name: 'Palantir',          type: 'stock',  qty: 900,     cost: '₩7.3M',  value: '₩8.5M',  pnl: '+₩1.2M',  pnlPct: +16.4, weight:  4.0 },
];

export default function Holdings() {
  return (
    <>
      <PageHeader
        title="Holdings"
        description="All positions, lots, and current P&L"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={14} />
            Add lot
          </Button>
        }
      />
      <PageContainer flush>
        <div className="px-6 md:px-8">
          <Table>
            <Thead>
              <Tr>
                <Th width="160px">Asset</Th>
                <Th>Type</Th>
                <Th numeric>Quantity</Th>
                <Th numeric>Cost basis</Th>
                <Th numeric>Value</Th>
                <Th numeric>P&L</Th>
                <Th numeric>Weight</Th>
              </Tr>
            </Thead>
            <Tbody>
              {MOCK_ROWS.length === 0
                ? <TableEmpty cols={7} message="No holdings yet — add your first lot." />
                : MOCK_ROWS.map((row) => (
                  <Tr key={row.symbol} clickable>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center flex-shrink-0">
                          <span className="text-2xs font-bold text-text-secondary">{row.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{row.symbol}</div>
                          <div className="text-xs text-text-muted">{row.name}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={row.type === 'crypto' ? 'warn' : 'default'} dot>
                        {row.type}
                      </Badge>
                    </Td>
                    <Td numeric muted>{row.qty.toLocaleString()}</Td>
                    <Td numeric muted>{row.cost}</Td>
                    <Td numeric>{row.value}</Td>
                    <Td numeric sentiment={row.pnlPct >= 0 ? 'gain' : 'loss'}>
                      <div>{row.pnl}</div>
                      <div className="text-xs">{row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(1)}%</div>
                    </Td>
                    <Td numeric muted>{row.weight.toFixed(1)}%</Td>
                  </Tr>
                ))
              }
            </Tbody>
          </Table>
        </div>
      </PageContainer>
    </>
  );
}
