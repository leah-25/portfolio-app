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


export const useRebalanceStore = create<RebalanceState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => ({ entries: [{ id: uid(), ...entry }, ...s.entries] })),

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'portfolio-rebalance', version: 1 },
  ),
);
