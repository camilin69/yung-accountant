// store/debt.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Debt, DebtPayment } from '../types';
import { debtService } from '../services/debt.service';
import type { CreateDebtRequest, UpdateDebtRequest } from '../services/debt.service';
import { useWalletStore } from './wallet.store';
import { useTransactionStore } from './transaction.store';

interface DebtStore {
  debts: Debt[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchDebts: (forceRefresh?: boolean) => Promise<void>;
  addDebt: (data: CreateDebtRequest) => Promise<Debt | null>;
  updateDebt: (id: string, updates: UpdateDebtRequest) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'debtId'>) => Promise<boolean>;
  deletePayment: (paymentId: string) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set, get) => ({
      debts: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchDebts: async (forceRefresh = false) => {
        const { lastFetch, ttl, debts } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && debts.length > 0) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const allDebts = await debtService.getAllDebts();
          set({ debts: allDebts, lastFetch: Date.now(), isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Error loading debts', isLoading: false });
        }
      },

      addDebt: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const result = await debtService.createDebt(data);
          await get().fetchDebts(true);
          set({ isLoading: false });
          const newDebt = get().debts.find(d => d.id === result.id);
          const { fetchWallets } = useWalletStore.getState();
          const { fetchTransactions } = useTransactionStore.getState();
          await fetchWallets(true);
          await fetchTransactions(true);
          return newDebt || null;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateDebt: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await debtService.updateDebt(id, updates);
          await get().fetchDebts(true);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      deleteDebt: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await debtService.deleteDebt(id);
          set((state) => ({
            debts: state.debts.filter(d => d.id !== id),
            isLoading: false,
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      addDebtPayment: async (debtId, payment) => {
        set({ isLoading: true, error: null });
        try {
          await debtService.addPayment(debtId, payment);
          await get().fetchDebts(true);
          set({ isLoading: false });

          const { fetchWallets } = useWalletStore.getState();
          const { fetchTransactions } = useTransactionStore.getState();
          await fetchWallets(true);
          await fetchTransactions(true);

          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      deletePayment: async (paymentId) => {
        set({ isLoading: true, error: null });
        try {
          await debtService.deletePayment(paymentId);
          await get().fetchDebts(true);
          set({ isLoading: false });

          const { fetchWallets } = useWalletStore.getState();
          const { fetchTransactions } = useTransactionStore.getState();
          await fetchWallets(true);
          await fetchTransactions(true);
          
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
      name: 'yung-accountant-debts',
    }
  )
);

// ============================================
// FUNCIONES AUXILIARES DE INTERÉS COMPUESTO
// ============================================

/**
 * Calcula el monto total con interés compuesto mensual
 * Fórmula: Monto = Principal × (1 + tasa_mensual)^meses
 */
export function calculateCompoundAmount(
  principal: number,
  monthlyRate: number, // Tasa mensual en porcentaje (ej: 1.78 para 1.78%)
  termMonths: number
): number {
  if (monthlyRate <= 0 || principal <= 0 || termMonths <= 0) {
    return principal;
  }
  const rate = monthlyRate / 100;
  const amount = principal * Math.pow(1 + rate, termMonths);
  return Math.round(amount);
}

/**
 * Calcula solo los intereses generados por compound
 */
export function calculateCompoundInterests(
  principal: number,
  monthlyRate: number,
  termMonths: number
): number {
  const total = calculateCompoundAmount(principal, monthlyRate, termMonths);
  return total - principal;
}

/**
 * Calcula la cuota mensual con compound
 */
export function calculateCompoundMonthlyPayment(
  principal: number,
  monthlyRate: number,
  termMonths: number
): number {
  if (termMonths <= 0) return 0;
  const total = calculateCompoundAmount(principal, monthlyRate, termMonths);
  return Math.round(total / termMonths);
}