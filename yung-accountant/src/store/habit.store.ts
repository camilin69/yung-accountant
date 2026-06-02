import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit } from '../types';
import { habitService } from '../services/habit.service';
import type { CreateHabitRequest, UpdateHabitRequest } from '../services/habit.service';

interface HabitStore {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchHabits: (forceRefresh?: boolean) => Promise<void>;
  addHabit: (data: CreateHabitRequest) => Promise<Habit | null>;
  updateHabit: (id: string, updates: UpdateHabitRequest) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<boolean>;
  checkHabit: (habitId: string, date: string, completed: boolean, note?: string) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchHabits: async (forceRefresh = false) => {
        const { lastFetch, ttl, habits } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && habits.length > 0) {
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const allHabits = await habitService.getAllHabits();
          set({ habits: allHabits, lastFetch: Date.now(), isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Error al cargar hábitos', isLoading: false });
        }
      },

      addHabit: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const result = await habitService.createHabit(data);
          await get().fetchHabits(true);
          set({ isLoading: false });
          return get().habits.find(h => h.id === result.id) || null;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateHabit: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await habitService.updateHabit(id, updates);
          set((state) => ({
            habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      deleteHabit: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await habitService.deleteHabit(id);
          set((state) => ({
            habits: state.habits.filter(h => h.id !== id),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      checkHabit: async (habitId, date, completed, note) => {
        set({ isLoading: true, error: null });
        try {
          await habitService.checkHabit(habitId, { checkDate: date, completed, note });
          await get().fetchHabits(true);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      clearCache: () => set({ lastFetch: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'yung-accountant-habits',
    }
  )
);