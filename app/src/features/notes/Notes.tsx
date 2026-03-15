import { useState } from 'react';
import { Plus, BookOpen, Sparkles } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import NoteCard from '../../components/ui/NoteCard';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AnalysisNoteDetail from './AnalysisNoteDetail';
import { useResearchNotesStore, type AnalysisNote } from '../../store/researchNotesStore';

const TABS = [
  { key: 'weekly',    label: 'Weekly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'ai',        label: 'AI Analysis' },
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

function formatNoteDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function noteExcerpt(aiResponse: string): string {
  // First non-empty line that isn't a heading
  const firstPara = aiResponse.split('\n').find(
    (l) => l.trim() && !l.startsWith('#')
  ) ?? '';
  return firstPara.replace(/\*\*/g, '').slice(0, 160);
}

export default function Notes() {
  const [tab, setTab] = useState<'weekly' | 'quarterly' | 'ai'>('weekly');
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<AnalysisNote | null>(null);

  const { notes: aiNotes, deleteNote } = useResearchNotesStore();

  const manualNotes = tab === 'weekly' ? MOCK_WEEKLY : MOCK_QUARTERLY;

  const filteredManual = search
    ? manualNotes.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : manualNotes;

  const filteredAI = search
    ? aiNotes.filter((n) =>
        n.symbols.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        n.aiResponse.toLowerCase().includes(search.toLowerCase())
      )
    : aiNotes;

  return (
    <>
      <PageHeader
        title="Research Notes"
        description="Weekly check-ins, quarterly reviews, and AI analysis snapshots"
        actions={
          tab !== 'ai' ? (
            <Button variant="primary" size="sm">
              <Plus size={14} />
              New note
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as typeof tab)} />
          <div className="w-56">
            <Input
              placeholder="Search notes…"
              className="h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Manual notes (weekly / quarterly) */}
        {tab !== 'ai' && (
          filteredManual.length === 0 ? (
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
              {filteredManual.map((note) => (
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
          )
        )}

        {/* AI Analysis notes */}
        {tab === 'ai' && (
          filteredAI.length === 0 ? (
            <EmptyState
              Icon={Sparkles}
              title="No AI analyses saved yet"
              description={
                search
                  ? 'No analyses match your search.'
                  : 'Run an AI analysis from the dashboard or holdings page, then click "Save" to create a snapshot here.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAI.map((note) => (
                <NoteCard
                  key={note.id}
                  type="ai"
                  period={formatNoteDate(note.timestamp)}
                  title={`AI Analysis · ${new Date(note.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                  excerpt={noteExcerpt(note.aiResponse)}
                  tags={note.symbols.slice(0, 6)}
                  updatedAt={new Date(note.timestamp).toISOString()}
                  onClick={() => setSelectedNote(note)}
                />
              ))}
            </div>
          )
        )}
      </PageContainer>

      {/* Detail panel */}
      <AnalysisNoteDetail
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onDelete={(id) => { deleteNote(id); setSelectedNote(null); }}
      />
    </>
  );
}
