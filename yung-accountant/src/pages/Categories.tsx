// pages/Categories.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Edit2, 
  Plus, 
  Save, 
  Trash2, 
  X, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Briefcase,
  Gift,
  Coffee,
  Car,
  Leaf,
  Gamepad2,
  Dumbbell,
  GraduationCap,
  Home,
  Zap,
  ShoppingBag,
  Plane,
  Heart,
  MoreHorizontal,
  Tag
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';

// Iconos de Lucide React en lugar de emojis
const iconOptions = [
  { icon: DollarSign, name: 'DollarSign', color: '#10B981' },
  { icon: Briefcase, name: 'Briefcase', color: '#6366F1' },
  { icon: Gift, name: 'Gift', color: '#EC4899' },
  { icon: Coffee, name: 'Coffee', color: '#F59E0B' },
  { icon: Car, name: 'Car', color: '#EF4444' },
  { icon: Leaf, name: 'Leaf', color: '#14B8A6' },
  { icon: Gamepad2, name: 'Gamepad2', color: '#A855F7' },
  { icon: Dumbbell, name: 'Dumbbell', color: '#FF6584' },
  { icon: GraduationCap, name: 'GraduationCap', color: '#6366F1' },
  { icon: Home, name: 'Home', color: '#F59E0B' },
  { icon: Zap, name: 'Zap', color: '#FBBF24' },
  { icon: ShoppingBag, name: 'ShoppingBag', color: '#EC4899' },
  { icon: Plane, name: 'Plane', color: '#06B6D4' },
  { icon: Heart, name: 'Heart', color: '#EF4444' },
  { icon: MoreHorizontal, name: 'MoreHorizontal', color: '#6B7280' },
];

const colorOptions = [
  '#10B981', '#EF4444', '#F59E0B', '#14B8A6', '#A855F7', 
  '#EC4899', '#6366F1', '#FF6584', '#3B82F6', '#06B6D4', 
  '#F97316', '#84CC16', '#EAB308', '#D946EF', '#8B5CF6'
];

const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: 'DollarSign',
    color: '#6366F1',
  });

  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isDefault);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isDefault);
  const defaultIncomeCategories = categories.filter(c => c.type === 'income' && c.isDefault);
  const defaultExpenseCategories = categories.filter(c => c.type === 'expense' && c.isDefault);

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(i => i.name === iconName);
    return found?.icon || MoreHorizontal;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setToastMessage('Please enter a category name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, { ...formData, isDefault: editingCategory.isDefault });
      setToastMessage('Category updated successfully');
    } else {
      addCategory({ ...formData, isDefault: false });
      setToastMessage('Category created successfully');
    }
    setToastType('success');
    setShowToast(true);

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'expense', icon: 'DollarSign', color: '#6366F1' });
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setCategoryToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setToastMessage(`Category "${categoryToDelete.name}" deleted`);
      setToastType('success');
      setShowToast(true);
      setCategoryToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const SelectedIcon = getIconComponent(formData.icon);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Categories
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage your income and expense categories</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', type: 'expense', icon: 'DollarSign', color: '#6366F1' });
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Category
        </button>
      </div>

      {/* Default Income Categories */}
      {defaultIncomeCategories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-green-500 rounded-full" />
            <h2 className="text-sm font-light text-white/60">Default Income</h2>
            <span className="text-[10px] text-white/30">System categories</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {defaultIncomeCategories.map(cat => {
              const IconComponent = getIconComponent(cat.icon);
              return (
                <div key={cat.id} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-light">{cat.name}</p>
                    <p className="text-[10px] text-white/30 capitalize">{cat.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Income Categories */}
      {incomeCategories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-green-500 rounded-full" />
            <h2 className="text-sm font-light text-white/60">Income Categories</h2>
            <span className="text-[10px] text-white/30">{incomeCategories.length} custom</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incomeCategories.map(cat => {
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  getIcon={getIconComponent}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Default Expense Categories */}
      {defaultExpenseCategories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h2 className="text-sm font-light text-white/60">Default Expenses</h2>
            <span className="text-[10px] text-white/30">System categories</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {defaultExpenseCategories.map(cat => {
              const IconComponent = getIconComponent(cat.icon);
              return (
                <div key={cat.id} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-light">{cat.name}</p>
                    <p className="text-[10px] text-white/30 capitalize">{cat.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Expense Categories */}
      {expenseCategories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h2 className="text-sm font-light text-white/60">Expense Categories</h2>
            <span className="text-[10px] text-white/30">{expenseCategories.length} custom</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expenseCategories.map(cat => {
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  getIcon={getIconComponent}
                />
              );
            })}
          </div>
        </div>
      )}

      {incomeCategories.length === 0 && expenseCategories.length === 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Tag className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-light">No custom categories yet</p>
          <p className="text-white/30 text-xs mt-1">Create your first category to organize your transactions</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-white/10 sticky top-0 bg-[#1A1A2E]">
              <div>
                <h3 className="text-lg font-light text-white">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                <p className="text-xs text-white/40 mt-0.5 font-light">
                  {editingCategory ? 'Update your category' : 'Create a new category'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors"
                  placeholder="e.g., Groceries, Freelance..."
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                      formData.type === 'expense'
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                      formData.type === 'income'
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Income
                  </button>
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map(({ icon: IconComponent, name }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: name })}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        formData.icon === name
                          ? 'bg-[#6366F1]/20 border border-[#6366F1]/30'
                          : 'bg-white/[0.03] border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 text-white/60" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all duration-200 ${
                        formData.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <p className="text-[9px] text-white/40 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}>
                    <SelectedIcon className="w-5 h-5" style={{ color: formData.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-light text-white">{formData.name || 'Category Name'}</p>
                    <p className="text-[10px] text-white/40 capitalize">{formData.type}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-[#1A1A2E]">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone. Transactions using this category will be affected.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

// Category Card Component
const CategoryCard: React.FC<{
  category: any;
  onEdit: (cat: any) => void;
  onDelete: (id: string, name: string) => void;
  getIcon: (iconName: string) => React.ComponentType<any>;
}> = ({ category, onEdit, onDelete, getIcon }) => {
  const IconComponent = getIcon(category.icon);

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:bg-white/[0.06] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <p className="text-white/80 text-sm font-light">{category.name}</p>
          <p className="text-[10px] text-white/40 capitalize">{category.type}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(category.id, category.name)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Categories;