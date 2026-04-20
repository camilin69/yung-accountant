// pages/Categories.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';

const iconOptions = ['💰', '🍔', '🚗', '🌿', '🎮', '💪', '📚', '🏠', '⚡', '💻', '🎁', '🛍️', '☕', '🍕', '🍺', '🎬', '✈️', '🏥'];
const colorOptions = ['#00D26A', '#FF4757', '#FFB347', '#4ECDC4', '#A855F7', '#EC4899', '#6C63FF', '#FF6584', '#3B82F6', '#10B981'];

const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '💰',
    color: '#6C63FF',
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, { ...formData, isDefault: editingCategory.isDefault });
    } else {
      addCategory({ ...formData, isDefault: false });
    }

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'expense', icon: '💰', color: '#6366F1' });
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete category "${name}"?`)) {
      deleteCategory(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your income and expense categories</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', type: 'expense', icon: '💰', color: '#6C63FF' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Income Categories */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-green-500 rounded-full" />
          <h2 className="text-lg font-medium text-white">Income</h2>
          <span className="text-xs text-gray-500">{incomeCategories.length} categories</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {incomeCategories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {incomeCategories.length === 0 && (
            <div className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-800 rounded-xl">
              No income categories yet
            </div>
          )}
        </div>
      </div>

      {/* Expense Categories */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-red-500 rounded-full" />
          <h2 className="text-lg font-medium text-white">Expenses</h2>
          <span className="text-xs text-gray-500">{expenseCategories.length} categories</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenseCategories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {expenseCategories.length === 0 && (
            <div className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-800 rounded-xl">
              No expense categories yet
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A2E] rounded-2xl w-[480px] max-w-[90%]">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#6C63FF] transition-colors"
                  placeholder="e.g., Groceries, Freelance..."
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.type === 'expense'
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.type === 'income'
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl transition-all ${
                        formData.icon === icon
                          ? 'bg-[#6C63FF] text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Category Card Component
const CategoryCard: React.FC<{
  category: any;
  onEdit: (cat: any) => void;
  onDelete: (id: string, name: string) => void;
}> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-3 flex items-center justify-between group hover:border-gray-700 transition-all">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `${category.color}20` }}
        >
          {category.icon}
        </div>
        <div>
          <p className="text-white font-medium text-sm">{category.name}</p>
          <p className="text-xs text-gray-500 capitalize">{category.type}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {!category.isDefault && (
          <button
            onClick={() => onDelete(category.id, category.name)}
            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Categories;