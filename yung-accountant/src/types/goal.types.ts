export interface GoalTransaction {
  id: string;
  goalId: string;
  amount: number;
  type: 'add' | 'remove';
  note: string;
  date: string;
  walletId: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  context: string;
  purchaseCategoryId?: string;
  completedAt?: string;
  transactions?: GoalTransaction[];
}