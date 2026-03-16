import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/ids';

export interface RebalanceEntry {
  id: string;
  date: string;      // ISO date "YYYY-MM-DD"
  action: string;    // short description of the trade(s)
  rationale: string; // reasoning
}

interface RebalanceState {
  entries: RebalanceEntry[];
  addEntry:    (entry: Omit<RebalanceEntry, 'id'>) => void;
  updateEntry: (id: string, patch: Partial<Omit<RebalanceEntry, 'id'>>) => void;
  deleteEntry: (id: string) => void;
}

const SEED: RebalanceEntry[] = [
  {
    id: 'rb1',
    date: '2025-03-15',
    action: 'Sold NVDA (+3% → +0%), bought AMZN (-2% → 0%)',
    rationale: 'NVDA drifted above target following Jan rally. Rebalanced to fund underweight AMZN position.',
  },
  {
    id: 'rb2',
    date: '2024-12-31',
    action: 'Added BTC on dip, trimmed TSLA',
    rationale: 'Year-end rebalance. BTC thesis intact, TSLA uncertainty warranted a reduce.',
  },
];

export const useRebalanceStore = create<RebalanceState>()(
  persist(
    (set) => ({
      entries: SEED,

      addEntry: (entry) =>
        set((s) => ({ entries: [{ id: uid(), ...entry }, ...s.entries] })),

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'portfolio-rebalance' },
  ),
);
