export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
}