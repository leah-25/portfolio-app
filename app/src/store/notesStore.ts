import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/ids';

export interface ManualNote {
  id: string;
  type: 'weekly' | 'quarterly';
  period: string;   // e.g. "Week 11 · 2026" or "Q1 2026"
  title: string;
  body: string;
  tags: string[];
  updatedAt: string; // ISO
}

interface NotesState {
  notes: ManualNote[];
  addNote:    (note: Omit<ManualNote, 'id' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Omit<ManualNote, 'id'>>) => void;
  deleteNote: (id: string) => void;
}

const SEED: ManualNote[] = [
  {
    id: 'n1',
    type: 'weekly',
    period: 'Week 11 · 2025',
    title: 'NVDA earnings preview — data center demand holding strong',
    body: 'Ahead of the Q1 earnings, checks with channel partners suggest hyperscaler orders remain robust. The Blackwell ramp appears on track. Maintaining full position with high conviction.',
    tags: ['NVDA', 'semiconductors', 'AI'],
    updatedAt: '2025-03-10T14:22:00Z',
  },
  {
    id: 'n2',
    type: 'weekly',
    period: 'Week 10 · 2025',
    title: 'Macro update — Fed rhetoric and impact on growth assets',
    body: "Powell's tone was more hawkish than expected. Risk assets sold off broadly. TSLA hit hardest in our portfolio. Reviewed thesis and holding — fundamentals unchanged.",
    tags: ['TSLA', 'MSFT', 'macro'],
    updatedAt: '2025-03-03T09:10:00Z',
  },
  {
    id: 'n3',
    type: 'weekly',
    period: 'Week 9 · 2025',
    title: 'BTC consolidation — on-chain metrics and thesis check',
    body: 'On-chain data shows accumulation by long-term holders. ETF inflows remain positive. No thesis drift. Target allocation maintained.',
    tags: ['BTC', 'crypto'],
    updatedAt: '2025-02-24T18:45:00Z',
  },
  {
    id: 'q1',
    type: 'quarterly',
    period: 'Q1 2025',
    title: 'Q1 portfolio review — rebalance, thesis drift assessment',
    body: 'NVDA weight has drifted +3% above target following the strong Jan rally. Reducing slightly to fund AMZN position. All core theses intact. Risk register reviewed.',
    tags: ['NVDA', 'AMZN', 'rebalance'],
    updatedAt: '2025-03-31T12:00:00Z',
  },
];

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: SEED,

      addNote: (note) =>
        set((s) => ({
          notes: [{ id: uid(), updatedAt: new Date().toISOString(), ...note }, ...s.notes],
        })),

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'portfolio-notes' },
  ),
);
