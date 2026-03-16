import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/ids';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SnapshotHolding {
  symbol: string;
  name: string;
  type: string;
  sector: string;
  weight: number;        // 0–100
  currentValue: number;
  pnl: number;
  pnlPct: number;        // 0–100
  conviction: number | null;
  riskLevel: string;
  thesisDrift: boolean;
}

export interface PortfolioSnapshot {
  totalValue: number;
  totalCost: number;
  holdings: SnapshotHolding[];
}

export interface AnalysisNote {
  id: string;
  timestamp: number;              // Date.now()
  portfolioSnapshot: PortfolioSnapshot;
  aiResponse: string;
  symbols: string[];              // for tag display
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ResearchNotesState {
  notes: AnalysisNote[];
  saveNote: (data: Omit<AnalysisNote, 'id'>) => string;
  deleteNote: (id: string) => void;
}

export const useResearchNotesStore = create<ResearchNotesState>()(
  persist(
    (set) => ({
      notes: [],
      saveNote: (data) => {
        const id = uid();
        set((s) => ({ notes: [{ id, ...data }, ...s.notes] }));
        return id;
      },
      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'portfolio-research-notes' },
  ),
);
