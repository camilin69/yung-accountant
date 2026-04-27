// pages/Debts/types.ts

export interface DebtFormData {
  type: 'borrowed' | 'lent';
  creditorName: string;
  walletId: string;
  originalAmount: number;
  monthlyPayment: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  termMonths: number;
  startDate: string;
  notes: string;
}

export interface DebtFormErrors {
  creditorName: string;
  walletId: string;
  originalAmount: string;
  monthlyPayment: string;
  termMonths: string;
  startDate: string;
  type: string;
}

export interface VariableInterest {
  month: number;
  rate: number;
}