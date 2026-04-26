// pages/Categories.tsx - Parte superior

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {  
  Edit2, 
  Plus, 
  Save, 
  Trash2, 
  X, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import { getIconComponent } from '../utils/iconHelpers';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';

// Lista de iconos disponibles (solo los nombres)
const iconOptions = [
  { name: 'Briefcase' },
  { name: 'Laptop' },
  { name: 'Gift' },
  { name: 'TrendingUp' },
  { name: 'Utensils' },
  { name: 'Car' },
  { name: 'Gamepad2' },
  { name: 'PiggyBank' },
  { name: 'Heart' },
  { name: 'GraduationCap' },
  { name: 'Home' },
  { name: 'Zap' },
  { name: 'ShoppingBag' },
  { name: 'Plane' },
  { name: 'Wallet' },
  { name: 'HandCoins' },
  { name: 'CreditCard' },
  { name: 'ArrowLeftRight' },
  { name: 'DollarSign' },
  { name: 'Coffee' },
  { name: 'Dumbbell' },
  { name: 'MoreHorizontal' },
];

const colorOptions = [
  '#10B981', '#EF4444', '#F59E0B', '#14B8A6', '#A855F7', 
  '#EC4899', '#6366F1', '#FF6584', '#3B82F6', '#06B6D4', 
  '#F97316', '#84CC16', '#EAB308', '#D946EF', '#8B5CF6'
];

// Nombres de categorías del sistema que no pueden ser eliminadas/editadas
const SYSTEM_CATEGORIES = ['Borrow', 'Lent', 'Debt Payment', 'Debt Collection'];

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
    icon: 'Briefcase',
    color: '#6366F1',
  });

  // Separar categorías
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const systemIncomeCategories = incomeCategories.filter(c => c.isDefault || SYSTEM_CATEGORIES.includes(c.name));
  const customIncomeCategories = incomeCategories.filter(c => !c.isDefault && !SYSTEM_CATEGORIES.includes(c.name));
  
  const systemExpenseCategories = expenseCategories.filter(c => c.isDefault || SYSTEM_CATEGORIES.includes(c.name));
  const customExpenseCategories = expenseCategories.filter(c => !c.isDefault && !SYSTEM_CATEGORIES.includes(c.name));

  const isSystemCategory = (category: any) => {
    return category.isDefault || SYSTEM_CATEGORIES.includes(category.name);
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
    setFormData({ name: '', type: 'expense', icon: 'Briefcase', color: '#6366F1' });
  };

  const handleEdit = (category: any) => {
    if (isSystemCategory(category)) {
      setToastMessage('System categories cannot be edited');
      setToastType('warning');
      setShowToast(true);
      return;
    }
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
    const category = categories.find(c => c.id === id);
    if (category && isSystemCategory(category)) {
      setToastMessage('System categories cannot be deleted');
      setToastType('warning');
      setShowToast(true);
      return;
    }
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
            setFormData({ name: '', type: 'expense', icon: 'Briefcase', color: '#6366F1' });
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Category
        </button>
      </div>

      {/* Income Categories */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-green-500 rounded-full" />
          <h2 className="text-sm font-light text-white/60">Income Categories</h2>
          <span className="text-[10px] text-white/30">{incomeCategories.length} total</span>
        </div>
        
        {/* System Income Categories */}
        {systemIncomeCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemIncomeCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-white/40 capitalize">{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400/80">
                              Debt
                            </span>
                          )}
                          {!isDebtCategory && cat.isDefault && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Income Categories */}
        {customIncomeCategories.length > 0 && (
          <div>
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">Custom</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customIncomeCategories.map(cat => {
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
      </div>

      {/* Expense Categories */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-red-500 rounded-full" />
          <h2 className="text-sm font-light text-white/60">Expense Categories</h2>
          <span className="text-[10px] text-white/30">{expenseCategories.length} total</span>
        </div>
        
        {/* System Expense Categories */}
        {systemExpenseCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemExpenseCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-white/40 capitalize">{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400/80">
                              Debt
                            </span>
                          )}
                          {!isDebtCategory && cat.isDefault && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Expense Categories */}
        {customExpenseCategories.length > 0 && (
          <div>
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">Custom</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customExpenseCategories.map(cat => {
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
      </div>

      {/* Modal para crear/editar categoría */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10">
              <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
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
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
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
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
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
                          : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
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
                          : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
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
                  <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1">
                    {iconOptions.map(({ name }) => {
                      const IconComponent = getIconComponent(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: name })}
                          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            formData.icon === name
                              ? 'bg-[#6366F1]/20 border border-[#6366F1]/30'
                              : 'bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 ${
                            formData.icon === name ? 'text-[#6366F1]' : 'text-white/60'
                          }`} />
                        </button>
                      );
                    })}
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
                  <p className="text-[9px] text-white/40 font-light mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${formData.color}20` }}>
                      <SelectedIcon className="w-5 h-5" style={{ color: formData.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-light text-white">{formData.name || 'Category Name'}</p>
                      <p className="text-[10px] text-white/40 font-light capitalize">{formData.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0">
              <div className="flex gap-3 p-5 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl">
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