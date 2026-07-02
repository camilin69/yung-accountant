// store/debt.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Debt, DebtPayment } from '../types';
import { debtService } from '../services/debt.service';
import type { CreateDebtRequest, UpdateDebtRequest } from '../services/debt.service';
import { shouldSkipFetch, generateTempId, isOfflineMutationError, isOptimistic } from '../services/offlineHelper';
import { useWalletStore } from './wallet.store';
import { useTransactionStore } from './transaction.store';
import { getLocalDateString, getLocalISOString } from '../utils/formatters';

interface PendingDebtPayment {
  tempDebtId: string;
  debtorName: string;
  payment: Omit<DebtPayment, 'id' | 'debtId'>;
}

interface DebtStore {
  debts: Debt[];
  pendingDebtPayments: PendingDebtPayment[];
  /** Set when a real-UUID debt is mutated offline — signals sync handler to refresh */
  _needsRefresh: boolean;
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
  replayPendingPayments: () => Promise<void>;
  clearCache: () => void;
  clearError: () => void;
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set, get) => ({
      debts: [],
      pendingDebtPayments: [],
      _needsRefresh: false,
      isLoading: false,
      error: null,
      lastFetch: null,
      ttl: 5 * 60 * 1000,

      fetchDebts: async (forceRefresh = false) => {
        const { lastFetch, ttl, debts } = get();
        if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && debts.length > 0) {
          return;
        }
        if (shouldSkipFetch(debts.length > 0)) return;
        set({ isLoading: true, error: null });
        try {
          const allDebts = await debtService.getAllDebts();
          const prevRealNames = new Set(
            get().debts.filter(d => !isOptimistic(d.id)).map(d => d.creditorName),
          );
          set({ debts: allDebts, lastFetch: Date.now(), _needsRefresh: false, isLoading: false });

          // Replay pending debt payments after sync
          const pending = get().pendingDebtPayments;
          if (pending.length > 0) {
            const freshDebts = get().debts;
            const newDebts = freshDebts.filter(d => !prevRealNames.has(d.creditorName));
            const remaining: PendingDebtPayment[] = [];
            for (const pp of pending) {
              const match = newDebts.find(d => d.creditorName === pp.debtorName && !isOptimistic(d.id));
              if (match) {
                try {
                  await debtService.addPayment(match.id, pp.payment);
                } catch {
                  remaining.push(pp);
                }
              } else {
                remaining.push(pp);
              }
            }
            set({ pendingDebtPayments: remaining });
          }
        } catch (error: any) {
          set({ error: error.message || 'Error loading debts', isLoading: false });
        }
      },

      addDebt: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const result = await debtService.createDebt(data);
          await get().fetchDebts(true);
          set({ isLoading: false, _needsRefresh: true });
          const newDebt = get().debts.find(d => d.id === result.id);
          const { fetchWallets } = useWalletStore.getState();
          const { fetchTransactions } = useTransactionStore.getState();
          await fetchWallets(true);
          await fetchTransactions(true);
          return newDebt || null;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            const tempId = generateTempId('debt');
            const optimistic: Debt = {
              id: tempId,
              userId: '',
              type: data.type,
              creditorName: data.creditorName,
              walletId: data.walletId,
              categoryId: data.categoryId,
              originalAmount: data.originalAmount,
              remainingBalance: data.originalAmount,
              interestRate: data.interestRate || 0,
              interestType: data.interestType || 'fixed',
              termMonths: data.termMonths,
              monthlyPayment: data.monthlyPayment,
              startDate: getLocalDateString(),
              nextDueDate: getLocalDateString(),
              status: 'active' as const,
              realAmountToPay: data.originalAmount,
              realInterests: 0,
              createdAt: getLocalISOString(),
            };
            set((state) => ({
              debts: [...state.debts, optimistic],
              _needsRefresh: true,
              isLoading: false,
            }));
            // Borrowed = money enters wallet, Lent = money leaves wallet
            if (data.walletId) {
              useWalletStore.getState().updateWalletBalance(
                data.walletId, data.originalAmount, data.type === 'borrowed',
              );
            }
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return optimistic;
          }
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateDebt: async (id, updates) => {
        if (isOptimistic(id)) {
          set((state) => ({
            debts: state.debts.map(d => d.id === id ? ({ ...d, ...updates } as Debt) : d),
            isLoading: false,
          }));
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().debts;
        set((state) => ({
          debts: state.debts.map(d => d.id === id ? ({ ...d, ...updates } as Debt) : d),
        }));
        try {
          await debtService.updateDebt(id, updates);
          set({ isLoading: false, _needsRefresh: true });
          useWalletStore.getState().fetchWallets(true);
          useTransactionStore.getState().fetchTransactions(true);
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ debts: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      deleteDebt: async (id) => {
        const debt = get().debts.find(d => d.id === id);
        if (isOptimistic(id)) {
          set((state) => ({
            debts: state.debts.filter(d => d.id !== id),
            pendingDebtPayments: state.pendingDebtPayments.filter(pp => pp.tempDebtId !== id),
            isLoading: false,
          }));
          if (debt?.walletId) {
            useWalletStore.getState().updateWalletBalance(
              debt.walletId, debt.originalAmount, debt.type !== 'borrowed',
            );
          }
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().debts;
        set((state) => ({
          debts: state.debts.filter(d => d.id !== id),
          pendingDebtPayments: state.pendingDebtPayments.filter(pp => pp.tempDebtId !== id),
        }));
        try {
          await debtService.deleteDebt(id);
          set({ isLoading: false, _needsRefresh: true });
          useWalletStore.getState().fetchWallets(true);
          useTransactionStore.getState().fetchTransactions(true);
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            if (debt?.walletId) {
              useWalletStore.getState().updateWalletBalance(
                debt.walletId, debt.remainingBalance, debt.type !== 'borrowed',
              );
            }
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ debts: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      addDebtPayment: async (debtId, payment) => {
        // Defer if the parent debt is optimistic — queue for later replay
        // AND optimistically add to local state so the UI renders it.
        if (isOptimistic(debtId)) {
          const debt = get().debts.find(d => d.id === debtId);
          const tempPayment: DebtPayment = {
            id: generateTempId('dp'),
            debtId,
            ...payment,
          } as DebtPayment;
          set((state) => ({
            debts: state.debts.map(d =>
              d.id === debtId
                ? { ...d, payments: [tempPayment, ...(d.payments || [])] }
                : d
            ),
            pendingDebtPayments: [
              ...state.pendingDebtPayments,
              { tempDebtId: debtId, debtorName: debt?.creditorName || '', payment },
            ],
            isLoading: false,
          }));
          // Payments come from the debt's wallet — subtract optimistically
          if (debt?.walletId) {
            useWalletStore.getState().updateWalletBalance(
              debt.walletId, payment.amount, false,
            );
          }
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ isLoading: true, error: null });
        const prev = get().debts;
        try {
          await debtService.addPayment(debtId, payment);
          await get().fetchDebts(true);
          set({ isLoading: false, _needsRefresh: true });
          const { fetchWallets } = useWalletStore.getState();
          const { fetchTransactions } = useTransactionStore.getState();
          await fetchWallets(true);
          await fetchTransactions(true);
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            const debt = get().debts.find(d => d.id === debtId);
            const tempPayment: DebtPayment = {
              id: generateTempId('dp'),
              debtId,
              ...payment,
            } as DebtPayment;
            // Optimistic: add to local state so UI renders it immediately
            set((state) => ({
              debts: state.debts.map(d =>
                d.id === debtId
                  ? { ...d, payments: [tempPayment, ...(d.payments || [])] }
                  : d
              ),
              _needsRefresh: true,
              isLoading: false,
            }));
            if (debt?.walletId) {
              useWalletStore.getState().updateWalletBalance(
                debt.walletId, payment.amount, false,
              );
            }
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ debts: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      deletePayment: async (paymentId) => {
        // Optimistically remove the payment from local state immediately
        // so the UI updates even when offline or for temp-ID payments.
        const prev = get().debts;
        set((state) => ({
          debts: state.debts.map(d => ({
            ...d,
            payments: (d.payments || []).filter(p => p.id !== paymentId),
          })),
          pendingDebtPayments: state.pendingDebtPayments.filter(
            pp => !(state.debts.find(d => d.id === pp.tempDebtId))
          ),
        }));

        // Temp-ID payment — no API call needed, never existed on server
        if (isOptimistic(paymentId)) return true;

        set({ isLoading: true, error: null });
        try {
          await debtService.deletePayment(paymentId);
          set({ isLoading: false, _needsRefresh: true });
          return true;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            set({ isLoading: false, _needsRefresh: true });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return true;
          }
          set({ debts: prev, error: error.message, isLoading: false });
          return false;
        }
      },

      replayPendingPayments: async () => {
        // The caller already called fetchDebts(true) which internally
        // replays matching pending payments. Here we only retry
        // leftover unmatched entries.
        const stillPending = get().pendingDebtPayments;
        if (stillPending.length === 0) return;
        const remaining: PendingDebtPayment[] = [];
        for (const pp of stillPending) {
          const match = get().debts.find(
            d => d.creditorName === pp.debtorName && !isOptimistic(d.id),
          );
          if (match) {
            try {
              await debtService.addPayment(match.id, pp.payment);
            } catch {
              remaining.push(pp);
            }
          } else {
            remaining.push(pp);
          }
        }
        set({ pendingDebtPayments: remaining });
        // Wallets & transactions are refreshed by the sync handler
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