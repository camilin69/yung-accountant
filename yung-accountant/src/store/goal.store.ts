import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalTransaction } from '../types';  // ← Importar de types/
import { goalService } from '../services/goal.service';
import type { CreateGoalRequest, UpdateGoalRequest, CreateGoalTransactionRequest } from '../services/goal.service';

interface GoalStore {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchGoals: (forceRefresh?: boolean) => Promise<void>;
  addGoal: (data: CreateGoalRequest) => Promise<Goal | null>;
  updateGoal: (id: string, updates: UpdateGoalRequest) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  addGoalTransaction: (goalId: string, data: Omit<CreateGoalTransactionRequest, 'goalId'>) => Promise<boolean>;
  deleteGoalTransaction: (transactionId: string) => Promise<boolean>;
  updateGoalAmount: (goalId: string, amount: number) => void;
  updateGoalTransaction: (goalId: string, transactionId: string, updates: Partial<GoalTransaction>) => void;
  clearCache: () => void;
  clearError: () => void;
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchGoals: async (forceRefresh = false) => {
        const { lastFetch, ttl, goals } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && goals.length > 0) {
          console.log('[GoalStore] Using memory cache');
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const allGoals = await goalService.getAllGoals();
          set({ goals: allGoals, lastFetch: Date.now(), isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Error al cargar metas', isLoading: false });
        }
      },

      addGoal: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const result = await goalService.createGoal(data);
          await get().fetchGoals(true);
          set({ isLoading: false });
          return get().goals.find(g => g.id === result.id) || null;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateGoal: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await goalService.updateGoal(id, updates);
          set((state): Partial<GoalStore> => ({
            goals: state.goals.map((g) => {
              if (g.id === id) {
                const updated: Goal = { 
                  ...g, 
                  ...updates,
                  priority: (updates.priority as Goal['priority']) || g.priority,
                  status: (updates.status as Goal['status']) || g.status,
                };
                if (updates.status === 'completed' && !updated.completedAt) {
                  updated.completedAt = new Date().toISOString();
                }
                return updated;
              }
              return g;
            }),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      deleteGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await goalService.deleteGoal(id);
          set((state): Partial<GoalStore> => ({
            goals: state.goals.filter(g => g.id !== id),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      addGoalTransaction: async (goalId, data) => {
        set({ isLoading: true, error: null });
        try {
          const result = await goalService.addGoalTransaction(goalId, data);
          set((state): Partial<GoalStore> => ({
            goals: state.goals.map(g =>
              g.id === goalId
                ? { 
                    ...g, 
                    transactions: [...(g.transactions || []), {
                      id: result.id,
                      goalId,
                      amount: data.amount,
                      type: data.type as 'add' | 'remove',
                      note: data.note || '',
                      date: data.date,
                      walletId: data.walletId,
                    } as GoalTransaction]
                  }
                : g
            ),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      deleteGoalTransaction: async (transactionId) => {
        set({ isLoading: true, error: null });
        try {
          await goalService.deleteGoalTransaction(transactionId);
          set((state): Partial<GoalStore> => ({
            goals: state.goals.map(g => ({
              ...g,
              transactions: (g.transactions || []).filter(t => t.id !== transactionId),
            })),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      updateGoalAmount: (goalId, amount) => {
        set((state) => ({
          goals: state.goals.map(g => {
            if (g.id === goalId) {
              const newAmount = Math.min(amount, g.targetAmount);
              const newStatus: Goal['status'] = newAmount >= g.targetAmount ? 'completed' : g.status;
              return { ...g, currentAmount: newAmount, status: newStatus };
            }
            return g;
          }),
        }));
      },

      updateGoalTransaction: (goalId, transactionId, updates) => {
        set((state) => ({
          goals: state.goals.map(g =>
            g.id === goalId
              ? {
                  ...g,
                  transactions: (g.transactions || []).map(t =>
                    t.id === transactionId ? { ...t, ...updates } as GoalTransaction : t
                  ),
                }
              : g
          ),
        }));
      },

      clearCache: () => set({ lastFetch: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'yung-accountant-goals',
    }
  )
);