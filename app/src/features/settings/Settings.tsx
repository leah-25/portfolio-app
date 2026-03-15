import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardDivider } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Currency, API keys, and data management"
      />
      <PageContainer narrow>
        <div className="space-y-4">
          {/* Portfolio */}
          <Card>
            <CardHeader title="Portfolio" subtitle="Core portfolio parameters" />
            <div className="space-y-4">
              <Select
                label="Base currency"
                options={[
                  { value: 'KRW', label: 'KRW — South Korean Won' },
                  { value: 'USD', label: 'USD — US Dollar' },
                ]}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Target year"     type="number" defaultValue={2030} />
                <Input label="Target multiple" type="number" defaultValue={10} />
              </div>
            </div>
          </Card>

          {/* API keys */}
          <Card>
            <CardHeader title="API Keys" subtitle="Optional — improves real-time data quality" />
            <div className="space-y-4">
              <Input
                label="Finnhub API key"
                type="password"
                placeholder="Enter your Finnhub key"
                hint="Free tier available at finnhub.io — improves stock quote reliability"
              />
              <Input
                label="Auto-refresh interval"
                type="number"
                defaultValue={5}
                hint="Minutes between automatic price updates"
              />
            </div>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader title="Data" subtitle="Export and import your portfolio data" />
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="md">Export JSON</Button>
              <Button variant="ghost" size="md">Import JSON</Button>
            </div>
            <CardDivider />
            <div>
              <p className="text-xs text-text-muted mb-3">
                All data is stored locally in your browser. No account or server required.
              </p>
              <Button variant="danger" size="sm">Clear all data</Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
