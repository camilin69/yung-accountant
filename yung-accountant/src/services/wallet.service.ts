import { walletsAxios } from './api/axios.config';
import type { Wallet } from '../types';

export interface CreateWalletRequest {
  name: string;
  type: 'cash' | 'bank_account' | 'credit_card' | 'debit_card' | 'other';
  bankName?: string;
  lastFourDigits?: string;
  color?: string;
  icon?: string;
  currentBalance?: number;
}

export interface UpdateWalletRequest {
  name?: string;
  type?: string;
  bankName?: string;
  lastFourDigits?: string;
  color?: string;
  icon?: string;
  currentBalance?: number;
  isActive?: boolean;
}

export const walletService = {
  async getAllWallets(): Promise<Wallet[]> {
    const response = await walletsAxios.get<Wallet[]>('/wallets');
    return response.data;
  },

  async getWalletById(id: string): Promise<Wallet> {
    const response = await walletsAxios.get<Wallet>(`/wallets/${id}`);
    return response.data;
  },

  async createWallet(data: CreateWalletRequest): Promise<{ id: string; message: string }> {
    const response = await walletsAxios.post<{ id: string; message: string }>('/wallets', data);
    return response.data;
  },

  async updateWallet(id: string, data: UpdateWalletRequest): Promise<{ message: string }> {
    const response = await walletsAxios.put<{ message: string }>(`/wallets/${id}`, data);
    return response.data;
  },

  async deleteWallet(id: string): Promise<{ message: string }> {
    const response = await walletsAxios.delete<{ message: string }>(`/wallets/${id}`);
    return response.data;
  },
};