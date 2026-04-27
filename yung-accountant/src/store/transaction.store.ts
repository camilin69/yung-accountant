// store/transaction.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction, Category, Goal } from '../types';
import { useWalletStore } from './wallet.store';
import { useCategoryStore } from './category.store';
import { useGoalStore } from './goal.store';

const generateId = () => Date.now().toString();

interface TransactionStore {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  calculateWalletBalance: (walletId: string, transactions: Transaction[], categories: Category[], goals: Goal[]) => number;
  updateAllWalletBalances: () => void;
  hasSufficientBalance: (walletId: string, amount: number) => boolean;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      setTransactions: (transactions) => set({ transactions }),
      
      calculateWalletBalance: (walletId, transactions, categories, goals) => {
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
        
        goals.forEach(goal => {
          const goalTransactions = goal.transactions || [];
          goalTransactions.forEach(gt => {
            if (gt.walletId === walletId) {
              if (gt.type === 'add') {
                balance -= gt.amount;
              } else if (gt.type === 'remove') {
                balance += gt.amount;
              }
            }
          });
        });
        
        return balance;
      },
      
      updateAllWalletBalances: () => {
        const { wallets, setWallets } = useWalletStore.getState();
        const { transactions } = get();
        const { categories } = useCategoryStore.getState();
        const { goals } = useGoalStore.getState();
        
        const updatedWallets = wallets.map(wallet => ({
          ...wallet,
          currentBalance: get().calculateWalletBalance(wallet.id, transactions, categories, goals)
        }));
        setWallets(updatedWallets);
      },
      
      hasSufficientBalance: (walletId, amount) => {
        const { wallets } = useWalletStore.getState();
        const wallet = wallets.find(w => w.id === walletId);
        if (!wallet) return false;
        return wallet.currentBalance >= amount;
      },
      
      addTransaction: (transaction) => {
        const { categories } = useCategoryStore.getState();
        const category = categories.find(c => c.id === transaction.categoryId);
        const isExpense = category?.type === 'expense';
        
        if (isExpense) {
          const currentBalance = get().calculateWalletBalance(transaction.walletId, get().transactions, categories, useGoalStore.getState().goals);
          if (currentBalance < transaction.amount) {
            return;
          }
        }
        
        const newTransaction: Transaction = {
          ...transaction,
          id: generateId(),
          userId: '1',
          categoryName: category?.name || 'Other',
        };
        
        set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
        get().updateAllWalletBalances();
      },
      
      updateTransaction: (id, updates) => {
        const oldTransaction = get().transactions.find(t => t.id === id);
        const { categories } = useCategoryStore.getState();
        const oldCategory = oldTransaction ? categories.find(c => c.id === oldTransaction.categoryId) : null;
        
        if (updates.amount && updates.walletId) {
          let tempBalance = get().calculateWalletBalance(updates.walletId, get().transactions, categories, useGoalStore.getState().goals);
          
          if (oldTransaction && oldTransaction.walletId === updates.walletId && oldCategory) {
            if (oldCategory.type === 'income') {
              tempBalance -= oldTransaction.amount;
            } else if (oldCategory.type === 'expense') {
              tempBalance += oldTransaction.amount;
            }
          }
          
          const newCategoryId = updates.categoryId || oldTransaction?.categoryId;
          const newCategory = categories.find(c => c.id === newCategoryId);
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
            const category = categories.find(c => c.id === updates.categoryId);
            updatedTransactions = updatedTransactions.map((t) =>
              t.id === id ? { ...t, categoryName: category?.name || 'Other' } : t
            );
          }
          return { transactions: updatedTransactions };
        });
        
        get().updateAllWalletBalances();
      },
      
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        get().updateAllWalletBalances();
      },
    }),
    { name: 'yung-accountant-transactions' }
  )
);