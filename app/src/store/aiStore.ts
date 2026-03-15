import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIState {
  anthropicKey: string;
  setAnthropicKey: (key: string) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      anthropicKey: '',
      setAnthropicKey: (key) => set({ anthropicKey: key.trim() }),
    }),
    {
      name: 'portfolio-ai',
      partialize: (s) => ({ anthropicKey: s.anthropicKey }),
    },
  ),
);
