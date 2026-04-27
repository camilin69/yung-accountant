// store/simulation.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SimulationTransaction } from '../types';

const generateId = () => Date.now().toString();

interface SimulationStore {
  simulationTransactions: SimulationTransaction[];
  setSimulationTransactions: (transactions: SimulationTransaction[]) => void;
  addSimulationTransaction: (transaction: Omit<SimulationTransaction, 'id' | 'userId' | 'createdAt'>) => void;
  updateSimulationTransaction: (id: string, updates: Partial<SimulationTransaction>) => void;
  deleteSimulationTransaction: (id: string) => void;
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      simulationTransactions: [],
      
      setSimulationTransactions: (transactions) => set({ simulationTransactions: transactions }),
      
      addSimulationTransaction: (transaction) => {
        const newTransaction: SimulationTransaction = {
          ...transaction,
          period: transaction.period || 'day',
          id: generateId(),
          userId: '1',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ 
          simulationTransactions: [newTransaction, ...state.simulationTransactions] 
        }));
      },
      
      updateSimulationTransaction: (id, updates) => {
        set((state) => ({
          simulationTransactions: state.simulationTransactions.map(t => 
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },
      
      deleteSimulationTransaction: (id) => {
        set((state) => ({
          simulationTransactions: state.simulationTransactions.filter(t => t.id !== id),
        }));
      },
    }),
    { name: 'yung-accountant-simulations' }
  )
);