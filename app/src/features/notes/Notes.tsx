import { Plus } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import NoteCard from '../../components/ui/NoteCard';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useState } from 'react';

const TABS = [
  { key: 'weekly',    label: 'Weekly' },
  { key: 'quarterly', label: 'Quarterly' },
];

const MOCK_WEEKLY = [
  {
    id: '1',
    period: 'Week 11 · 2025',
    title: 'NVDA earnings preview — data center demand holding strong',
    excerpt: 'Ahead of the Q1 earnings, checks with channel partners suggest hyperscaler orders remain robust. The Blackwell ramp appears on track. Maintaining full position with high conviction.',
    tags: ['NVDA', 'semiconductors', 'AI'],
    updatedAt: '2025-03-10T14:22:00Z',
  },
  {
    id: '2',
    period: 'Week 10 · 2025',
    title: 'Macro update — Fed rhetoric and impact on growth assets',
    excerpt: "Powell's tone was more hawkish than expected. Risk assets sold off broadly. TSLA hit hardest in our portfolio. Reviewed thesis and holding — fundamentals unchanged.",
    tags: ['TSLA', 'MSFT', 'macro'],
    updatedAt: '2025-03-03T09:10:00Z',
  },
  {
    id: '3',
    period: 'Week 9 · 2025',
    title: 'BTC consolidation — on-chain metrics and thesis check',
    excerpt: 'On-chain data shows accumulation by long-term holders. ETF inflows remain positive. No thesis drift. Target allocation maintained.',
    tags: ['BTC', 'crypto'],
    updatedAt: '2025-02-24T18:45:00Z',
  },
];

const MOCK_QUARTERLY: typeof MOCK_WEEKLY = [
  {
    id: 'q1',
    period: 'Q1 2025',
    title: 'Q1 portfolio review — rebalance, thesis drift assessment',
    excerpt: 'NVDA weight has drifted +3% above target following the strong Jan rally. Reducing slightly to fund AMZN position. All core theses intact. Risk register reviewed.',
    tags: ['NVDA', 'AMZN', 'rebalance'],
    updatedAt: '2025-03-31T12:00:00Z',
  },
];

export default function Notes() {
  const [tab, setTab] = useState<'weekly' | 'quarterly'>('weekly');
  const notes = tab === 'weekly' ? MOCK_WEEKLY : MOCK_QUARTERLY;

  return (
    <>
      <PageHeader
        title="Research Notes"
        description="Weekly check-ins and quarterly portfolio reviews"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={14} />
            New note
          </Button>
        }
      />
      <PageContainer>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as typeof tab)} />
          <div className="w-56">
            <Input placeholder="Search notes…" className="h-8 text-xs" />
          </div>
        </div>

        {/* Note list */}
        {notes.length === 0 ? (
          <EmptyState
            Icon={BookOpen}
            title={`No ${tab} notes yet`}
            description="Start recording your research to track how your thesis evolves over time."
            action={
              <Button variant="primary" size="sm">
                <Plus size={14} />
                Add first note
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                type={tab}
                period={note.period}
                title={note.title}
                excerpt={note.excerpt}
                tags={note.tags}
                updatedAt={note.updatedAt}
                onClick={() => {}}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
