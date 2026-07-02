import { create } from 'zustand';
import type { Wallet } from '../types';
import { walletService } from '../services/wallet.service';
import type { CreateWalletRequest, UpdateWalletRequest } from '../services/wallet.service';
import { shouldSkipFetch, generateTempId, isOfflineMutationError } from '../services/offlineHelper';
import { getLocalISOString } from '../utils/formatters';

interface WalletStore {
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchWallets: (forceRefresh?: boolean) => Promise<void>;
  addWallet: (data: CreateWalletRequest) => Promise<Wallet | null>;
  updateWallet: (id: string, updates: UpdateWalletRequest) => Promise<boolean>;
  deleteWallet: (id: string) => Promise<boolean>;
  updateWalletBalance: (walletId: string, amount: number, isIncome: boolean) => void;
  clearCache: () => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletStore>()((set, get) => ({
  wallets: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000,

  fetchWallets: async (forceRefresh = false) => {
    const { lastFetch, ttl, wallets } = get();
    if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && wallets.length > 0) {
      return;
    }
    // Offline + cached data → skip fetch, keep existing data
    if (shouldSkipFetch(wallets.length > 0)) return;
    set({ isLoading: true, error: null });
    try {
      const allWallets = await walletService.getAllWallets();
      set({ wallets: allWallets, lastFetch: Date.now(), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Error al cargar wallets', isLoading: false });
    }
  },

  addWallet: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await walletService.createWallet(data);
      await get().fetchWallets(true);
      set({ isLoading: false });
      return get().wallets.find(w => w.id === result.id) || null;
    } catch (error: any) {
      if (isOfflineMutationError(error)) {
        const tempId = generateTempId('wal');
        const optimistic: Wallet = {
          id: tempId,
          userId: '',
          name: data.name,
          type: data.type,
          bankName: data.bankName,
          lastFourDigits: data.lastFourDigits,
          color: data.color || '#6366F1',
          icon: 'wallet',
          currentBalance: data.currentBalance || 0,
          isActive: true,
          createdAt: getLocalISOString(),
        };
        set((state) => ({
          wallets: [...state.wallets, optimistic],
          isLoading: false,
        }));
        window.dispatchEvent(new CustomEvent('bg-sync:pending'));
        return optimistic;
      }
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateWallet: async (id, updates) => {
    set({ isLoading: true, error: null });
    const prev = get().wallets;
    set((state): Partial<WalletStore> => ({
        wallets: state.wallets.map(w =>
            w.id === id ? { ...w, ...updates } as Wallet : w
        ),
    }));
    try {
        await walletService.updateWallet(id, updates);
        set({ isLoading: false });
        return true;
    } catch (error: any) {
        if (isOfflineMutationError(error)) {
          set({ isLoading: false });
          window.dispatchEvent(new CustomEvent('bg-sync:pending'));
          return true;
        }
        set({ wallets: prev, error: error.message, isLoading: false });
        return false;
    }
  },

  deleteWallet: async (id) => {
    set({ isLoading: true, error: null });
    const prev = get().wallets;
    set((state) => ({
      wallets: state.wallets.filter(w => w.id !== id),
    }));
    try {
      await walletService.deleteWallet(id);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      if (isOfflineMutationError(error)) {
        set({ isLoading: false });
        window.dispatchEvent(new CustomEvent('bg-sync:pending'));
        return true;
      }
      set({ wallets: prev, error: error.message, isLoading: false });
      return false;
    }
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

  clearCache: () => set({ lastFetch: null }),
  clearError: () => set({ error: null }),
}));