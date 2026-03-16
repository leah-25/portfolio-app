import { useState } from 'react';
import { Plus, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import PageContainer from '../../components/layout/PageContainer';
import NoteCard from '../../components/ui/NoteCard';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AnalysisNoteDetail from './AnalysisNoteDetail';
import NoteForm from './NoteForm';
import NoteDetail from './NoteDetail';
import { useResearchNotesStore, type AnalysisNote } from '../../store/researchNotesStore';
import { useNotesStore, type ManualNote } from '../../store/notesStore';
import { useHoldingsStore } from '../../store/holdingsStore';
import { useAIStore } from '../../store/aiStore';
import { usePortfolioGoalStore } from '../../store/portfolioStore';
import { generateNote, buildGoalContext } from '../../lib/ai/generate';

const USE_SERVER_KEY = import.meta.env.VITE_USE_SERVER_KEY === 'true';

const TABS = [
  { key: 'weekly',    label: 'Weekly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'ai',        label: 'AI Analysis' },
];

function formatNoteDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function noteExcerpt(aiResponse: string): string {
  const firstPara = aiResponse.split('\n').find(
    (l) => l.trim() && !l.startsWith('#')
  ) ?? '';
  return firstPara.replace(/\*\*/g, '').slice(0, 160);
}

export default function Notes() {
  const [tab, setTab] = useState<'weekly' | 'quarterly' | 'ai'>('weekly');
  const [search, setSearch] = useState('');
  const [selectedAiNote, setSelectedAiNote]         = useState<AnalysisNote | null>(null);
  const [selectedManualNote, setSelectedManualNote] = useState<ManualNote | null>(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [aiPrefill, setAiPrefill] = useState<Record<string, string> | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

  const { notes: aiNotes, deleteNote: deleteAiNote } = useResearchNotesStore();
  const { notes: manualNotes } = useNotesStore();
  const { holdings } = useHoldingsStore();
  const { anthropicKey } = useAIStore();
  const { goalMultiple, goalYear } = usePortfolioGoalStore();
  const hasAI = USE_SERVER_KEY || !!anthropicKey;

  const typedNotes = manualNotes.filter((n) => n.type === (tab as 'weekly' | 'quarterly'));

  const filteredManual = search
    ? typedNotes.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : typedNotes;

  const filteredAI = search
    ? aiNotes.filter((n) =>
        n.symbols.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        n.aiResponse.toLowerCase().includes(search.toLowerCase())
      )
    : aiNotes;

  async function handleGenerateNote() {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generateNote(
        holdings.map((h) => ({ symbol: h.symbol, weight: h.weight, thesisDrift: h.thesisDrift })),
        tab === 'ai' ? 'weekly' : tab,
        anthropicKey || undefined,
        buildGoalContext(goalMultiple, goalYear),
      );
      setAiPrefill({
        type:   tab === 'ai' ? 'weekly' : tab,
        period: result.period,
        title:  result.title,
        body:   result.body,
        tags:   result.tags.join(', '),
      });
      setFormOpen(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function openBlankForm() {
    setAiPrefill(undefined);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Research Notes"
        description="Weekly check-ins, quarterly reviews, and AI analysis snapshots"
        actions={
          tab !== 'ai' ? (
            <div className="flex items-center gap-2">
              {hasAI && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateNote}
                  disabled={generating || holdings.length === 0}
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Generate with AI
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={openBlankForm}>
                <Plus size={14} />
                New note
              </Button>
            </div>
          ) : undefined
        }
      />
      <PageContainer>
        {genError && (
          <div className="mb-4 p-3 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss-text">
            {genError}
          </div>
        )}

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
                <div className="flex items-center gap-2">
                  {hasAI && (
                    <Button variant="secondary" size="sm" onClick={handleGenerateNote} disabled={generating}>
                      {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      Generate with AI
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={openBlankForm}>
                    <Plus size={14} />
                    Write manually
                  </Button>
                </div>
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
                  excerpt={note.body.slice(0, 160)}
                  tags={note.tags}
                  updatedAt={note.updatedAt}
                  onClick={() => setSelectedManualNote(note)}
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
                  onClick={() => setSelectedAiNote(note)}
                />
              ))}
            </div>
          )
        )}
      </PageContainer>

      {/* AI detail panel */}
      <AnalysisNoteDetail
        note={selectedAiNote}
        onClose={() => setSelectedAiNote(null)}
        onDelete={(id) => { deleteAiNote(id); setSelectedAiNote(null); }}
      />

      {/* Manual note detail panel */}
      <NoteDetail
        note={selectedManualNote}
        onClose={() => setSelectedManualNote(null)}
      />

      {/* Add / edit note form */}
      <NoteForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setAiPrefill(undefined); }}
        defaultType={tab === 'ai' ? 'weekly' : tab}
        prefill={aiPrefill}
      />
    </>
  );
}
