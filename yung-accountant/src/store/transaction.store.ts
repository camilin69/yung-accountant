import { create } from 'zustand';
import type { Transaction } from '../types';
import { transactionService } from '../services/transaction.service';
import type { CreateTransactionRequest, UpdateTransactionRequest } from '../services/transaction.service';

interface TransactionStore {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchTransactions: (forceRefresh?: boolean) => Promise<void>;
  addTransaction: (data: CreateTransactionRequest) => Promise<Transaction | null>;
  updateTransaction: (id: string, updates: UpdateTransactionRequest) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000,

  fetchTransactions: async (forceRefresh = false) => {
    const { lastFetch, ttl, transactions } = get();
    if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && transactions.length > 0) {
      console.log('[TransactionStore] Using memory cache');
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const all = await transactionService.getAllTransactions();
      set({ transactions: all, lastFetch: Date.now(), isLoading: false });
      console.log(`[TransactionStore] Loaded ${all.length} transactions`);
    } catch (error: any) {
      set({ error: error.message || 'Error al cargar transacciones', isLoading: false });
    }
  },

  addTransaction: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await transactionService.createTransaction(data);
      await get().fetchTransactions(true);
      set({ isLoading: false });
      return get().transactions.find(t => t.id === result.id) || null;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateTransaction: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await transactionService.updateTransaction(id, updates);
      await get().fetchTransactions(true);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await transactionService.deleteTransaction(id);
      set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  clearCache: () => set({ lastFetch: null }),
  clearError: () => set({ error: null }),
}));