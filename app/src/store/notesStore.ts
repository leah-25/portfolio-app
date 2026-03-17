import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/ids';

export interface ManualNote {
  id: string;
  type: 'weekly' | 'quarterly';
  period: string;   // e.g. "Week 11 · 2026" or "Q1 2026"
  title: string;
  body: string;
  tags: string[];
  updatedAt: string; // ISO
}

interface NotesState {
  notes: ManualNote[];
  addNote:    (note: Omit<ManualNote, 'id' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Omit<ManualNote, 'id'>>) => void;
  deleteNote: (id: string) => void;
}


export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (note) =>
        set((s) => ({
          notes: [{ id: uid(), updatedAt: new Date().toISOString(), ...note }, ...s.notes],
        })),

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'portfolio-notes', version: 1 },
  ),
);
