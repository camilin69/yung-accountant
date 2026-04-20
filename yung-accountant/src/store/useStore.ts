// store/useStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, Category, Transaction, Goal, Debt, Habit, Post, User, GoalTransaction, SimulationTransaction } from '../types';

const generateId = () => Date.now().toString();

// Default categories
const defaultCategories: Category[] = [
  { id: '1', userId: '1', name: 'Salary', type: 'income', icon: '💰', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '2', userId: '1', name: 'Freelance', type: 'income', icon: '💻', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '3', userId: '1', name: 'Gift', type: 'income', icon: '🎁', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '4', userId: '1', name: 'Food', type: 'expense', icon: '🍔', color: '#EF4444', isDefault: true, createdAt: new Date().toISOString() },
  { id: '5', userId: '1', name: 'Transport', type: 'expense', icon: '🚗', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: '6', userId: '1', name: 'Weed', type: 'expense', icon: '🌿', color: '#14B8A6', isDefault: true, createdAt: new Date().toISOString() },
  { id: '7', userId: '1', name: 'Entertainment', type: 'expense', icon: '🎮', color: '#A855F7', isDefault: true, createdAt: new Date().toISOString() },
  { id: '8', userId: '1', name: 'Savings', type: 'expense', icon: '💰', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '9', userId: '1', name: 'Health', type: 'expense', icon: '💪', color: '#EC4899', isDefault: true, createdAt: new Date().toISOString() },
  { id: '10', userId: '1', name: 'Education', type: 'expense', icon: '📚', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: '11', userId: '1', name: 'Rent', type: 'expense', icon: '🏠', color: '#FF6584', isDefault: true, createdAt: new Date().toISOString() },
  { id: '12', userId: '1', name: 'Utilities', type: 'expense', icon: '⚡', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
];

const defaultTransactions: Transaction[] = [
  { id: '1', userId: '1', amount: 150000, date: '2026-01-15', categoryId: '1', categoryName: 'Salary', description: 'Weekly allowance', tags: [] },
  { id: '2', userId: '1', amount: 30000, date: '2026-01-16', categoryId: '5', categoryName: 'Transport', description: 'Gasolina', tags: [] },
  { id: '3', userId: '1', amount: 25000, date: '2026-01-17', categoryId: '4', categoryName: 'Food', description: 'Burger and pizza', tags: [] },
  { id: '4', userId: '1', amount: 60000, date: '2026-01-18', categoryId: '6', categoryName: 'Weed', description: 'Refill', tags: [] },
  { id: '5', userId: '1', amount: 120000, date: '2026-01-20', categoryId: '1', categoryName: 'Salary', description: 'Extra from mom', tags: [] },
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: { id: '1', username: 'yung_nigga', email: 'yung@example.com', plan: 'free', createdAt: '2026-01-01' },
      categories: defaultCategories,
      transactions: defaultTransactions,
      goals: [],
      debts: [],
      habits: [],
      posts: [],
      simulationTransactions: [] as SimulationTransaction[],
      isLoading: false,
      filters: {
        categoryId: null,
        type: 'all',
        startDate: null,
        endDate: null,
      },
      

      // Setters
      setUser: (user) => set({ user }),
      setCategories: (categories) => set({ categories }),
      setTransactions: (transactions) => set({ transactions }),
      setGoals: (goals) => set({ goals }),
      setDebts: (debts) => set({ debts }),
      setHabits: (habits) => set({ habits }),
      setPosts: (posts) => set({ posts }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      setSimulationTransactions: (transactions: SimulationTransaction[]) => set({ simulationTransactions: transactions }),

      // Category actions
      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: generateId(),
          userId: get().user?.id || '1',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      deleteCategory: (id) => {
        const transactions = get().transactions;
        const isInUse = transactions.some(t => t.categoryId === id);
        if (isInUse) {
          alert('Cannot delete category that has transactions. Please reassign or delete transactions first.');
          return;
        }
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      // Transaction actions
      addTransaction: (transaction) => {
        const category = get().categories.find(c => c.id === transaction.categoryId);
        const newTransaction: Transaction = {
          ...transaction,
          id: generateId(),
          userId: get().user?.id || '1',
          categoryName: category?.name || 'Other',
        };
        set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
      },

      updateTransaction: (id, updates) => {
        set((state) => {
          let updatedTransactions = state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          );
          if (updates.categoryId) {
            const category = state.categories.find(c => c.id === updates.categoryId);
            updatedTransactions = updatedTransactions.map((t) =>
              t.id === id ? { ...t, categoryName: category?.name || 'Other' } : t
            );
          }
          return { transactions: updatedTransactions };
        });
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      addSimulationTransaction: (transaction: Omit<SimulationTransaction, 'id' | 'userId' | 'createdAt'>) => {
        const newTransaction: SimulationTransaction = {
          ...transaction,
          period: transaction.period || 'day',
          id: generateId(),
          userId: get().user?.id || '1',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ simulationTransactions: [...state.simulationTransactions, newTransaction] }));
      },

      updateSimulationTransaction: (id: string, updates: Partial<SimulationTransaction>) => {
        set((state) => ({
          simulationTransactions: state.simulationTransactions.map(t => t.id === id ? { ...t, ...updates } : t),
        }));
      },

      deleteSimulationTransaction: (id: string) => {
        set((state) => ({
          simulationTransactions: state.simulationTransactions.filter(t => t.id !== id),
        }));
      },

      // Goal actions
      addGoal: (goal) => {
        const newGoal: Goal = { 
          ...goal, 
          id: generateId(), 
          currentAmount: 0, 
          status: 'active',
          userId: get().user?.id || '1',
          transactions: []
        };
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id === id) {
              const updated = { ...g, ...updates };
              // Si el estado cambia a 'completed' y no tiene completedAt, agregarlo
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

      addGoalTransaction: (goalId: string, transaction: Omit<GoalTransaction, 'id'>) => {
        const newTransaction: GoalTransaction = { ...transaction, id: generateId(), goalId };
        set((state) => ({
          goals: state.goals.map(g => 
            g.id === goalId 
              ? { ...g, transactions: [...(g.transactions || []), newTransaction] }
              : g
          )
        }));
      },

      updateGoalAmount: (goalId: string, amount: number) => {
        set((state) => ({
          goals: state.goals.map(g => {
            if (g.id === goalId) {
              const newAmount = Math.min(amount, g.targetAmount);
              const newStatus = newAmount >= g.targetAmount ? 'completed' : g.status;
              return { ...g, currentAmount: newAmount, status: newStatus };
            }
            return g;
          })
        }));
      },

      // Debt actions
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

      // Habit actions
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