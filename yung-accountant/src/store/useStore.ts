// store/useStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, Transaction, Goal, Debt, Habit, Post, User } from '../types';

const generateId = () => Date.now().toString();

const defaultData = {
  transactions: [
    { id: '1', userId: '1', amount: 150000, date: '2026-01-15', category: 'Income', description: 'Weekly allowance', isIncome: true, tags: ['mom'] },
    { id: '2', userId: '1', amount: 30000, date: '2026-01-16', category: 'Transport', description: 'Gasolina', isIncome: false, tags: ['moto'] },
    { id: '3', userId: '1', amount: 25000, date: '2026-01-17', category: 'Food', description: 'Burger and pizza', isIncome: false, tags: ['junk'] },
    { id: '4', userId: '1', amount: 60000, date: '2026-01-18', category: 'Weed', description: 'Refill', isIncome: false, tags: ['weed'] },
    { id: '5', userId: '1', amount: 120000, date: '2026-01-20', category: 'Income', description: 'Extra from mom', isIncome: true, tags: ['mom'] },
  ] as Transaction[],
  goals: [
    { id: '1', userId: '1', name: 'Buy a motorcycle', targetAmount: 8000000, currentAmount: 1500000, targetDate: '2026-12-31', priority: 'high' as const, status: 'active' as const, context: 'transport' },
    { id: '2', userId: '1', name: 'Emergency fund', targetAmount: 2000000, currentAmount: 300000, targetDate: '2026-06-30', priority: 'high' as const, status: 'active' as const, context: 'savings' },
    { id: '3', userId: '1', name: 'New computer', targetAmount: 3000000, currentAmount: 500000, targetDate: '2026-08-31', priority: 'medium' as const, status: 'active' as const, context: 'education' },
  ] as Goal[],
  debts: [
    { id: '1', userId: '1', creditor: 'Mom', originalAmount: 500000, remainingBalance: 200000, interestRate: 0, termMonths: 3, monthlyPayment: 100000, startDate: '2026-01-01', status: 'active' as const },
    { id: '2', userId: '1', creditor: 'Progreser', originalAmount: 7750000, remainingBalance: 7750000, interestRate: 1.87, termMonths: 72, monthlyPayment: 232896, startDate: '2026-02-01', status: 'active' as const },
  ] as Debt[],
  habits: [
    { id: '1', userId: '1', name: 'Gym', frequency: 'daily' as const, targetPerWeek: 5, currentStreak: 3, bestStreak: 7, isActive: true },
    { id: '2', userId: '1', name: 'Clean food', frequency: 'daily' as const, targetPerWeek: 6, currentStreak: 2, bestStreak: 10, isActive: true },
    { id: '3', userId: '1', name: 'Codeforces', frequency: 'daily' as const, targetPerWeek: 5, currentStreak: 1, bestStreak: 15, isActive: true },
  ] as Habit[],
  posts: [
    { id: '1', userId: '1', title: 'Just hit my first savings goal!', content: 'After 3 months of grinding, finally saved 500k. Next target: emergency fund!', likesCount: 12, commentsCount: 3, createdAt: '2026-01-20' },
    { id: '2', userId: '2', title: 'How do you track weed expenses?', content: 'I spend around 120k weekly and want to cut down. Any tips?', likesCount: 8, commentsCount: 5, createdAt: '2026-01-19' },
  ] as Post[],
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: { id: '1', username: 'yung_nigga', email: 'yung@example.com', plan: 'free', createdAt: '2026-01-01' },
      transactions: defaultData.transactions,
      goals: defaultData.goals,
      debts: defaultData.debts,
      habits: defaultData.habits,
      posts: defaultData.posts,
      isLoading: false,
      filters: {
        category: 'all',
        type: 'all',
        startDate: null,
        endDate: null,
      },

      setUser: (user) => set({ user }),
      setTransactions: (transactions) => set({ transactions }),
      setGoals: (goals) => set({ goals }),
      setDebts: (debts) => set({ debts }),
      setHabits: (habits) => set({ habits }),
      setPosts: (posts) => set({ posts }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

      addTransaction: (transaction) => {
        const newTransaction = { ...transaction, id: generateId(), userId: get().user?.id || '1' };
        set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      addGoal: (goal) => {
        const newGoal = { 
          ...goal, 
          id: generateId(), 
          currentAmount: 0, 
          status: 'active' as const,
          userId: get().user?.id || '1'
        };
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }));
      },

      addDebt: (debt) => {
        const newDebt = { ...debt, id: generateId(), userId: get().user?.id || '1' };
        set((state) => ({ debts: [...state.debts, newDebt] }));
      },

      updateDebt: (id, updates) => {
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
      },

      deleteDebt: (id) => {
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        }));
      },

      addHabit: (habit) => {
        const newHabit = { 
          ...habit, 
          id: generateId(), 
          currentStreak: 0, 
          bestStreak: 0,
          userId: get().user?.id || '1'
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },

      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => {
            if (h.id === id) {
              const updated = { ...h, ...updates };
              if (updates.currentStreak && updates.currentStreak > (h.bestStreak || 0)) {
                updated.bestStreak = updates.currentStreak;
              }
              return updated;
            }
            return h;
          }),
        }));
      },

      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        }));
      },

      checkHabit: (id, date) => {
        const habit = get().habits.find(h => h.id === id);
        if (habit) {
          get().updateHabit(id, { currentStreak: habit.currentStreak + 1 });
        }
      },

      addPost: (post) => {
        const newPost = {
          ...post,
          id: generateId(),
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
          userId: get().user?.id || '1',
        };
        set((state) => ({ posts: [newPost, ...state.posts] }));
      },

      likePost: (id) => {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === id ? { ...p, likesCount: p.likesCount + 1 } : p
          ),
        }));
      },

      deletePost: (id) => {
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== id),
        }));
      },
    }),
    {
      name: 'yung-accountant-storage',
    }
  )
);