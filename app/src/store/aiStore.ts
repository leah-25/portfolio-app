import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedStockDetail } from '../lib/analysis/stockDetail';

interface AnalysisCache {
  key: string;      // fingerprint of portfolio structure when analysis was run
  text: string;     // cached analysis text
  timestamp: number;
}

export interface StockDetailCacheEntry {
  data: GeneratedStockDetail;
  timestamp: number;
}

interface AIState {
  anthropicKey: string;
  analysisCache: AnalysisCache | null;
  stockDetailCache: Record<string, StockDetailCacheEntry>;
  setAnthropicKey: (key: string) => void;
  setAnalysisCache: (key: string, text: string) => void;
  clearAnalysisCache: () => void;
  setStockDetailCache: (symbol: string, data: GeneratedStockDetail) => void;
  clearStockDetailCache: (symbol: string) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      anthropicKey: '',
      analysisCache: null,
      stockDetailCache: {},
      setAnthropicKey: (key) => set({ anthropicKey: key.trim() }),
      setAnalysisCache: (key, text) =>
        set({ analysisCache: { key, text, timestamp: Date.now() } }),
      clearAnalysisCache: () => set({ analysisCache: null }),
      setStockDetailCache: (symbol, data) =>
        set((s) => ({
          stockDetailCache: {
            ...s.stockDetailCache,
            [symbol]: { data, timestamp: Date.now() },
          },
        })),
      clearStockDetailCache: (symbol) =>
        set((s) => {
          const next = { ...s.stockDetailCache };
          delete next[symbol];
          return { stockDetailCache: next };
        }),
    }),
    {
      name: 'portfolio-ai',
      partialize: (s) => ({
        anthropicKey: s.anthropicKey,
        analysisCache: s.analysisCache,
        stockDetailCache: s.stockDetailCache,
      }),
    },
  ),
);
