import { create } from 'zustand';
import type { SimulationTransaction } from '../types';
import { simulationService } from '../services/simulation.service';
import type { CreateSimulationRequest, UpdateSimulationRequest } from '../services/simulation.service';

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
      console.log('[SimulationStore] Using memory cache');
      return;
    }
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
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateSimulation: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await simulationService.updateSimulation(id, updates);
      await get().fetchSimulations(true);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteSimulation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await simulationService.deleteSimulation(id);
      set((state) => ({
        simulations: state.simulations.filter(s => s.id !== id),
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