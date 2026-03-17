import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/ids';

export interface RiskEntry {
  id: string;
  kind: 'risk' | 'catalyst';
  holding: string | null;
  title: string;
  body: string;
  status: 'open' | 'monitoring' | 'resolved';
  expectedDate?: string;
}

interface RiskState {
  entries: RiskEntry[];
  addEntry:    (entry: Omit<RiskEntry, 'id'>) => void;
  updateEntry: (id: string, patch: Partial<Omit<RiskEntry, 'id'>>) => void;
  deleteEntry: (id: string) => void;
}


export const useRiskStore = create<RiskState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => ({ entries: [...s.entries, { id: uid(), ...entry }] })),

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'portfolio-risk', version: 1 },
  ),
);
