// pages/Categories/CategoryFormModal.tsx
import React from 'react';
import { X, Save, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
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

  const typeStyles = {
    expense: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', border: 'rgba(239,68,68,0.25)' },
    income: { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.25)' },
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[90vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {editingCategory ? 'Update your category' : 'Create a new category'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                placeholder="e.g., Groceries, Freelance..."
                autoFocus
                maxLength={50}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Type</label>
              <div className="flex gap-3">
                {(['expense', 'income'] as const).map((type) => {
                  const isSelected = formData.type === type;
                  const style = typeStyles[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-500 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      style={{
                        backgroundColor: isSelected ? style.bg : 'var(--theme-background-glass-hover)',
                        color: isSelected ? style.text : 'var(--theme-text-tertiary)',
                        border: isSelected ? `1px solid ${style.border}` : '1px solid var(--theme-border-dark)',
                        boxShadow: isSelected ? `0 4px 12px -4px ${style.bg}` : 'none',
                      }}
                    >
                      {type === 'expense' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {type === 'expense' ? 'Expense' : 'Income'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Icon</label>
              <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 modal-scroll">
                {iconOptions.map(({ name }) => {
                  const IconComponent = getIconComponent(name);
                  const isSelected = formData.icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: name })}
                      className="w-12 h-12 rounded-[0.85rem] flex items-center justify-center transition-all duration-300 hover:scale-110"
                      style={{
                        backgroundColor: isSelected ? 'var(--theme-background-glass-hover)' : 'var(--theme-background-glass)',
                        border: isSelected ? '1px solid var(--theme-border-medium)' : '1px solid var(--theme-border-dark)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Color</label>
              <div className="flex gap-2.5 flex-wrap">
                {colorOptions.map(color => {
                  const isSelected = formData.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className="w-9 h-9 rounded-full transition-all duration-300 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        boxShadow: isSelected ? `0 0 0 3px var(--theme-background-primary), 0 0 0 5px ${color}` : 'none',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-[1.25rem] glass-sm">
              <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)' }}>Preview</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 hover:scale-110"
                  style={{ backgroundColor: `${formData.color}18` }}
                >
                  <SelectedIcon className="w-5 h-5" style={{ color: formData.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formData.name || 'Category Name'}</p>
                  <p className="text-[10px] font-medium capitalize mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{formData.type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--theme-primary)', boxShadow: 'var(--shadow-button)' }}
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