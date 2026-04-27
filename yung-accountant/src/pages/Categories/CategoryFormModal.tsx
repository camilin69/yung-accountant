// pages/Categories/CategoryFormModal.tsx

import React from 'react';
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { iconOptions, colorOptions } from './constants';

interface CategoryFormModalProps {
  isOpen: boolean;
  editingCategory: any;
  formData: {
    name: string;
    type: 'income' | 'expense';
    icon: string;
    color: string;
  };
  setFormData: (data: any) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  editingCategory,
  formData,
  setFormData,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const SelectedIcon = getIconComponent(formData.icon);

  return (
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
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
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
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};