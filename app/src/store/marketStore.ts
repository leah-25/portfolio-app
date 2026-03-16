import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchQuotes } from '../lib/marketData';
import type { Quote, ProviderName } from '../lib/marketData';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketState {
  // Persisted settings
  apiKey: string;
  provider: ProviderName;
  refreshInterval: number;   // minutes; 0 = disabled

  // Runtime (not persisted)
  quotes: Record<string, Quote>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;

  // Actions
  setApiKey:          (key: string)          => void;
  setProvider:        (p: ProviderName)      => void;
  setRefreshInterval: (mins: number)         => void;
  refresh:            (symbols: string[])    => Promise<void>;
  clearError:         ()                     => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      // ── Persisted defaults ──
      apiKey:          '',
      provider:        'fmp',
      refreshInterval: 5,

      // ── Runtime ──
      quotes:      {},
      loading:     false,
      error:       null,
      lastUpdated: null,

      // ── Actions ──
      setApiKey:          (key)  => set({ apiKey: key.trim(), error: null }),
      setProvider:        (p)    => set({ provider: p }),
      setRefreshInterval: (mins) => set({ refreshInterval: Math.max(0, mins) }),
      clearError: ()     => set({ error: null }),

      refresh: async (symbols) => {
        const { apiKey, provider } = get();

        if (!apiKey) {
          set({ error: 'NO_API_KEY' });
          return;
        }

        set({ loading: true, error: null });

        try {
          const list = await fetchQuotes(symbols, apiKey, provider);
          const map: Record<string, Quote> = {};
          for (const q of list) map[q.symbol] = q;
          set({ quotes: map, loading: false, lastUpdated: Date.now() });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch market data.',
          });
        }
      },
    }),
    {
      name: 'portfolio-market',
      // Only persist settings — never stale quote data
      partialize: (s) => ({
        apiKey:          s.apiKey,
        provider:        s.provider,
        refreshInterval: s.refreshInterval,
      }),
    },
  ),
);
