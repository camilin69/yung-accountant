import { goalsAxios } from './api/axios.config';
import type { Goal } from '../types';

export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  priority?: 'high' | 'medium' | 'low';
  context?: string;
  purchaseCategoryId?: string;
}

export interface UpdateGoalRequest {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  priority?: string;
  status?: string;
  context?: string;
  completedAt?: string;
  purchaseCategoryId?: string;
}


export interface CreateGoalTransactionRequest {
  goalId: string;
  amount: number;
  type: 'add' | 'remove';
  note?: string;
  date: string;
  walletId: string;
}

export const goalService = {
  async getAllGoals(): Promise<Goal[]> {
    const response = await goalsAxios.get<Goal[]>('/goals');
    return response.data;
  },

  async getGoalById(id: string): Promise<Goal> {
    const response = await goalsAxios.get<Goal>(`/goals/${id}`);
    return response.data;
  },

  async createGoal(data: CreateGoalRequest): Promise<{ id: string; message: string }> {
    const response = await goalsAxios.post<{ id: string; message: string }>('/goals', data);
    return response.data;
  },

  async updateGoal(id: string, data: UpdateGoalRequest): Promise<{ message: string }> {
    const response = await goalsAxios.put<{ message: string }>(`/goals/${id}`, data);
    return response.data;
  },

  async deleteGoal(id: string): Promise<{ message: string }> {
    const response = await goalsAxios.delete<{ message: string }>(`/goals/${id}`);
    return response.data;
  },

  async addGoalTransaction(data: CreateGoalTransactionRequest): Promise<{ id: string; message: string }> {
    const response = await goalsAxios.post<{ id: string; message: string }>('/goal-transactions', data);
    return response.data;
  },

  async deleteGoalTransaction(id: string): Promise<{ message: string }> {
    const response = await goalsAxios.delete<{ message: string }>(`/goal-transactions/${id}`);
    return response.data;
  },
};