import type { Wallet } from './wallet.types';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  walletId: string;
  wallet?: Wallet;
  tags: string[];
}