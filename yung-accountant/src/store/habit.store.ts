import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit, HabitCheck } from '../types';
import { habitService } from '../services/habit.service';
import type { CreateHabitRequest, UpdateHabitRequest } from '../services/habit.service';
import { shouldSkipFetch, generateTempId, isOfflineMutationError, isOptimistic } from '../services/offlineHelper';
import { getLocalISOString } from '../utils/formatters';

interface PendingCheck {
  tempHabitId: string;
  habitName: string;
  date: string;
  completed: boolean;
  note: string;
}

interface HabitStore {
  habits: Habit[];
  pendingChecks: PendingCheck[];
  _needsRefresh: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchHabits: (forceRefresh?: boolean) => Promise<void>;
  addHabit: (data: CreateHabitRequest) => Promise<Habit | null>;
  updateHabit: (id: string, updates: UpdateHabitRequest) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<boolean>;
  checkHabit: (habitId: string, date: string, completed: boolean, note?: string) => Promise<boolean>;
  replayPendingChecks: () => Promise<void>;
  clearCache: () => void;
  clearError: () => void;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      pendingChecks: [],
      _needsRefresh: false,
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchHabits: async (forceRefresh = false) => {
        const { lastFetch, ttl, habits } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && habits.length > 0) {
          return;
        }
        if (shouldSkipFetch(habits.length > 0)) return;
        set({ isLoading: true, error: null });
        try {
          const allHabits = await habitService.getAllHabits();
          const prevRealNames = new Set(
            get().habits.filter(h => !isOptimistic(h.id)).map(h => h.name),
          );
          set({ habits: allHabits, lastFetch: Date.now(), _needsRefresh: false, isLoading: false });

          const pending = get().pendingChecks;
          if (pending.length > 0) {
            const freshHabits = get().habits;
            const newHabits = freshHabits.filter(h => !prevRealNames.has(h.name));
            const now = new Date();
            const maxAge = 2 * 24 * 60 * 60 * 1000;
            const remaining: PendingCheck[] = [];
            for (const pc of pending) {
              // Drop stale entries older than 2 days
              if (now.getTime() - new Date(pc.date).getTime() > maxAge) continue;
              const match = newHabits.find(
                h => h.name === pc.habitName && !isOptimistic(h.id),
              );
              if (match) {
                try {
                  await habitService.checkHabit(match.id, {
                    checkDate: pc.date, completed: pc.completed, note: pc.note,
                  });
                } catch {
                  remaining.push(pc);
                }
              } else {
                remaining.push(pc);
              }
            }
            set({ pendingChecks: remaining });
          }
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
          if (isOfflineMutationError(error)) {
            const tempId = generateTempId('hab');
            const optimistic: Habit = {
              id: tempId,
              userId: '',
              name: data.name,
              isActive: true,
              currentStreak: 0,
              bestStreak: 0,
              checks: [],
              createdAt: getLocalISOString(),
            };
            set((state) => ({
              habits: [...state.habits, optimistic],
              _needsRefresh: true,
              isLoading: false,
            }));
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return optimistic;
          }
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateHabit: async (id, updates) => {
        if (isOptimistic(id)) {
          set((state) => ({
            habits: state.habits.map(h => h.id === id ? ({ ...h, ...updates } as Habit) : h),
            isLoading: false,
          }));
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().habits;
        set((state) => ({
          habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h),
        }));
        try {
          await habitService.updateHabit(id, updates);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ habits: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      deleteHabit: async (id) => {
        if (isOptimistic(id)) {
          set((state) => ({
            habits: state.habits.filter(h => h.id !== id),
            pendingChecks: state.pendingChecks.filter(pc => pc.tempHabitId !== id),
            isLoading: false,
          }));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().habits;
        set((state) => ({
          habits: state.habits.filter(h => h.id !== id),
          pendingChecks: state.pendingChecks.filter(pc => pc.tempHabitId !== id),
        }));
        try {
          await habitService.deleteHabit(id);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ habits: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      checkHabit: async (habitId, date, completed, note) => {
        const habit = get().habits.find(h => h.id === habitId);

        if (isOptimistic(habitId)) {
          const tempCheckId = generateTempId('hchk');
          set((state) => ({
            habits: state.habits.map(h => {
              if (h.id !== habitId) return h;
              const existingChecks: HabitCheck[] = h.checks || [];
              const newCheck: HabitCheck = { id: tempCheckId, habitId, checkDate: date, completed, note: note || '' };
              const idx = existingChecks.findIndex(c => c.checkDate === date);
              const newChecks = idx >= 0 ? existingChecks.map((c, i) => i === idx ? newCheck : c) : [newCheck, ...existingChecks];
              return { ...h, checks: newChecks };
            }),
            pendingChecks: [...state.pendingChecks, { tempHabitId: habitId, habitName: habit?.name || '', date, completed, note: note || '' }],
            isLoading: false,
          }));
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().habits;
        try {
          await habitService.checkHabit(habitId, { checkDate: date, completed, note });
          await get().fetchHabits(true);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            const tempCheckId = generateTempId('hchk');
            set((state) => ({
              habits: state.habits.map(h => {
                if (h.id !== habitId) return h;
                const existingChecks: HabitCheck[] = h.checks || [];
                const newCheck: HabitCheck = { id: tempCheckId, habitId, checkDate: date, completed, note: note || '' };
                const idx = existingChecks.findIndex(c => c.checkDate === date);
                const newChecks = idx >= 0 ? existingChecks.map((c, i) => i === idx ? newCheck : c) : [newCheck, ...existingChecks];
                return { ...h, checks: newChecks };
              }),
              _needsRefresh: true,
              isLoading: false,
            }));
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ habits: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      replayPendingChecks: async () => {
        const stillPending = get().pendingChecks;
        if (stillPending.length === 0) return;
        const now = new Date();
        const maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in ms
        const remaining: PendingCheck[] = [];
        let staleCount = 0;
        for (const pc of stillPending) {
          // Drop entries whose check date is older than 2 days —
          // the habit must have been synced by now, these are zombie entries
          // from past sessions triggering uncalled-for habit fetches.
          const checkDate = new Date(pc.date);
          if (now.getTime() - checkDate.getTime() > maxAge) {
            staleCount++;
            continue;
          }
          const match = get().habits.find(
            h => h.name === pc.habitName && !isOptimistic(h.id),
          );
          if (match) {
            try {
              await habitService.checkHabit(match.id, {
                checkDate: pc.date, completed: pc.completed, note: pc.note,
              });
            } catch {
              remaining.push(pc);
            }
          } else {
            remaining.push(pc);
          }
        }
        if (staleCount > 0 || remaining.length < stillPending.length) {
          set({ pendingChecks: remaining });
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
