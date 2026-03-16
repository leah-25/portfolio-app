import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PortfolioGoalState {
  goalMultiple: number;   // e.g. 10 for 10×
  goalYear:     number;   // e.g. 2030

  setGoalMultiple: (v: number) => void;
  setGoalYear:     (v: number) => void;
}

export const usePortfolioGoalStore = create<PortfolioGoalState>()(
  persist(
    (set) => ({
      goalMultiple: 10,
      goalYear:     2030,

      setGoalMultiple: (v) => set({ goalMultiple: v }),
      setGoalYear:     (v) => set({ goalYear:     v }),
    }),
    { name: 'portfolio-goal' },
  ),
);
