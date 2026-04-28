// store/category.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category } from '../types';

const generateId = () => Date.now().toString();

const defaultCategories: Category[] = [
  // Income por defecto
  { id: '1', userId: '1', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '2', userId: '1', name: 'Freelance', type: 'income', icon: 'Laptop', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '3', userId: '1', name: 'Gift', type: 'income', icon: 'Gift', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '4', userId: '1', name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  
  // Nuevas categorías para transferencias entre wallets
  { id: 'wallet-transfer-income', userId: '1', name: 'Wallet Transfer', type: 'income', icon: 'ArrowLeftRight', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'wallet-transfer-expense', userId: '1', name: 'Wallet Transfer', type: 'expense', icon: 'ArrowLeftRight', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  
  // Expense por defecto
  { id: '5', userId: '1', name: 'Food', type: 'expense', icon: 'Utensils', color: '#EF4444', isDefault: true, createdAt: new Date().toISOString() },
  { id: '6', userId: '1', name: 'Transport', type: 'expense', icon: 'Car', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: '7', userId: '1', name: 'Entertainment', type: 'expense', icon: 'Gamepad2', color: '#A855F7', isDefault: true, createdAt: new Date().toISOString() },
  { id: '8', userId: '1', name: 'Savings', type: 'expense', icon: 'PiggyBank', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
  { id: '9', userId: '1', name: 'Health', type: 'expense', icon: 'Heart', color: '#EC4899', isDefault: true, createdAt: new Date().toISOString() },
  { id: '10', userId: '1', name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#6366F1', isDefault: true, createdAt: new Date().toISOString() },
  { id: '11', userId: '1', name: 'Rent', type: 'expense', icon: 'Home', color: '#FF6584', isDefault: true, createdAt: new Date().toISOString() },
  { id: '12', userId: '1', name: 'Utilities', type: 'expense', icon: 'Zap', color: '#F59E0B', isDefault: true, createdAt: new Date().toISOString() },
  { id: '13', userId: '1', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#EC4899', isDefault: true, createdAt: new Date().toISOString() },
  { id: '14', userId: '1', name: 'Travel', type: 'expense', icon: 'Plane', color: '#06B6D4', isDefault: true, createdAt: new Date().toISOString() },
  
  // Debt categories (solo estos son del sistema y no aparecerán en selección normal)
  { id: 'borrow-category', userId: '1', name: 'Borrow', type: 'income', icon: 'Wallet', color: '#10B981', isDefault: true, isSystem: true, createdAt: new Date().toISOString() },
  { id: 'lent-category', userId: '1', name: 'Lent', type: 'expense', icon: 'HandCoins', color: '#EF4444', isDefault: true, isSystem: true, createdAt: new Date().toISOString() },
  { id: 'debt-payment-default', userId: '1', name: 'Debt Payment', type: 'expense', icon: 'CreditCard', color: '#EF4444', isDefault: true, isSystem: true, createdAt: new Date().toISOString() },
  { id: 'debt-collection-default', userId: '1', name: 'Debt Collection', type: 'income', icon: 'Wallet', color: '#10B981', isDefault: true, isSystem: true, createdAt: new Date().toISOString() },
];

interface CategoryStore {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'userId'>, userId : string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set) => ({
      categories: defaultCategories,
      
      setCategories: (categories) => set({ categories }),
      
      addCategory: (category, userId) => {
        const newCategory: Category = {
          ...category,
          id: generateId(),
          userId: userId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
      },
      
      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },
      
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },
    }),
    { name: 'yung-accountant-categories' }
  )
);