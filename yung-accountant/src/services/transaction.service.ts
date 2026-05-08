import { transactionsAxios } from './api/axios.config';
import type { Transaction } from '../types';

export interface CreateTransactionRequest {
  amount: number;
  description?: string;
  date: string;
  walletId: string;
  categoryId: string;
  tags?: string[];
}

export interface UpdateTransactionRequest {
  amount?: number;
  description?: string;
  categoryId?: string;
  walletId?: string;
  date?: string;
  tags?: string[];
}

export const transactionService = {
  async getAllTransactions(): Promise<Transaction[]> {
    const response = await transactionsAxios.get<Transaction[]>('/transactions');
    return response.data;
  },

  async getTransactionById(id: string): Promise<Transaction> {
    const response = await transactionsAxios.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async createTransaction(data: CreateTransactionRequest): Promise<{ id: string; message: string }> {
    const response = await transactionsAxios.post<{ id: string; message: string }>('/transactions', data);
    return response.data;
  },

  async updateTransaction(id: string, data: UpdateTransactionRequest): Promise<{ message: string }> {
    const response = await transactionsAxios.put<{ message: string }>(`/transactions/${id}`, data);
    return response.data;
  },

  async deleteTransaction(id: string): Promise<{ message: string }> {
    const response = await transactionsAxios.delete<{ message: string }>(`/transactions/${id}`);
    return response.data;
  },
};