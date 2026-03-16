import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HoldingRecord, Lot } from '../features/holdings/types';

export type { HoldingRecord, Lot };

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Recompute each holding's weight based on currentValue totals. */
function recomputeWeights(holdings: HoldingRecord[]): HoldingRecord[] {
  const total = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (total === 0) return holdings;
  return holdings.map(h => ({ ...h, weight: (h.currentValue / total) * 100 }));
}

// ── Seed data (used only on first run; localStorage takes over after) ─────────

const SEED: HoldingRecord[] = [
  {
    id: 'h1', symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', sector: 'Semiconductors',
    quantity: 45, costBasis: 220, currentValue: 57_600, pnl: 47_700, pnlPct: 481.8,
    weight: 28.0, targetWeight: 25,
    conviction: 5, thesisDrift: false,
    thesisBody: 'Dominant GPU platform for AI training and inference. Blackwell ramp validates the data-center thesis. Hyperscaler CapEx tailwinds multi-year. Hold full position.',
    lastReviewed: '2025-03-10T00:00:00Z', riskLevel: 'medium',
    lots: [
      { date: '2022-09-14', quantity: 20, price: 135 },
      { date: '2023-02-28', quantity: 15, price: 234 },
      { date: '2024-01-15', quantity: 10, price: 495 },
    ],
  },
  {
    id: 'h2', symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', sector: 'Software',
    quantity: 30, costBasis: 260, currentValue: 34_800, pnl: 27_000, pnlPct: 346.2,
    weight: 16.9, targetWeight: 20,
    conviction: 4, thesisDrift: false,
    thesisBody: "Cloud (Azure) + AI (Copilot) flywheel. Pricing power through enterprise lock-in. OpenAI partnership adds optionality. Underweight vs target — adding on weakness.",
    lastReviewed: '2025-02-20T00:00:00Z', riskLevel: 'low',
    lots: [
      { date: '2021-11-03', quantity: 15, price: 305 },
      { date: '2022-10-17', quantity: 15, price: 215 },
    ],
  },
  {
    id: 'h3', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', sector: 'Digital Assets',
    quantity: 0.42, costBasis: 28_500, currentValue: 30_870, pnl: 18_900, pnlPct: 150.0,
    weight: 15.0, targetWeight: 15,
    conviction: 4, thesisDrift: false,
    thesisBody: 'Macro hedge and scarce digital store of value. Halvening-driven supply shocks historically precede 12-18 month bull runs. ETF inflows add a demand vector absent in prior cycles.',
    lastReviewed: '2025-03-01T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2022-12-20', quantity: 0.2,  price: 16_500 },
      { date: '2023-08-08', quantity: 0.22, price: 29_400 },
    ],
  },
  {
    id: 'h4', symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', sector: 'Automotive / EV',
    quantity: 60, costBasis: 185, currentValue: 22_920, pnl: 11_820, pnlPct: 106.7,
    weight: 11.1, targetWeight: 10,
    conviction: 3, thesisDrift: true,
    thesisBody: 'Energy storage + autonomy platform play. Core auto thesis under pressure from BYD and margin erosion. Monitoring FSD progress as the key re-rating catalyst.',
    lastReviewed: '2024-11-15T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2022-12-29', quantity: 40, price: 123 },
      { date: '2023-05-10', quantity: 20, price: 171 },
    ],
  },
  {
    id: 'h5', symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock', sector: 'E-commerce / Cloud',
    quantity: 55, costBasis: 140, currentValue: 20_075, pnl: 12_375, pnlPct: 160.7,
    weight: 9.7, targetWeight: 12,
    conviction: 4, thesisDrift: false,
    thesisBody: 'AWS margin expansion + retail profitability turn. Prime ecosystem flywheel and advertising accelerate FCF. Underweight versus target — actively adding.',
    lastReviewed: '2025-02-05T00:00:00Z', riskLevel: 'low',
    lots: [
      { date: '2022-11-22', quantity: 35, price: 94 },
      { date: '2023-09-18', quantity: 20, price: 131 },
    ],
  },
  {
    id: 'h6', symbol: 'ETH', name: 'Ethereum', type: 'crypto', sector: 'Digital Assets',
    quantity: 8.5, costBasis: 1_450, currentValue: 13_770, pnl: 1_445, pnlPct: 11.7,
    weight: 6.7, targetWeight: 8,
    conviction: 3, thesisDrift: false,
    thesisBody: 'Smart contract settlement layer. EIP-4844 lowers L2 fees. Staking yield adds carry. Underweight — thesis intact, adding after BTC confirmation.',
    lastReviewed: '2025-01-22T00:00:00Z', riskLevel: 'high',
    lots: [
      { date: '2023-06-14', quantity: 5,   price: 1_800 },
      { date: '2023-10-02', quantity: 3.5, price: 1_650 },
    ],
  },
  {
    id: 'h7', symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock', sector: 'Social / AI',
    quantity: 22, costBasis: 148, currentValue: 13_200, pnl: 9_944, pnlPct: 305.5,
    weight: 6.4, targetWeight: 6,
    conviction: 4, thesisDrift: false,
    thesisBody: "Advertising flywheel amplified by AI. Threads gaining share. Reality Labs losses narrowing. Zuckerberg's year of efficiency delivered. Full position — thesis confirmed.",
    lastReviewed: '2025-03-05T00:00:00Z', riskLevel: 'medium',
    lots: [{ date: '2022-10-31', quantity: 22, price: 148 }],
  },
  {
    id: 'h8', symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock', sector: 'Enterprise AI',
    quantity: 200, costBasis: 9.5, currentValue: 8_200, pnl: 6_300, pnlPct: 331.6,
    weight: 4.0, targetWeight: 4,
    conviction: 3, thesisDrift: true,
    thesisBody: 'AIP platform adoption driving commercial inflection. Government contracts provide baseline. Position is smaller conviction than others — monitoring commercial growth rate.',
    lastReviewed: '2024-10-18T00:00:00Z', riskLevel: 'medium',
    lots: [{ date: '2021-03-15', quantity: 200, price: 24.5 }],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewHoldingInput {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
  sector: string;
  quantity: number;
  costBasis: number;        // per unit
  purchaseDate: string;     // ISO date — used for the initial lot
  targetWeight: number | null;
  conviction: 1 | 2 | 3 | 4 | 5 | null;
  riskLevel: 'low' | 'medium' | 'high';
  thesisBody: string;
}

interface HoldingsState {
  holdings: HoldingRecord[];

  addHolding:    (input: NewHoldingInput) => void;
  updateHolding: (id: string, patch: Partial<Omit<HoldingRecord, 'id'>>) => void;
  removeHolding: (id: string) => void;
  addLot:        (id: string, lot: Lot) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useHoldingsStore = create<HoldingsState>()(
  persist(
    (set) => ({
      holdings: SEED,

      addHolding: (input) => set((state) => {
        const totalCost    = input.quantity * input.costBasis;
        const currentValue = totalCost;   // starts at cost; live price enriches later
        const newHolding: HoldingRecord = {
          id:           uid(),
          symbol:       input.symbol.toUpperCase().trim(),
          name:         input.name.trim(),
          type:         input.type,
          sector:       input.sector.trim(),
          quantity:     input.quantity,
          costBasis:    input.costBasis,
          currentValue,
          pnl:          0,
          pnlPct:       0,
          weight:       0,   // recomputed below
          targetWeight: input.targetWeight,
          conviction:   input.conviction,
          riskLevel:    input.riskLevel,
          thesisDrift:  false,
          thesisBody:   input.thesisBody.trim(),
          lastReviewed: new Date().toISOString(),
          lots: [{
            date:     input.purchaseDate,
            quantity: input.quantity,
            price:    input.costBasis,
          }],
        };
        return { holdings: recomputeWeights([...state.holdings, newHolding]) };
      }),

      updateHolding: (id, patch) => set((state) => {
        const updated = state.holdings.map(h => h.id === id ? { ...h, ...patch } : h);
        return { holdings: recomputeWeights(updated) };
      }),

      removeHolding: (id) => set((state) => ({
        holdings: recomputeWeights(state.holdings.filter(h => h.id !== id)),
      })),

      addLot: (id, lot) => set((state) => {
        const updated = state.holdings.map(h => {
          if (h.id !== id) return h;
          const newLots    = [...h.lots, lot];
          const totalQty   = newLots.reduce((s, l) => s + l.quantity, 0);
          const totalCost  = newLots.reduce((s, l) => s + l.quantity * l.price, 0);
          const costBasis  = totalQty > 0 ? totalCost / totalQty : h.costBasis;
          const currentValue = totalQty * costBasis;
          const pnl        = currentValue - totalCost;
          return { ...h, lots: newLots, quantity: totalQty, costBasis, currentValue, pnl, pnlPct: totalCost > 0 ? (pnl / totalCost) * 100 : 0 };
        });
        return { holdings: recomputeWeights(updated) };
      }),
    }),
    {
      name: 'portfolio-holdings',
    },
  ),
);
