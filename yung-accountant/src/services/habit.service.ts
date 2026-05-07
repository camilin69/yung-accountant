import { habitsAxios } from './api/axios.config';
import type { Habit, HabitCheck } from '../types';

export interface CreateHabitRequest {
  name: string;
}

export interface UpdateHabitRequest {
  name?: string;
  isActive?: boolean;
}

export interface CheckHabitRequest {
  habitId: string;
  checkDate: string;
  completed: boolean;
  note?: string;
}

export const habitService = {
  async getAllHabits(): Promise<Habit[]> {
    const response = await habitsAxios.get<Habit[]>('/habits');
    return response.data;
  },

  async createHabit(data: CreateHabitRequest): Promise<{ id: string; message: string }> {
    const response = await habitsAxios.post<{ id: string; message: string }>('/habits', data);
    return response.data;
  },

  async updateHabit(id: string, data: UpdateHabitRequest): Promise<{ message: string }> {
    const response = await habitsAxios.put<{ message: string }>(`/habits/${id}`, data);
    return response.data;
  },

  async deleteHabit(id: string): Promise<{ message: string }> {
    const response = await habitsAxios.delete<{ message: string }>(`/habits/${id}`);
    return response.data;
  },

  async checkHabit(habitId: string, data: Omit<CheckHabitRequest, 'habitId'>): Promise<{ id: string; message: string }> {
    const response = await habitsAxios.post<{ id: string; message: string }>(`/habits/${habitId}/check`, {
      ...data,
      habitId,
    });
    return response.data;
  },
};