import type { Category } from '../types';
import { categoriesAxios } from './api/axios.config';



export interface CreateCategoryRequest {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export const categoryService = {
  async getAllCategories(): Promise<Category[]> {
    const response = await categoriesAxios.get<Category[]>('/categories/all');
    return response.data;
  },

  async getSystemCategories(): Promise<Category[]> {
    const response = await categoriesAxios.get<Category[]>('/categories/system');
    return response.data;
  },

  async getUserCategories(): Promise<Category[]> {
    const response = await categoriesAxios.get<Category[]>('/categories/user');
    return response.data;
  },

  async getCategoryById(id: string): Promise<Category> {
    const response = await categoriesAxios.get<Category>(`/categories/${id}`);
    return response.data;
  },

  async createUserCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await categoriesAxios.post<Category>('/categories/user', data);
    return response.data;
  },

  async updateUserCategory(id: string, data: UpdateCategoryRequest): Promise<{ message: string; id: string }> {
    const response = await categoriesAxios.put<{ message: string; id: string }>(`/categories/user/${id}`, data);
    return response.data;
  },

  async deleteUserCategory(id: string): Promise<{ message: string }> {
    const response = await categoriesAxios.delete<{ message: string }>(`/categories/user/${id}`);
    return response.data;
  },
};