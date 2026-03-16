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

const SEED: RiskEntry[] = [
  { id: 'r1', kind: 'risk',     holding: 'NVDA', status: 'monitoring', title: 'Export controls on advanced GPUs',        body: "US-China trade tensions could limit Nvidia's China datacenter revenue (~20% of total). Monitor policy announcements." },
  { id: 'r2', kind: 'risk',     holding: 'TSLA', status: 'open',       title: 'BEV market share erosion',                body: "BYD and legacy OEMs accelerating EV production. Tesla's pricing power declining. High risk to margin thesis." },
  { id: 'r3', kind: 'catalyst', holding: 'NVDA', status: 'open',       title: 'Blackwell GPU full ramp — Q2 2025',        body: 'Full production ramp expected Q2 2025. Success would validate $8B+ datacenter revenue quarter and re-rate the stock.', expectedDate: 'Q2 2025' },
  { id: 'r4', kind: 'catalyst', holding: 'BTC',  status: 'open',       title: 'Bitcoin halvening — April 2024',           body: 'Supply shock historically precedes 12-18mo bull runs. ETF inflows add a new demand vector absent in previous cycles.', expectedDate: 'Apr 2024' },
  { id: 'r5', kind: 'risk',     holding: null,   status: 'monitoring', title: 'Macro: Fed rate path uncertainty',         body: 'Higher-for-longer scenario pressures all growth holdings. Portfolio is 85% growth assets. Key risk to monitor.' },
  { id: 'r6', kind: 'catalyst', holding: 'META', status: 'resolved',   title: 'Reality Labs losses narrowing',            body: 'Q4 2024 showed smaller RL losses than expected. AI integration driving ad revenue. Thesis confirmed.' },
];

export const useRiskStore = create<RiskState>()(
  persist(
    (set) => ({
      entries: SEED,

      addEntry: (entry) =>
        set((s) => ({ entries: [...s.entries, { id: uid(), ...entry }] })),

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'portfolio-risk' },
  ),
);
