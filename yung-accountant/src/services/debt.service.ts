import { debtsAxios } from './api/axios.config';
import type { Debt } from '../types';

export interface CreateDebtRequest {
  type: 'borrowed' | 'lent';
  creditorName: string;
  walletId: string;
  categoryId: string;
  originalAmount: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  nextDueDate?: string;
  notes?: string;
  realAmountToPay?: number;
  realInterests?: number;
  variableInterests?: { month: number; rate: number }[];
}

export interface UpdateDebtRequest {
  type?: 'borrowed' | 'lent';
  creditorName?: string;
  walletId?: string;
  categoryId?: string;
  originalAmount?: number;
  remainingBalance?: number;
  status?: string;
  monthlyPayment?: number;
  interestRate?: number;
  interestType?: 'fixed' | 'variable';
  termMonths?: number;
  startDate?: string;
  nextDueDate?: string;
  notes?: string;
  realAmountToPay?: number;
  realInterests?: number;
  variableInterests?: { month: number; rate: number }[];
}

export interface CreatePaymentRequest {
  debtId: string;
  amount: number;
  date: string;
  interestAmount: number;
  principalAmount: number;
  remainingBalance: number;
  notes?: string;
}

export interface CreateInterestRequest {
  debtId: string;
  month: number;
  rate: number;
}

export const debtService = {
  async getAllDebts(): Promise<Debt[]> {
    const response = await debtsAxios.get<Debt[]>('/debts');
    return response.data;
  },

  async getDebtById(id: string): Promise<Debt> {
    const response = await debtsAxios.get<Debt>(`/debts/${id}`);
    return response.data;
  },

  async createDebt(data: CreateDebtRequest): Promise<{ id: string; message: string }> {
    const response = await debtsAxios.post<{ id: string; message: string }>('/debts', data);
    return response.data;
  },

  async updateDebt(id: string, data: UpdateDebtRequest): Promise<{ message: string }> {
    const response = await debtsAxios.put<{ message: string }>(`/debts/${id}`, data);
    return response.data;
  },

  async deleteDebt(id: string): Promise<{ message: string }> {
    const response = await debtsAxios.delete<{ message: string }>(`/debts/${id}`);
    return response.data;
  },

  async addPayment(debtId: string, data: Omit<CreatePaymentRequest, 'debtId'>): Promise<{ id: string; message: string }> {
    const response = await debtsAxios.post<{ id: string; message: string }>(`/debts/${debtId}/payments`, {
      ...data,
      debtId,
    });
    return response.data;
  },

  async deletePayment(paymentId: string): Promise<{ message: string }> {
    const response = await debtsAxios.delete<{ message: string }>(`/payments/${paymentId}`);
    return response.data;
  },

  async addVariableInterest(data: CreateInterestRequest): Promise<{ message: string }> {
    const response = await debtsAxios.post<{ message: string }>('/interests', data);
    return response.data;
  },
};