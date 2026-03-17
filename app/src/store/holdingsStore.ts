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
      holdings: [],

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
      version: 1,
    },
  ),
);
