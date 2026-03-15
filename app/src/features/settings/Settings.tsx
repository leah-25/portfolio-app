import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardDivider } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useMarketStore } from '../../store/marketStore';
import { useAIStore } from '../../store/aiStore';
import type { ProviderName } from '../../lib/marketData';

export default function Settings() {
  const { apiKey, provider, refreshInterval, setApiKey, setProvider, setRefreshInterval } = useMarketStore();
  const { anthropicKey, setAnthropicKey } = useAIStore();

  const [keyDraft,      setKeyDraft]      = useState(apiKey);
  const [providerDraft, setProviderDraft] = useState<ProviderName>(provider);
  const [intervalDraft, setIntervalDraft] = useState(String(refreshInterval));
  const [saved,         setSaved]         = useState(false);

  const [aiKeyDraft, setAiKeyDraft] = useState(anthropicKey);
  const [aiSaved,    setAiSaved]    = useState(false);

  function handleSave() {
    setApiKey(keyDraft);
    setProvider(providerDraft);
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

  const dirty   = keyDraft !== apiKey || providerDraft !== provider || intervalDraft !== String(refreshInterval);
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
              <Select
                label="Data provider"
                value={providerDraft}
                onChange={(e) => { setProviderDraft(e.target.value as ProviderName); setSaved(false); }}
                options={[
                  { value: 'fmp',     label: 'Financial Modeling Prep (FMP)' },
                  { value: 'polygon', label: 'Polygon.io' },
                ]}
              />

              {providerDraft === 'fmp' && (
                <div className="p-3 rounded-lg bg-accent-subtle border border-accent-border/40 text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Financial Modeling Prep</strong> — free tier covers 250 requests/day.
                  Get a key at{' '}
                  <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noreferrer"
                    className="text-accent underline hover:text-accent-hover">
                    financialmodelingprep.com
                  </a>.
                </div>
              )}

              {providerDraft === 'polygon' && (
                <div className="p-3 rounded-lg bg-accent-subtle border border-accent-border/40 text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Polygon.io</strong> — free tier includes end-of-day data; paid plans add real-time.
                  Get a key at{' '}
                  <a href="https://polygon.io/dashboard/signup" target="_blank" rel="noreferrer"
                    className="text-accent underline hover:text-accent-hover">
                    polygon.io
                  </a>.
                </div>
              )}

              <Input
                label={providerDraft === 'polygon' ? 'Polygon API key' : 'FMP API key'}
                type="password"
                placeholder={providerDraft === 'polygon' ? 'Enter your Polygon.io key' : 'Enter your Financial Modeling Prep key'}
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
              {import.meta.env.VITE_USE_SERVER_KEY === 'true' ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gain-subtle border border-gain-border text-xs text-text-secondary leading-relaxed">
                  <ShieldCheck size={15} className="text-gain-text mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary mb-0.5">Server-side API key configured</p>
                    <p>
                      The Anthropic API key is loaded from <code className="font-mono text-text-primary">.env.local</code> on
                      the server. It is never sent to the browser. Portfolio analysis is enabled.
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                    . Your key is stored locally in the browser.
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
                </>
              )}
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
