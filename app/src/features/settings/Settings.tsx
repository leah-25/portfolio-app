import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardDivider } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useMarketStore } from '../../store/marketStore';
import { useAIStore } from '../../store/aiStore';

export default function Settings() {
  const { apiKey, refreshInterval, setApiKey, setRefreshInterval } = useMarketStore();
  const { anthropicKey, setAnthropicKey } = useAIStore();

  const [keyDraft,      setKeyDraft]      = useState(apiKey);
  const [intervalDraft, setIntervalDraft] = useState(String(refreshInterval));
  const [saved,         setSaved]         = useState(false);

  const [aiKeyDraft, setAiKeyDraft] = useState(anthropicKey);
  const [aiSaved,    setAiSaved]    = useState(false);

  function handleSave() {
    setApiKey(keyDraft);
    const mins = parseInt(intervalDraft, 10);
    setRefreshInterval(isNaN(mins) ? 5 : mins);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleAiSave() {
    setAnthropicKey(aiKeyDraft);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2500);
  }

  const dirty   = keyDraft !== apiKey || intervalDraft !== String(refreshInterval);
  const aiDirty = aiKeyDraft !== anthropicKey;

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

          {/* Market data */}
          <Card>
            <CardHeader
              title="Market Data"
              subtitle="Live price feed configuration"
            />
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-accent-subtle border border-accent-border/40 text-xs text-text-secondary leading-relaxed">
                This app uses <strong className="text-text-primary">Financial Modeling Prep</strong> for real-time quotes.
                Get a free API key at{' '}
                <a
                  href="https://financialmodelingprep.com/developer/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline hover:text-accent-hover"
                >
                  financialmodelingprep.com
                </a>
                {' '}— the free tier covers 250 requests/day, enough for personal use.
              </div>

              <Input
                label="FMP API key"
                type="password"
                placeholder="Enter your Financial Modeling Prep key"
                value={keyDraft}
                onChange={(e) => { setKeyDraft(e.target.value); setSaved(false); }}
                hint={apiKey ? 'Key saved — prices will refresh on next page load.' : 'Required for live prices.'}
              />

              <Input
                label="Auto-refresh interval (minutes)"
                type="number"
                min={0}
                max={60}
                value={intervalDraft}
                onChange={(e) => { setIntervalDraft(e.target.value); setSaved(false); }}
                hint="Set to 0 to disable automatic refresh."
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty && !saved}
                >
                  Save API settings
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-gain-text">
                    <CheckCircle2 size={13} />
                    Saved
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader
              title="AI Analysis"
              subtitle="Claude API key for portfolio analysis"
            />
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-accent-subtle border border-accent-border/40 text-xs text-text-secondary leading-relaxed">
                The <strong className="text-text-primary">Analyze Portfolio</strong> feature uses{' '}
                <strong className="text-text-primary">Claude</strong> (Anthropic) to generate
                investment insights from your holdings data.
                Get an API key at{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline hover:text-accent-hover"
                >
                  console.anthropic.com
                </a>
                . Your key is stored locally and never sent to any server other than Anthropic.
              </div>
              <Input
                label="Anthropic API key"
                type="password"
                placeholder="sk-ant-…"
                value={aiKeyDraft}
                onChange={(e) => { setAiKeyDraft(e.target.value); setAiSaved(false); }}
                hint={anthropicKey ? 'Key saved — portfolio analysis is enabled.' : 'Required for AI portfolio analysis.'}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAiSave}
                  disabled={!aiDirty && !aiSaved}
                >
                  Save AI key
                </Button>
                {aiSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-gain-text">
                    <CheckCircle2 size={13} />
                    Saved
                  </span>
                )}
              </div>
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
