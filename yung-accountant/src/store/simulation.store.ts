import { create } from 'zustand';
import type { SimulationTransaction } from '../types';
import { simulationService } from '../services/simulation.service';
import type { CreateSimulationRequest, UpdateSimulationRequest } from '../services/simulation.service';
import { shouldSkipFetch, generateTempId, isOfflineMutationError } from '../services/offlineHelper';
import { getLocalISOString } from '../utils/formatters';

interface SimulationStore {
  simulations: SimulationTransaction[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchSimulations: (forceRefresh?: boolean) => Promise<void>;
  addSimulation: (data: CreateSimulationRequest) => Promise<SimulationTransaction | null>;
  updateSimulation: (id: string, updates: UpdateSimulationRequest) => Promise<boolean>;
  deleteSimulation: (id: string) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
}

export const useSimulationStore = create<SimulationStore>()((set, get) => ({
  simulations: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000,

  fetchSimulations: async (forceRefresh = false) => {
    const { lastFetch, ttl, simulations } = get();
    if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && simulations.length > 0) {
      return;
    }
    // Offline + cached data → skip fetch, keep existing data
    if (shouldSkipFetch(simulations.length > 0)) return;
    set({ isLoading: true, error: null });
    try {
      const data = await simulationService.getAllSimulations();
      set({ simulations: data, lastFetch: Date.now(), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Error loading simulations', isLoading: false });
    }
  },

  addSimulation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await simulationService.createSimulation(data);
      await get().fetchSimulations(true);
      set({ isLoading: false });
      return get().simulations.find(s => s.id === result.id) || null;
    } catch (error: any) {
      if (isOfflineMutationError(error)) {
        const tempId = generateTempId('sim');
        const optimistic: SimulationTransaction = {
          id: tempId,
          userId: '',
          amount: data.amount,
          categoryId: data.categoryId || '',
          description: data.description || '',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          days: data.days || 0,
          weeks: data.weeks || 0,
          months: data.months || 0,
          period: data.period || 'month',
          createdAt: getLocalISOString(),
        };
        set((state) => ({
          simulations: [...state.simulations, optimistic],
          isLoading: false,
        }));
        window.dispatchEvent(new CustomEvent('bg-sync:pending'));
        return optimistic;
      }
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateSimulation: async (id, updates) => {
    set({ isLoading: true, error: null });
    const prev = get().simulations;
    set((state) => ({
      simulations: state.simulations.map(s => s.id === id ? { ...s, ...updates } as SimulationTransaction: s),
    }));
    try {
      await simulationService.updateSimulation(id, updates);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      if (isOfflineMutationError(error)) {
        set({ isLoading: false });
        window.dispatchEvent(new CustomEvent('bg-sync:pending'));
        return true;
      }
      set({ simulations: prev, error: error.message, isLoading: false });
      return false;
    }
  },

  deleteSimulation: async (id) => {
    set({ isLoading: true, error: null });
    const prev = get().simulations;
    set((state) => ({
      simulations: state.simulations.filter(s => s.id !== id),
    }));
    try {
      await simulationService.deleteSimulation(id);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      if (isOfflineMutationError(error)) {
        set({ isLoading: false });
        window.dispatchEvent(new CustomEvent('bg-sync:pending'));
        return true;
      }
      set({ simulations: prev, error: error.message, isLoading: false });
      return false;
    }
  },

  clearCache: () => set({ lastFetch: null }),
  clearError: () => set({ error: null }),
}));