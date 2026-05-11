import { simulationsAxios } from './api/axios.config';
import type { SimulationTransaction } from '../types';

export interface CreateSimulationRequest {
  amount: number;
  categoryId: string;
  description?: string;
  startDate: string;
  endDate: string;
  days: number;
  weeks: number;
  months: number;
  period: 'day' | 'week' | 'month';
}

export interface UpdateSimulationRequest {
  amount?: number;
  categoryId?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  weeks?: number;
  months?: number;
  period?: string;
}

export const simulationService = {
  async getAllSimulations(): Promise<SimulationTransaction[]> {
    const response = await simulationsAxios.get<SimulationTransaction[]>('/simulations');
    return response.data;
  },

  async createSimulation(data: CreateSimulationRequest): Promise<{ id: string; message: string }> {
    const response = await simulationsAxios.post<{ id: string; message: string }>('/simulations', data);
    return response.data;
  },

  async updateSimulation(id: string, data: UpdateSimulationRequest): Promise<{ message: string }> {
    const response = await simulationsAxios.put<{ message: string }>(`/simulations/${id}`, data);
    return response.data;
  },

  async deleteSimulation(id: string): Promise<{ message: string }> {
    const response = await simulationsAxios.delete<{ message: string }>(`/simulations/${id}`);
    return response.data;
  },
};