export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault?: boolean;
  isSystem?: boolean;
  createdAt: string;
}