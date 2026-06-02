// types/index.ts

export interface VariableInterest {
  month: number;
  rate: number;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  interestAmount: number;
  principalAmount: number;
  remainingBalance: number;
  notes?: string;
}

export interface Debt {
  id: string;
  userId: string;
  type: 'borrowed' | 'lent';
  creditorName: string;
  walletId: string;
  categoryId: string;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  compoundMonths: number; // 0 = sin compound, > 0 = capitaliza cada N meses
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  nextDueDate: string;
  status: 'active' | 'paid' | 'defaulted';
  notes?: string;
  payments?: DebtPayment[];
  createdAt: string;
  realAmountToPay: number;
  realInterests: number;
  variableInterests?: VariableInterest[];
}