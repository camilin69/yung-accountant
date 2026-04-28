export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: 'cash' | 'bank_account' | 'credit_card' | 'debit_card' | 'other';
  bankName?: string;
  lastFourDigits?: string;
  color: string;
  icon: string;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}