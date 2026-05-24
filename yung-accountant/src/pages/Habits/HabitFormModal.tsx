// pages/Habits/HabitFormModal.tsx
import React from 'react';
import { X, Save, AlertCircle, Power, PowerOff, ArrowLeft } from 'lucide-react';

interface HabitFormModalProps {
  isOpen: boolean;
  editingHabit: any;
  formData: { name: string; isActive: boolean };
  setFormData: (data: any) => void;
  errors: { name: string };
  onClose: () => void;
  onSubmit: () => void;
}

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  editingHabit,
  formData,
  setFormData,
  errors,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const statusOptions = [
    { value: true, label: 'Active', icon: <Power className="w-4 h-4" />, activeBg: 'rgba(16,185,129,0.12)', activeText: '#10B981', activeBorder: 'rgba(16,185,129,0.25)' },
    { value: false, label: 'Inactive', icon: <PowerOff className="w-4 h-4" />, activeBg: 'rgba(156,163,175,0.12)', activeText: '#9CA3AF', activeBorder: 'rgba(156,163,175,0.25)' },
  ];

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {editingHabit ? 'Update your habit' : 'Create a new habit to track'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          {/* Habit Name */}
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              Habit Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm ${
                errors.name ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
              placeholder="e.g., Exercise, Read, Meditate..."
              autoFocus
            />
            {errors.name && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.name}</p>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Status</label>
            <div className="flex gap-3">
              {statusOptions.map((opt) => {
                const isSelected = formData.isActive === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: opt.value })}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-500 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: isSelected ? opt.activeBg : 'var(--theme-background-glass-hover)',
                      color: isSelected ? opt.activeText : 'var(--theme-text-tertiary)',
                      border: isSelected ? `1px solid ${opt.activeBorder}` : '1px solid var(--theme-border-dark)',
                      boxShadow: isSelected ? `0 4px 12px -4px ${opt.activeBg}` : 'none',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-[1.25rem] glass-sm">
            <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-2.5" style={{ color: 'var(--theme-text-tertiary)' }}>How it works</p>
            <div className="space-y-1.5 text-[11px] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.65 }}>
              <p className="flex items-center gap-2"><span style={{ color: 'var(--theme-primary)' }}>•</span> Mark days when you complete your habit</p>
              <p className="flex items-center gap-2"><span style={{ color: 'var(--theme-primary)' }}>•</span> Add notes to track details (e.g., "30 min workout")</p>
              <p className="flex items-center gap-2"><span style={{ color: 'var(--theme-primary)' }}>•</span> Maintain streaks by being consistent</p>
              <p className="flex items-center gap-2"><span style={{ color: 'var(--theme-primary)' }}>•</span> Your best streak is automatically tracked</p>
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
              {editingHabit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};