import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalTransaction } from '../types';  // ← Importar de types/
import { goalService } from '../services/goal.service';
import type { CreateGoalRequest, UpdateGoalRequest, CreateGoalTransactionRequest } from '../services/goal.service';
import { shouldSkipFetch, generateTempId, isOfflineMutationError, isOptimistic } from '../services/offlineHelper';
import { useWalletStore } from './wallet.store';
import { useTransactionStore } from './transaction.store';
import { getLocalISOString } from '../utils/formatters';

interface PendingGoalTransaction {
  tempGoalId: string;
  goalName: string;
  data: Omit<CreateGoalTransactionRequest, 'goalId'>;
}

interface GoalStore {
  goals: Goal[];
  pendingGoalTransactions: PendingGoalTransaction[];
  /** Set when a real-UUID goal is mutated offline — signals sync handler to refresh */
  _needsRefresh: boolean;
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
  replayPendingTransactions: () => Promise<void>;
  clearCache: () => void;
  clearError: () => void;
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      pendingGoalTransactions: [],
      _needsRefresh: false,
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchGoals: async (forceRefresh = false) => {
        const { lastFetch, ttl, goals } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && goals.length > 0) {
          return;
        }
        if (shouldSkipFetch(goals.length > 0)) return;
        set({ isLoading: true, error: null });
        try {
          const allGoals = await goalService.getAllGoals();
          const prevRealNames = new Set(
            get().goals.filter(g => !isOptimistic(g.id)).map(g => g.name),
          );
          set({ goals: allGoals, lastFetch: Date.now(), _needsRefresh: false, isLoading: false });

          // Replay pending goal transactions after sync
          const pending = get().pendingGoalTransactions;
          if (pending.length > 0) {
            const freshGoals = get().goals;
            const newGoals = freshGoals.filter(g => !prevRealNames.has(g.name));
            const remaining: PendingGoalTransaction[] = [];
            for (const pt of pending) {
              const match = newGoals.find(g => g.name === pt.goalName && !isOptimistic(g.id));
              if (match) {
                try {
                  await goalService.addGoalTransaction({ ...pt.data, goalId: match.id });
                } catch {
                  remaining.push(pt);
                }
              } else {
                remaining.push(pt);
              }
            }
            set({ pendingGoalTransactions: remaining });
          }
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
          useWalletStore.getState().fetchWallets(true);
          useTransactionStore.getState().fetchTransactions(true);
          return get().goals.find(g => g.id === result.id) || null;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            const tempId = generateTempId('goal');
            const optimistic: Goal = {
              id: tempId,
              userId: '',
              name: data.name,
              targetAmount: data.targetAmount,
              currentAmount: data.currentAmount || 0,
              targetDate: data.targetDate || '',
              priority: data.priority || 'medium',
              status: 'active',
              context: data.context || '',
              purchaseCategoryId: data.purchaseCategoryId || '',
              transactions: [],
            };
            set((state) => ({
              goals: [...state.goals, optimistic],
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

      updateGoal: async (id, updates) => {
        // Temp-ID goal — apply locally, skip API call (SW would queue
        // a PUT with a temp ID that fails on replay).
        if (isOptimistic(id)) {
          set((state): Partial<GoalStore> => ({
            goals: state.goals.map((g) => {
              if (g.id === id) {
                const updated: Goal = {
                  ...g, ...updates,
                  priority: (updates.priority as Goal['priority']) || g.priority,
                  status: (updates.status as Goal['status']) || g.status,
                };
                if (updates.status === 'completed' && !updated.completedAt) {
                  updated.completedAt = getLocalISOString();
                }
                return updated;
              }
              return g;
            }),
            isLoading: false,
          }));
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().goals;
        set((state): Partial<GoalStore> => ({
          goals: state.goals.map((g) => {
            if (g.id === id) {
              const updated: Goal = {
                ...g, ...updates,
                priority: (updates.priority as Goal['priority']) || g.priority,
                status: (updates.status as Goal['status']) || g.status,
              };
              if (updates.status === 'completed' && !updated.completedAt) {
                updated.completedAt = getLocalISOString();
              }
              return updated;
            }
            return g;
          }),
        }));
        try {
          await goalService.updateGoal(id, updates);
          set({ isLoading: false });
          useWalletStore.getState().fetchWallets(true);
          useTransactionStore.getState().fetchTransactions(true);
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ goals: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      deleteGoal: async (id) => {
        // Temp-ID goal — just remove locally, no API call
        if (isOptimistic(id)) {
          set((state): Partial<GoalStore> => ({
            goals: state.goals.filter(g => g.id !== id),
            pendingGoalTransactions: state.pendingGoalTransactions.filter(pt => pt.tempGoalId !== id),
            isLoading: false,
          }));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().goals;
        set((state): Partial<GoalStore> => ({
          goals: state.goals.filter(g => g.id !== id),
          pendingGoalTransactions: state.pendingGoalTransactions.filter(pt => pt.tempGoalId !== id),
        }));
        try {
          await goalService.deleteGoal(id);
          set({ isLoading: false });
          useWalletStore.getState().fetchWallets(true);
          useTransactionStore.getState().fetchTransactions(true);
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ goals: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      addGoalTransaction: async (goalId, data) => {
          // Defer if the parent goal is optimistic — the temp ID would
          // fail on the backend when the SW replays the queued request.
          if (isOptimistic(goalId)) {
            const goal = get().goals.find(g => g.id === goalId);
            const tempId = generateTempId('gtxn');
            set((state): Partial<GoalStore> => ({
              goals: state.goals.map(g =>
                g.id === goalId ? {
                  ...g,
                  transactions: [...(g.transactions || []), {
                    id: tempId, goalId, amount: data.amount,
                    type: data.type as 'add' | 'remove',
                    note: data.note || '', date: data.date,
                    walletId: data.walletId,
                  } as GoalTransaction],
                } : g
              ),
              pendingGoalTransactions: [
                ...state.pendingGoalTransactions,
                { tempGoalId: goalId, goalName: goal?.name || '', data },
              ],
              isLoading: false,
            }));
            // Adjust wallet balance: 'add' takes from wallet, 'remove' gives back
            if (data.walletId) {
              useWalletStore.getState().updateWalletBalance(
                data.walletId, data.amount, data.type === 'remove',
              );
            }
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ isLoading: true, error: null });
          const prev = get().goals;
          try {
              const result = await goalService.addGoalTransaction({ ...data, goalId });
              set((state): Partial<GoalStore> => ({
                  goals: state.goals.map(g =>
                      g.id === goalId ? {
                          ...g,
                          transactions: [...(g.transactions || []), {
                              id: result.id, goalId, amount: data.amount,
                              type: data.type as 'add' | 'remove',
                              note: data.note || '', date: data.date,
                              walletId: data.walletId,
                          } as GoalTransaction],
                      } : g
                  ),
                  isLoading: false,
              }));
              // Wallets & transactions are refreshed by the caller (UI or
              // sync handler) — no need to duplicate the calls here.
              return true;
          } catch (error: any) {
              if (isOfflineMutationError(error)) {
                const tempId = generateTempId('gtxn');
                set((state): Partial<GoalStore> => ({
                  goals: state.goals.map(g =>
                    g.id === goalId ? {
                        ...g,
                        transactions: [...(g.transactions || []), {
                          id: tempId, goalId, amount: data.amount,
                          type: data.type as 'add' | 'remove',
                          note: data.note || '', date: data.date,
                          walletId: data.walletId,
                        } as GoalTransaction],
                    } : g
                  ),
                  _needsRefresh: true,
                  isLoading: false,
                }));
                if (data.walletId) {
                  useWalletStore.getState().updateWalletBalance(
                    data.walletId, data.amount, data.type === 'remove',
                  );
                }
                window.dispatchEvent(new CustomEvent('bg-sync:pending'));
                return true;
              }
              set({ goals: prev, error: error.message, isLoading: false });
              return false;
          }
      },

      deleteGoalTransaction: async (transactionId) => {
        // Optimistic transaction — just remove from local state, no API call
        if (isOptimistic(transactionId)) {
          set((state): Partial<GoalStore> => ({
            goals: state.goals.map(g => ({
              ...g,
              transactions: (g.transactions || []).filter(t => t.id !== transactionId),
            })),
            pendingGoalTransactions: state.pendingGoalTransactions.filter(
              pt => state.goals.find(gg => gg.id === pt.tempGoalId)
            ),
          }));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().goals;
        set((state): Partial<GoalStore> => ({
          goals: state.goals.map(g => ({
            ...g,
            transactions: (g.transactions || []).filter(t => t.id !== transactionId),
          })),
        }));
        try {
          await goalService.deleteGoalTransaction(transactionId);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ goals: prev, error: error.message, isLoading: false });
          return false;
        }
      },


      replayPendingTransactions: async () => {
        // The caller already called fetchGoals(true) which internally
        // replays matching pending transactions. Here we only retry
        // leftover unmatched entries (goal name may not match newGoals).
        const stillPending = get().pendingGoalTransactions;
        if (stillPending.length === 0) return;
        // If some transactions couldn't be matched, try again with the
        // fresh goals. Re-read the array — fetchGoals may have cleared
        // the successfully replayed ones, leaving only unmatched entries.
        const remaining: PendingGoalTransaction[] = [];
        for (const pt of stillPending) {
          const match = get().goals.find(
            g => g.name === pt.goalName && !isOptimistic(g.id),
          );
          if (match) {
            try {
              await goalService.addGoalTransaction({ ...pt.data, goalId: match.id });
            } catch {
              remaining.push(pt);
            }
          } else {
            remaining.push(pt);
          }
        }
        set({ pendingGoalTransactions: remaining });
        // Wallets & transactions are refreshed by the sync handler (Layout)
        // — no need to duplicate the calls here.
      },

      clearCache: () => set({ lastFetch: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'yung-accountant-goals',
    }
  )
);