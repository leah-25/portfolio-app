import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnalysisCache {
  key: string;      // fingerprint of portfolio structure when analysis was run
  text: string;     // cached analysis text
  timestamp: number;
}

interface AIState {
  anthropicKey: string;
  analysisCache: AnalysisCache | null;
  setAnthropicKey: (key: string) => void;
  setAnalysisCache: (key: string, text: string) => void;
  clearAnalysisCache: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      anthropicKey: '',
      analysisCache: null,
      setAnthropicKey: (key) => set({ anthropicKey: key.trim() }),
      setAnalysisCache: (key, text) =>
        set({ analysisCache: { key, text, timestamp: Date.now() } }),
      clearAnalysisCache: () => set({ analysisCache: null }),
    }),
    {
      name: 'portfolio-ai',
      partialize: (s) => ({
        anthropicKey: s.anthropicKey,
        analysisCache: s.analysisCache,
      }),
    },
  ),
);
