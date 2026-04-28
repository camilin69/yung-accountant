// store/wallet.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Wallet } from '../types';

const generateId = () => Date.now().toString();

interface WalletStore {
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  addWallet: (wallet: Omit<Wallet, 'id' | 'userId' | 'createdAt'>) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  updateWalletBalance: (walletId: string, amount: number, isIncome: boolean) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      wallets: [],
      
      setWallets: (wallets) => set({ wallets }),
      
      addWallet: (wallet) => {
        const newWallet: Wallet = {
          ...wallet,
          id: generateId(),
          userId: '1',
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
    }),
    { name: 'yung-accountant-wallets' }
  )
);