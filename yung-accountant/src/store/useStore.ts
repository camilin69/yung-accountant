// store/useStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, Category, Transaction, Goal, Debt, GoalTransaction, SimulationTransaction, Wallet, DebtPayment } from '../types';

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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ==================== ESTADO INICIAL ====================
      user: { id: '1', username: 'yung_nigga', email: 'yung@example.com', plan: 'free', createdAt: '2026-01-01' },
      categories: defaultCategories,
      transactions: [] as Transaction[],
      goals: [],
      debts: [],
      wallets: [] as Wallet[],
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

      // ==================== FUNCIONES AUXILIARES ====================
      hasSufficientBalance: (walletId: string, amount: number): boolean => {
        const wallet = get().wallets.find(w => w.id === walletId);
        if (!wallet) return false;
        return wallet.currentBalance >= amount;
      },

      calculateWalletBalance : (walletId: string, transactions: Transaction[], categories: Category[]): number => {
        let balance = 0;
        const walletTransactions = transactions.filter(t => t.walletId === walletId);
        
        walletTransactions.forEach(t => {
          const category = categories.find(c => c.id === t.categoryId);
          if (category?.type === 'income') {
            balance += t.amount;
          } else if (category?.type === 'expense') {
            balance -= t.amount;
          }
        });
        
        return balance;
      },

      // Actualizar todos los balances de wallets
      updateAllWalletBalances : () => {
        const { wallets, transactions, categories } = get();
        const updatedWallets = wallets.map(wallet => ({
          ...wallet,
          currentBalance: get().calculateWalletBalance(wallet.id, transactions, categories)
        }));
        set({ wallets: updatedWallets });
      },


      // ==================== SETTERS ====================
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
      setWallets: (wallets) => set({ wallets }),

      // ==================== CATEGORY ACTIONS ====================
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

      // ==================== TRANSACTION ACTIONS ====================
      addTransaction: (transaction) => {
        const category = get().categories.find(c => c.id === transaction.categoryId);
        const isExpense = category?.type === 'expense';
        
        // Validar balance para expenses
        if (isExpense) {
          const currentBalance = get().calculateWalletBalance(transaction.walletId, get().transactions, get().categories);
          if (currentBalance < transaction.amount) {
            return;
          }
        }
        
        const newTransaction: Transaction = {
          ...transaction,
          id: generateId(),
          userId: get().user?.id || '1',
          categoryName: category?.name || 'Other',
        };
        set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
        
        // Actualizar todos los balances de wallets
        get().updateAllWalletBalances();
      },


      updateTransaction: (id, updates) => {
        const oldTransaction = get().transactions.find(t => t.id === id);
        const oldCategory = oldTransaction ? get().categories.find(c => c.id === oldTransaction.categoryId) : null;
        
        // Validar nuevo balance si es expense
        if (updates.amount && updates.walletId) {
          // Simular el balance temporalmente para validar
          let tempBalance = get().calculateWalletBalance(updates.walletId, get().transactions, get().categories);
          
          // Revertir la transacción vieja si estaba en la misma wallet
          if (oldTransaction && oldTransaction.walletId === updates.walletId && oldCategory) {
            if (oldCategory.type === 'income') {
              tempBalance -= oldTransaction.amount;
            } else if (oldCategory.type === 'expense') {
              tempBalance += oldTransaction.amount;
            }
          }
          
          // Aplicar la nueva transacción
          const newCategoryId = updates.categoryId || oldTransaction?.categoryId;
          const newCategory = get().categories.find(c => c.id === newCategoryId);
          const isExpense = newCategory?.type === 'expense';
          
          if (isExpense && tempBalance < updates.amount) {
            return;
          }
        }
        
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
        
        // Actualizar todos los balances de wallets
        get().updateAllWalletBalances();
      },


      deleteTransaction: (id) => {
        const transaction = get().transactions.find(t => t.id === id);
        
        // Verificar si es una transacción de deuda (creación de deuda)
        if (transaction?.tags.includes('debt') && !transaction?.tags.includes('debt-payment')) {
          const debtId = transaction.tags.find(tag => tag !== 'debt' && tag !== id && !tag.includes('debt-payment'));
          if (debtId) {
            const debt = get().debts.find(d => d.id === debtId);
            if (debt) {
              
              set((state) => ({
                debts: state.debts.filter(d => d.id !== debtId),
                transactions: state.transactions.filter(t => !t.tags.includes(debtId))
              }));
              
              // Actualizar balances después de eliminar
              get().updateAllWalletBalances();
              return;
            }
          }
        }
        
        // Verificar si es un pago de deuda
        if (transaction?.tags.includes('debt-payment')) {
          const debtId = transaction.tags.find(tag => tag !== 'debt-payment' && tag !== id);
          if (debtId) {
            const debt = get().debts.find(d => d.id === debtId);
            if (debt && debt.payments) {
              const paymentToRemove = debt.payments.find(p => 
                p.amount === transaction.amount && 
                p.date === transaction.date
              );
              if (paymentToRemove) {
                const updatedPayments = debt.payments.filter(p => p.id !== paymentToRemove.id);
                const newRemainingBalance = debt.remainingBalance + paymentToRemove.amount;
                set((state) => ({
                  debts: state.debts.map(d =>
                    d.id === debtId
                      ? { ...d, payments: updatedPayments, remainingBalance: newRemainingBalance }
                      : d
                  )
                }));
              }
            }
          }
        }
        
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        
        // Actualizar todos los balances de wallets
        get().updateAllWalletBalances();
      },




      // ==================== WALLET ACTIONS ====================
      addWallet: (wallet) => {
        const newWallet: Wallet = {
          ...wallet,
          id: generateId(),
          userId: get().user?.id || '1',
          currentBalance: wallet.initialBalance, // Balance inicial
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ wallets: [...state.wallets, newWallet] }));
      },


      updateWallet: (id, updates) => {
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      deleteWallet: (id) => {
        const transactions = get().transactions;
        const hasTransactions = transactions.some(t => t.walletId === id);
        if (hasTransactions) {
          return;
        }
        set((state) => ({
          wallets: state.wallets.filter((w) => w.id !== id),
        }));
      },

      updateWalletBalance: (walletId, amount, isIncome) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === walletId
              ? { ...w, currentBalance: w.currentBalance + (isIncome ? amount : -amount) }
              : w
          ),
        }));
      },

      // ==================== SIMULATION TRANSACTION ACTIONS ====================
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

      // ==================== GOAL ACTIONS ====================
      addGoal: (goal) => {
        const newGoal: Goal = { 
          ...goal, 
          id: generateId(), 
          currentAmount: 0, 
          status: 'active',
          userId: get().user?.id || '1',
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

      // ==================== DEBT ACTIONS ====================
      addDebt: (debt: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'remainingBalance' | 'payments'>) => {
        const category = get().categories.find(c => c.id === debt.categoryId);
        const isIncome = debt.type === 'borrowed';
        const isExpense = debt.type === 'lent';
        
        // Validar balance si es un préstamo que hago (lent - gasto)
        if (isExpense) {
          const currentBalance = get().calculateWalletBalance(debt.walletId, get().transactions, get().categories);
          if (currentBalance < debt.originalAmount) {
            // No crear la deuda, solo mostrar error
            return;
          }
        }
        
        const newDebt: Debt = {
          ...debt,
          id: generateId(),
          userId: get().user?.id || '1',
          remainingBalance: debt.originalAmount,
          payments: [],
          createdAt: new Date().toISOString(),
        };
        
        // Crear transacción automática
        const transactionId = generateId();
        const newTransaction: Transaction = {
          id: transactionId,
          userId: get().user?.id || '1',
          amount: debt.originalAmount,
          categoryId: debt.categoryId,
          categoryName: category?.name || 'Other',
          walletId: debt.walletId,
          description: `${debt.type === 'borrowed' ? 'Loan received from' : 'Loan given to'} ${debt.creditorName}`,
          date: debt.startDate,
          tags: ['debt', debt.type, newDebt.id, transactionId],
        };
        
        // Actualizar wallet balance
        get().updateWalletBalance(debt.walletId, debt.originalAmount, isIncome);
        
        set((state) => ({ 
          debts: [...state.debts, newDebt],
          transactions: [newTransaction, ...state.transactions]
        }));
        
        // Actualizar balances después de añadir
        get().updateAllWalletBalances();
      },



      updateDebt: (id, updates) => {
        const oldDebt = get().debts.find(d => d.id === id);
        if (!oldDebt) return;
        
        // Verificar si cambió el tipo (borrowed ↔ lent)
        const typeChanged = updates.type !== undefined && updates.type !== oldDebt.type;
        const amountChanged = updates.originalAmount !== undefined && updates.originalAmount !== oldDebt.originalAmount;
        const categoryChanged = updates.categoryId !== undefined && updates.categoryId !== oldDebt.categoryId;
        
        // Si cambió el tipo, necesitamos validar el balance para el nuevo tipo
        if (typeChanged) {
          const newType = updates.type;
          const newAmount = updates.originalAmount !== undefined ? updates.originalAmount : oldDebt.originalAmount;
          const walletId = updates.walletId !== undefined ? updates.walletId : oldDebt.walletId;
          
          // Si el nuevo tipo es 'lent' (préstamo que hago), validar balance suficiente
          if (newType === 'lent') {
            const currentBalance = get().calculateWalletBalance(walletId, get().transactions, get().categories);
            if (currentBalance < newAmount) {
              return;
            }
          }
        }
        
        // Si cambió el monto y el tipo actual es 'lent', validar balance
        if (amountChanged && oldDebt.type === 'lent') {
          const newAmount = updates.originalAmount!;
          const currentBalance = get().calculateWalletBalance(oldDebt.walletId, get().transactions, get().categories);
          if (currentBalance < newAmount) {
            return;
          }
        }
        
        // Calcular diferencia de monto para remaining balance
        let amountDifference = 0;
        if (amountChanged) {
          amountDifference = updates.originalAmount! - oldDebt.originalAmount;
        }
        
        // Actualizar la deuda
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { 
            ...d, 
            ...updates,
            remainingBalance: amountChanged 
              ? d.remainingBalance + amountDifference 
              : d.remainingBalance
          } : d)),
        }));
        
        const updatedDebt = get().debts.find(d => d.id === id);
        
        if (updatedDebt && (amountChanged || categoryChanged || typeChanged)) {
          // Buscar la transacción original asociada a esta deuda
          const relatedTransaction = get().transactions.find(t => 
            t.tags.includes(id) && t.tags.includes('debt') && !t.tags.includes('debt-payment')
          );
          
          if (relatedTransaction) {
            const newAmount = updates.originalAmount !== undefined ? updates.originalAmount : oldDebt.originalAmount;
            const newCategoryId = updates.categoryId !== undefined ? updates.categoryId : oldDebt.categoryId;
            const newType = updates.type !== undefined ? updates.type : oldDebt.type;
            const newCategory = get().categories.find(c => c.id === newCategoryId);
            
            // Revertir el balance anterior de la transacción original
            const oldCategory = get().categories.find(c => c.id === relatedTransaction.categoryId);
            if (oldCategory) {
              get().updateWalletBalance(relatedTransaction.walletId, relatedTransaction.amount, false);
            }
            
            // Determinar si la nueva transacción es income o expense
            const isIncome = newType === 'borrowed';
            
            // Actualizar la transacción existente
            get().updateTransaction(relatedTransaction.id, {
              amount: newAmount,
              categoryId: newCategoryId,
              categoryName: newCategory?.name || 'Other',
              description: `${newType === 'borrowed' ? 'Loan received from' : 'Loan given to'} ${updatedDebt.creditorName}`,
            });
            
            // Aplicar nuevo balance con la transacción actualizada
            get().updateWalletBalance(relatedTransaction.walletId, newAmount, isIncome);
          }
        }
        
        // Actualizar todos los balances de wallets
        get().updateAllWalletBalances();
      },




      deleteDebt: (id) => {
        const debt = get().debts.find(d => d.id === id);
        if (debt) {
          // Buscar todas las transacciones asociadas a esta deuda
          const relatedTransactions = get().transactions.filter(t => 
            t.tags.includes(id) || 
            (t.tags.includes('debt-adjustment') && t.tags.includes(id)) ||
            (t.description.includes(debt.creditorName) && t.tags.includes('debt'))
          );
          
          // Revertir los balances de cada transacción
          relatedTransactions.forEach(t => {
            const category = get().categories.find(c => c.id === t.categoryId);
            if (category) {
              const wasIncome = category.type === 'income';
              get().updateWalletBalance(t.walletId, t.amount, !wasIncome);
            }
          });
          
          set((state) => ({
            debts: state.debts.filter((d) => d.id !== id),
            transactions: state.transactions.filter((t) => !t.tags.includes(id))
          }));
          
          // Actualizar balances después de eliminar
          get().updateAllWalletBalances();
        } else {
          set((state) => ({
            debts: state.debts.filter((d) => d.id !== id),
          }));
        }
      },


      addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'debtId'>) => {
        const debt = get().debts.find(d => d.id === debtId);
        if (!debt) return;
        
        // Validar balance suficiente para el pago
        const currentBalance = get().calculateWalletBalance(debt.walletId, get().transactions, get().categories);
        if (currentBalance < payment.amount) {
          return;
        }
        
        const newPayment: DebtPayment = { ...payment, id: generateId(), debtId };
        const newBalance = debt.remainingBalance - payment.amount;
        const isFullyPaid = newBalance <= 0;
        
        let paymentCategoryId = get().categories.find(c => c.name === 'Debt Payment' && c.type === 'expense')?.id;
        if (!paymentCategoryId) {
          const newCategory: Category = {
            id: 'debt-payment-default',
            userId: get().user?.id || '1',
            name: 'Debt Payment',
            type: 'expense',
            icon: '💸',
            color: '#EF4444',
            isDefault: true,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ categories: [...state.categories, newCategory] }));
          paymentCategoryId = newCategory.id;
        }
        
        const transactionId = generateId();
        const newTransaction: Transaction = {
          id: transactionId,
          userId: get().user?.id || '1',
          amount: payment.amount,
          categoryId: paymentCategoryId,
          categoryName: 'Debt Payment',
          walletId: debt.walletId,
          description: `Payment to ${debt.creditorName}${payment.notes ? ` - ${payment.notes}` : ''}`,
          date: payment.date,
          tags: ['debt-payment', debtId, transactionId],
        };
        
        set((state) => ({
          debts: state.debts.map((d) => 
            d.id === debtId 
              ? { 
                  ...d, 
                  payments: [...(d.payments || []), newPayment],
                  remainingBalance: newBalance,
                  status: isFullyPaid ? 'paid' : d.status
                }
              : d
          ),
          transactions: [newTransaction, ...state.transactions]
        }));
        
        // Actualizar balances después de añadir el pago
        get().updateAllWalletBalances();
      },


      // ==================== HABIT ACTIONS ====================
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

      checkHabit: (id, _date) => {
        const habit = get().habits.find(h => h.id === id);
        if (habit) {
          get().updateHabit(id, { currentStreak: habit.currentStreak + 1 });
        }
      },

      // ==================== POST ACTIONS ====================
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

// ==================== SELECTORS (fuera del store) ====================
export const useTotalBalance = () => {
  const transactions = useStore((state) => state.transactions);
  const categories = useStore((state) => state.categories);
  
  return transactions.reduce((total, t) => {
    const category = categories.find(c => c.id === t.categoryId);
    if (category?.type === 'income') {
      return total + t.amount;
    } else {
      return total - t.amount;
    }
  }, 0);
};

export const useGoalsAllocatedBalance = () => {
  const goals = useStore((state) => state.goals);
  return goals
    .filter(goal => goal.status === 'active')
    .reduce((total, goal) => total + goal.currentAmount, 0);
};

export const useAvailableBalance = () => {
  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  return totalBalance - allocatedToGoals;
};

export const useDebtsBalance = () => {
  const debts = useStore((state) => state.debts);
  const borrowed = debts
    .filter(d => d.type === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);
  const lent = debts
    .filter(d => d.type === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);
  return { borrowed, lent, net: lent - borrowed };
};

export const useRealAvailableBalance = () => {
  const availableBalance = useAvailableBalance();
  const { net } = useDebtsBalance();
  return availableBalance + net;
};

