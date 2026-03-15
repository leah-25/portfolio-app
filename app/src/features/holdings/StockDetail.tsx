import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, Clock, BarChart2, BookOpen,
  ArrowLeftRight, ShieldAlert, Zap,
} from 'lucide-react';
import PageContainer, { PageGrid } from '../../components/layout/PageContainer';
import Card, { CardHeader, CardDivider } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tag from '../../components/ui/Tag';
import ConvictionPips from '../../components/ui/ConvictionPips';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { formatCurrency, formatPct, formatDate } from '../../lib/formatters';

// ── Mock data catalogue ───────────────────────────────────────────────────────

interface StockData {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
  sector: string;
  description: string;
  // Position snapshot
  currentPrice: number;
  quantity: number;
  currentValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
  weight: number;
  targetWeight: number;
  // Thesis
  conviction: 1 | 2 | 3 | 4 | 5;
  thesisUpdatedAt: string;
  thesisBody: string;
  bullCase: string[];
  bearCase: string[];
  // Drift history
  driftHistory: { date: string; conviction: number; note: string }[];
  // KPIs
  kpis: { metric: string; target: string; current: string; status: 'on-track' | 'watch' | 'miss' }[];
  // Risks
  risks: { title: string; status: 'open' | 'monitoring' | 'resolved'; body: string }[];
  // Catalysts
  catalysts: { title: string; date: string; status: 'pending' | 'confirmed' | 'passed' }[];
  // Linked notes
  notes: { id: string; period: string; title: string; updatedAt: string }[];
  // Rebalance history
  rebalances: { date: string; action: string; rationale: string }[];
}

const MOCK_CATALOGUE: Record<string, StockData> = {
  NVDA: {
    symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', sector: 'Semiconductors',
    description: 'NVIDIA designs and manufactures graphics processing units (GPUs) and system-on-chip units (SoCs). The company leads the AI compute infrastructure market through its CUDA software ecosystem and Hopper/Blackwell GPU architectures, serving hyperscaler data centres, cloud providers, and autonomous vehicle platforms.',
    currentPrice: 880, quantity: 45, currentValue: 57_600, costBasis: 220,
    pnl: 47_700, pnlPct: 481.8, weight: 28.0, targetWeight: 25,
    conviction: 5,
    thesisUpdatedAt: '2025-03-10T00:00:00Z',
    thesisBody: 'NVDA is the infrastructure backbone of the AI supercycle. The CUDA moat is a decade-long competitive advantage — switching costs are enormous for hyperscalers who have built their entire ML stack on it. The Blackwell ramp in H1 2025 sets up another step-change in data-centre revenue. I am targeting $8B+ quarterly data-centre revenue by Q3 2025. The risk is a macro-driven CapEx pause, but even in that scenario NVDA retains its architectural lead. Maintaining full 28% position with high conviction.',
    bullCase: [
      'CUDA ecosystem moat makes switching costs prohibitive for hyperscalers.',
      'Blackwell GPU ramp accelerates revenue — NIM inference demand is structurally new.',
      'Sovereign AI (government clusters) opens a completely new TAM not in consensus models.',
      'Gross margins at 73%+ as software and services layer matures.',
    ],
    bearCase: [
      'US export controls on H200/B200 chips to China could remove ~15–20% of revenue.',
      'AMD MI300X traction at Microsoft and Meta is higher than expected.',
      'Hyperscaler custom silicon (TPU v5, Trainium 3) reduces long-term dependency.',
      'Valuation at ~30× forward sales already prices in significant execution.',
    ],
    driftHistory: [
      { date: '2023-01-15', conviction: 3, note: 'Initial position. Thesis: AI compute cycle beginning. Cautious on timing.' },
      { date: '2023-05-25', conviction: 4, note: 'Post Q1 earnings blow-out. Data-centre revenue trajectory confirmed. Raised conviction.' },
      { date: '2023-11-22', conviction: 5, note: 'Hopper ramp exceeded expectations. CapEx commitments from hyperscalers are structural. Maximum conviction.' },
      { date: '2025-03-10', conviction: 5, note: 'Blackwell on-track. Thesis fully intact. No change.' },
    ],
    kpis: [
      { metric: 'Data Centre Revenue (quarterly)',  target: '$8B+',  current: '$7.2B', status: 'watch' },
      { metric: 'Gross Margin',                     target: '73%+',  current: '73.5%', status: 'on-track' },
      { metric: 'Blackwell Shipment Ramp',          target: 'Q2 2025', current: 'On schedule', status: 'on-track' },
      { metric: 'China Revenue Share',              target: '<10%',  current: '~12%', status: 'watch' },
      { metric: 'AMD GPU Market Share (data centre)', target: '<15%', current: '~11%', status: 'on-track' },
    ],
    risks: [
      { title: 'US export controls on H200/B200 to China', status: 'monitoring', body: 'Department of Commerce restrictions could block ~20% of revenue. Monitor Q2 policy announcements.' },
      { title: 'AMD MI300X hyperscaler adoption', status: 'monitoring', body: 'Microsoft and Meta running workloads on MI300X. Share is non-trivial. Watching guidance commentary.' },
      { title: 'Valuation multiple compression', status: 'open', body: 'At 30× forward sales, any earnings miss or guidance reduction would cause significant de-rating.' },
    ],
    catalysts: [
      { title: 'Blackwell GPU full production ramp', date: 'Q2 2025', status: 'pending' },
      { title: 'Q1 2025 earnings report',            date: 'May 2025', status: 'pending' },
      { title: 'GTC developer conference',           date: 'Mar 2025', status: 'confirmed' },
      { title: 'Hopper ramp Q1 2024',                date: 'Q1 2024', status: 'passed' },
    ],
    notes: [
      { id: 'n1', period: 'Week 11 · 2025', title: 'NVDA earnings preview — data center demand holding strong', updatedAt: '2025-03-10T14:22:00Z' },
      { id: 'n2', period: 'Q1 2025',        title: 'Q1 portfolio review — rebalance, thesis drift assessment',  updatedAt: '2025-03-31T12:00:00Z' },
    ],
    rebalances: [
      { date: '2025-03-15', action: 'Reduced 3% → back to 25% target', rationale: 'NVDA drifted +3% above target following Jan rally. Sold partial position to fund AMZN underweight.' },
      { date: '2024-01-15', action: 'Added lot — 10 shares at $495',    rationale: 'Pre-Blackwell accumulation. Conviction raised to 5/5 after H100 demand data.' },
    ],
  },
  TSLA: {
    symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', sector: 'Automotive / EV',
    description: "Tesla designs and manufactures electric vehicles, battery storage systems, and solar energy products. The company's long-term thesis rests on full self-driving (FSD) as a software-defined revenue stream and energy storage as a standalone business, rather than automotive volumes alone.",
    currentPrice: 210, quantity: 60, currentValue: 22_920, costBasis: 185,
    pnl: 11_820, pnlPct: 106.7, weight: 11.1, targetWeight: 10,
    conviction: 3,
    thesisUpdatedAt: '2024-11-15T00:00:00Z',
    thesisBody: "The core automotive thesis is under pressure — BYD's pricing aggression and broader OEM EV push are compressing Tesla's pricing power and margin. I'm holding, but conviction has dropped from 4 to 3. The thesis now rests almost entirely on FSD achieving Level 4 autonomy and the Robotaxi network launch. If FSD v13 doesn't show step-change improvement in unsupervised miles, I'll reduce the position.",
    bullCase: [
      'FSD Level 4 autonomy unlocks a robotaxi revenue model with near-100% software margins.',
      'Energy storage (Megapack) is growing 60%+ YoY and is highly profitable.',
      'Optimus robot could be a completely new product category by 2026–2027.',
    ],
    bearCase: [
      'BYD now outsells Tesla in China — pricing war erodes margins structurally.',
      'FSD has been "imminent" for 5+ years — credibility risk is high.',
      'Musk distraction (xAI, X/Twitter, DOGE) could affect product focus.',
      'Legacy OEM EVs (BMW, Mercedes, Hyundai) improving rapidly on range and UX.',
    ],
    driftHistory: [
      { date: '2022-12-29', conviction: 4, note: 'Initial position. Thesis: EV market leader + FSD optionality.' },
      { date: '2023-10-01', conviction: 4, note: 'Price cuts hurt margins but boosted volume. Watching FSD v12.' },
      { date: '2024-04-15', conviction: 3, note: 'BYD market share in China is larger than expected. Reduced conviction on automotive margin thesis.' },
      { date: '2024-11-15', conviction: 3, note: 'FSD v12 still requires intervention. Autonomous thesis not yet confirmed. Holding.' },
    ],
    kpis: [
      { metric: 'FSD Take Rate (US)',     target: '>30%',  current: '~18%',  status: 'miss' },
      { metric: 'Automotive Gross Margin', target: '>18%', current: '14.6%', status: 'miss' },
      { metric: 'Megapack Revenue (Q)',   target: '$2B+',  current: '$1.6B', status: 'watch' },
      { metric: 'China Market Share',     target: '>12%',  current: '~8%',   status: 'miss' },
    ],
    risks: [
      { title: 'BEV market share erosion', status: 'open', body: 'BYD and legacy OEMs accelerating. Pricing power declining — high risk to margin thesis.' },
      { title: 'FSD regulatory approval',  status: 'monitoring', body: 'Level 4 requires NHTSA/DMV approval. Timeline uncertain.' },
    ],
    catalysts: [
      { title: 'Robotaxi network launch', date: 'H2 2025', status: 'pending' },
      { title: 'FSD v13 unsupervised miles', date: 'Q2 2025', status: 'pending' },
      { title: 'Optimus production update', date: 'Q3 2025', status: 'pending' },
    ],
    notes: [
      { id: 'n3', period: 'Week 10 · 2025', title: 'Macro update — Fed rhetoric and impact on growth assets', updatedAt: '2025-03-03T09:10:00Z' },
    ],
    rebalances: [
      { date: '2024-12-31', action: 'Trimmed 2% — year-end rebalance', rationale: 'TSLA uncertainty warranted a small reduction. Freed capital for BTC accumulation on dip.' },
    ],
  },
};

// Fallback for unknown symbols
function getFallbackData(symbol: string): StockData {
  return {
    symbol, name: symbol, type: 'stock', sector: 'Unknown',
    description: 'No company data available for this symbol.',
    currentPrice: 0, quantity: 0, currentValue: 0, costBasis: 0,
    pnl: 0, pnlPct: 0, weight: 0, targetWeight: 0,
    conviction: 3, thesisUpdatedAt: new Date().toISOString(),
    thesisBody: '', bullCase: [], bearCase: [], driftHistory: [],
    kpis: [], risks: [], catalysts: [], notes: [], rebalances: [],
  };
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-text-muted flex-shrink-0" />}
            {title}
          </span>
        }
      />
      <CardDivider />
      <div className="pt-1">{children}</div>
    </Card>
  );
}


// ── KPI status icon ───────────────────────────────────────────────────────────

const KPI_META = {
  'on-track': { icon: CheckCircle2, class: 'text-gain-text', label: 'On track' },
  'watch':    { icon: Clock,        class: 'text-warn-text',  label: 'Watch'    },
  'miss':     { icon: XCircle,      class: 'text-loss-text',  label: 'Miss'     },
};

// ── Catalyst status ───────────────────────────────────────────────────────────

const CATALYST_META = {
  pending:   { variant: 'warn'    as const, dot: true  },
  confirmed: { variant: 'accent'  as const, dot: true  },
  passed:    { variant: 'muted'   as const, dot: false },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StockDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const upper = symbol.toUpperCase();
  const data  = MOCK_CATALOGUE[upper] ?? getFallbackData(upper);

  const gain = data.pnl >= 0;

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="border-b border-surface-border bg-surface-raised/40 px-6 py-5">
        {/* Breadcrumb */}
        <Link
          to="/holdings"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary mb-3 transition-colors"
        >
          <ChevronLeft size={13} />
          Holdings
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">{data.symbol}</h1>
              <Badge variant={data.type === 'crypto' ? 'warn' : 'accent'}>{data.type.toUpperCase()}</Badge>
              <Tag size="sm">{data.sector}</Tag>
            </div>
            <p className="text-sm text-text-muted">{data.name}</p>
          </div>

          {/* Position stats strip */}
          <div className="flex flex-wrap gap-6">
            <HeroStat label="Current Value" value={formatCurrency(data.currentValue, 'USD')} />
            <HeroStat
              label="Total P&L"
              value={`${gain ? '+' : ''}${formatPct(data.pnlPct)}`}
              sub={`${gain ? '+' : ''}${formatCurrency(data.pnl, 'USD')}`}
              sentiment={gain ? 'gain' : 'loss'}
            />
            <HeroStat label="Avg Cost" value={formatCurrency(data.costBasis, 'USD')} sub={`${data.quantity} units`} />
            <HeroStat
              label="Weight"
              value={`${data.weight.toFixed(1)}%`}
              sub={`Target ${data.targetWeight}%`}
              sentiment={data.weight > data.targetWeight + 0.5 ? 'warn' : undefined}
            />
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <PageContainer>
        <div className="space-y-5">

          {/* Row 1: Summary + Thesis */}
          <PageGrid cols={2}>
            {/* Company summary */}
            <Section title="Company Summary" icon={BarChart2}>
              <p className="text-sm text-text-secondary leading-relaxed">{data.description}</p>
            </Section>

            {/* Current thesis */}
            <Section title="Current Thesis" icon={BookOpen}>
              <div className="flex items-center justify-between mb-3">
                <ConvictionPips value={data.conviction} showLabel />
                <span className="text-2xs text-text-muted">
                  Updated {formatDate(data.thesisUpdatedAt)}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{data.thesisBody}</p>
            </Section>
          </PageGrid>

          {/* Row 2: Bull / Bear */}
          <PageGrid cols={2}>
            <BullBearCard type="bull" points={data.bullCase} />
            <BullBearCard type="bear" points={data.bearCase} />
          </PageGrid>

          {/* Row 3: Thesis drift tracker (full width) */}
          <Section title="Thesis Drift Tracker" icon={TrendingUp}>
            {data.driftHistory.length === 0 ? (
              <p className="text-sm text-text-muted">No conviction history recorded.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-surface-border" />
                <ol className="space-y-5 pl-10">
                  {[...data.driftHistory].reverse().map((entry, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? entry.conviction - prev.conviction : 0;
                    return (
                      <li key={i} className="relative">
                        {/* Dot */}
                        <div className={[
                          'absolute -left-10 top-0.5 w-[14px] h-[14px] rounded-full border-2 border-surface-raised flex items-center justify-center',
                          entry.conviction >= 4 ? 'bg-accent' : entry.conviction === 3 ? 'bg-warn-DEFAULT' : 'bg-surface-muted',
                        ].join(' ')} />

                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-text-muted num">{formatDate(entry.date)}</span>
                          <ConvictionPips value={entry.conviction} size="sm" />
                          {delta !== 0 && (
                            <span className={`text-2xs font-semibold ${delta > 0 ? 'text-gain-text' : 'text-loss-text'}`}>
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{entry.note}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </Section>

          {/* Row 4: KPI watchlist (full width) */}
          <Section title="KPI Watchlist" icon={BarChart2}>
            {data.kpis.length === 0 ? (
              <EmptyState Icon={BarChart2} title="No KPIs tracked" />
            ) : (
              <Table flush>
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th numeric>Target</Th>
                    <Th numeric>Current</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.kpis.map((kpi, i) => {
                    const meta = KPI_META[kpi.status];
                    const KpiIcon = meta.icon;
                    return (
                      <Tr key={i}>
                        <Td>
                          <span className="text-sm font-medium text-text-primary">{kpi.metric}</span>
                        </Td>
                        <Td numeric muted>{kpi.target}</Td>
                        <Td numeric>
                          <span className="font-medium text-text-primary">{kpi.current}</span>
                        </Td>
                        <Td>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.class}`}>
                            <KpiIcon size={13} strokeWidth={2} />
                            {meta.label}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </Section>

          {/* Row 5: Risk log + Catalyst timeline */}
          <PageGrid cols={2}>
            {/* Risk log */}
            <Section title="Risk Log" icon={ShieldAlert}>
              {data.risks.length === 0 ? (
                <EmptyState Icon={ShieldAlert} title="No risks logged" />
              ) : (
                <div className="space-y-3">
                  {data.risks.map((r, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Badge
                          variant={r.status === 'open' ? 'warn' : r.status === 'monitoring' ? 'default' : 'gain'}
                          dot
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary mb-0.5 leading-snug">{r.title}</p>
                        <p className="text-xs text-text-muted leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Catalyst timeline */}
            <Section title="Catalyst Timeline" icon={Zap}>
              {data.catalysts.length === 0 ? (
                <EmptyState Icon={Zap} title="No catalysts logged" />
              ) : (
                <div className="space-y-3">
                  {data.catalysts.map((c, i) => {
                    const meta = CATALYST_META[c.status];
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Badge variant={meta.variant} dot={meta.dot} size="sm">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={[
                            'text-sm font-semibold leading-snug',
                            c.status === 'passed' ? 'text-text-muted' : 'text-text-primary',
                          ].join(' ')}>
                            {c.title}
                          </p>
                          <p className="text-2xs text-text-muted mt-0.5 num">{c.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </PageGrid>

          {/* Row 6: Linked notes + Rebalance history */}
          <PageGrid cols={2}>
            {/* Linked research notes */}
            <Section title="Linked Research Notes" icon={BookOpen}>
              {data.notes.length === 0 ? (
                <EmptyState Icon={BookOpen} title="No linked notes" />
              ) : (
                <div className="space-y-2">
                  {data.notes.map((note) => (
                    <Link
                      key={note.id}
                      to="/notes"
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface hover:bg-surface-overlay border border-surface-border hover:border-surface-muted transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted mb-0.5">{note.period}</p>
                        <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-accent transition-colors line-clamp-2">
                          {note.title}
                        </p>
                      </div>
                      <span className="text-2xs text-text-muted flex-shrink-0 mt-0.5 num">
                        {formatDate(note.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            {/* Rebalance history */}
            <Section title="Rebalance History" icon={ArrowLeftRight}>
              {data.rebalances.length === 0 ? (
                <EmptyState Icon={ArrowLeftRight} title="No rebalances recorded" />
              ) : (
                <div className="space-y-3">
                  {data.rebalances.map((r, i) => (
                    <div key={i} className="border-l-2 border-surface-border pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" size="sm">{formatDate(r.date)}</Badge>
                      </div>
                      <p className="text-sm font-medium text-text-primary mb-1">{r.action}</p>
                      <p className="text-xs text-text-muted leading-relaxed">{r.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </PageGrid>

        </div>
      </PageContainer>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  sub,
  sentiment,
}: {
  label: string;
  value: string;
  sub?: string;
  sentiment?: 'gain' | 'loss' | 'warn';
}) {
  const sentimentMap: Record<string, string> = {
    gain: 'text-gain-text',
    loss: 'text-loss-text',
    warn: 'text-warn-text',
  };
  const valueClass = sentiment ? sentimentMap[sentiment] : 'text-text-primary';

  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold num leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-2xs text-text-muted num mt-0.5">{sub}</p>}
    </div>
  );
}

function BullBearCard({ type, points }: { type: 'bull' | 'bear'; points: string[] }) {
  const isBull = type === 'bull';
  return (
    <Card>
      <CardHeader
        title={
          <span className={`flex items-center gap-2 ${isBull ? 'text-gain-text' : 'text-loss-text'}`}>
            {isBull
              ? <TrendingUp  size={15} className="flex-shrink-0" />
              : <TrendingDown size={15} className="flex-shrink-0" />}
            {isBull ? 'Bull Case' : 'Bear Case'}
          </span>
        }
      />
      <CardDivider />
      <div className="pt-1">
        {points.length === 0 ? (
          <p className="text-sm text-text-muted">No points recorded.</p>
        ) : (
          <ul className="space-y-2.5">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={`flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${isBull ? 'bg-gain-DEFAULT' : 'bg-loss-DEFAULT'}`} />
                <p className="text-sm text-text-secondary leading-relaxed">{p}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
