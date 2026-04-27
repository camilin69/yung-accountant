export interface SimulationTransaction {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  categoryName?: string;
  description: string;
  startDate: string;
  endDate: string;
  days: number;
  weeks: number;
  months: number;
  period: 'day' | 'week' | 'month';
  createdAt: string;
}