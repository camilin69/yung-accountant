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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                  {editingHabit ? 'Edit Habit' : 'New Habit'}
                </h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                  {editingHabit ? 'Update your habit' : 'Create a new habit to track'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
              Habit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors placeholder:text-[var(--theme-text-tertiary)]/20 ${
                errors.name ? 'border-red-500/50' : 'border-[var(--theme-border-light)]'
              }`}
              placeholder="e.g., Exercise, Read, Meditate..."
              autoFocus
            />
            {errors.name && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 text-red-500/80" />
                <p className="text-[10px] text-red-500/80">{errors.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: true })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.isActive
                    ? 'bg-green-500/20 text-green-600 border border-green-500/30'
                    : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-light)] hover:border-[var(--theme-border-medium)]'
                }`}
              >
                <Power className="w-4 h-4" />
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: false })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                  !formData.isActive
                    ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-light)] hover:border-[var(--theme-border-medium)]'
                }`}
              >
                <PowerOff className="w-4 h-4" />
                Inactive
              </button>
            </div>
          </div>

          <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
            <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light mb-2">How it works</p>
            <div className="space-y-1 text-[10px] text-[var(--theme-text-tertiary)]/70">
              <p>• Mark days when you complete your habit</p>
              <p>• Add notes to track details (e.g., "30 min workout")</p>
              <p>• Maintain streaks by being consistent</p>
              <p>• Your best streak is automatically tracked</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
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