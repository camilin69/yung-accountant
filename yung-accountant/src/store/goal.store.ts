// store/goal.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalTransaction } from '../types';
import { useWalletStore } from './wallet.store';

const generateId = () => Date.now().toString();

interface GoalStore {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount' | 'status' | 'userId' | 'transactions'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addGoalTransaction: (goalId: string, transaction: Omit<GoalTransaction, 'id' | 'goalId'>) => void;
  updateGoalTransaction: (goalId: string, transactionId: string, updates: Partial<Omit<GoalTransaction, 'id' | 'goalId'>>) => void;
  deleteGoalTransaction: (goalId: string, transactionId: string) => void;
  updateGoalAmount: (goalId: string, amount: number) => void;
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      
      setGoals: (goals) => set({ goals }),
      
      addGoal: (goal) => {
        const newGoal: Goal = {
          ...goal,
          id: generateId(),
          currentAmount: 0,
          status: 'active',
          userId: '1',
          transactions: [],
          purchaseCategoryId: goal.purchaseCategoryId || '',
        };
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },
      
      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id === id) {
              const updated = { ...g, ...updates };
              if (updates.status === 'completed' && !updated.completedAt) {
                updated.completedAt = new Date().toISOString();
              }
              return updated;
            }
            return g;
          }),
        }));
      },
      
      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }));
      },
      
      addGoalTransaction: (goalId, transaction) => {
        const newTransaction: GoalTransaction = {
          ...transaction,
          id: generateId(),
          goalId,
          walletId: transaction.walletId,
        };
        
        const { updateWalletBalance } = useWalletStore.getState();
        const isIncome = transaction.type === 'remove';
        updateWalletBalance(transaction.walletId, transaction.amount, isIncome);
        
        set((state) => ({
          goals: state.goals.map(g =>
            g.id === goalId
              ? { ...g, transactions: [...(g.transactions || []), newTransaction] }
              : g
          ),
        }));
      },
      
      updateGoalTransaction: (goalId, transactionId, updates) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const oldTransaction = goal.transactions?.find(t => t.id === transactionId);
        if (!oldTransaction) return;
        
        const { updateWalletBalance } = useWalletStore.getState();
        
        if (updates.walletId && updates.walletId !== oldTransaction.walletId) {
          const wasAdd = oldTransaction.type === 'add';
          updateWalletBalance(oldTransaction.walletId, oldTransaction.amount, wasAdd);
          updateWalletBalance(updates.walletId, oldTransaction.amount, !wasAdd);
        }
        
        if (updates.amount && updates.amount !== oldTransaction.amount) {
          const amountDiff = updates.amount - oldTransaction.amount;
          const isAdd = oldTransaction.type === 'add';
          updateWalletBalance(updates.walletId || oldTransaction.walletId, amountDiff, !isAdd);
        }
        
        set((state) => ({
          goals: state.goals.map(g =>
            g.id === goalId
              ? {
                  ...g,
                  transactions: g.transactions?.map(t =>
                    t.id === transactionId ? { ...t, ...updates } : t
                  ) || []
                }
              : g
          ),
        }));
      },
      
      deleteGoalTransaction: (goalId, transactionId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const transaction = goal.transactions?.find(t => t.id === transactionId);
        if (!transaction) return;
        
        const { updateWalletBalance } = useWalletStore.getState();
        const wasAdd = transaction.type === 'add';
        updateWalletBalance(transaction.walletId, transaction.amount, wasAdd);
        
        set((state) => ({
          goals: state.goals.map(g =>
            g.id === goalId
              ? { ...g, transactions: g.transactions?.filter(t => t.id !== transactionId) || [] }
              : g
          ),
        }));
      },
      
      updateGoalAmount: (goalId, amount) => {
        set((state) => ({
          goals: state.goals.map(g => {
            if (g.id === goalId) {
              const newAmount = Math.min(amount, g.targetAmount);
              const newStatus = newAmount >= g.targetAmount ? 'completed' : g.status;
              return { ...g, currentAmount: newAmount, status: newStatus };
            }
            return g;
          }),
        }));
      },
    }),
    { name: 'yung-accountant-goals' }
  )
);