import { create } from 'zustand';
import { categoryService } from '../services/category.service';
import type { Category } from '../types';

interface CategoryStore {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  ttl: number;

  fetchAllCategories: (forceRefresh?: boolean) => Promise<void>;
  addCategory: (data: { name: string; type: 'income' | 'expense'; icon: string; color: string }) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryStore>()((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000,

  fetchAllCategories: async (forceRefresh = false) => {
    const { lastFetch, ttl, categories } = get();

    if (!forceRefresh && lastFetch && (Date.now() - lastFetch) < ttl && categories.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const allCategories = await categoryService.getAllCategories();
      set({
        categories: allCategories,
        lastFetch: Date.now(),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Error al cargar categorías', isLoading: false });
    }
  },

  addCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newCategory = await categoryService.createUserCategory({
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        isDefault: false,
      });

      set((state) => ({
        categories: [...state.categories, newCategory],
        isLoading: false,
      }));

      return newCategory;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateCategory: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.updateUserCategory(id, {
        name: updates.name,
        type: updates.type,
        icon: updates.icon,
        color: updates.color,
      });

      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.deleteUserCategory(id);

      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  clearCache: () => set({ lastFetch: null }),
  clearError: () => set({ error: null }),
}));