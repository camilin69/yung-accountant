// pages/Habits/HabitFormModal.tsx

import React from 'react';
import { X, Save, AlertCircle, Power, PowerOff } from 'lucide-react';

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
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div>
              <h3 className="text-lg font-light text-white">
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                {editingHabit ? 'Update your habit' : 'Create a new habit to track'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">
              Habit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                errors.name ? 'border-red-500/50' : 'border-white/10'
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

          {/* Status */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: true })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.isActive
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
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
                    : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                <PowerOff className="w-4 h-4" />
                Inactive
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <p className="text-[9px] text-white/40 font-light mb-2">How it works</p>
            <div className="space-y-1 text-[10px] text-white/30">
              <p>• Mark days when you complete your habit</p>
              <p>• Add notes to track details (e.g., "30 min workout")</p>
              <p>• Maintain streaks by being consistent</p>
              <p>• Your best streak is automatically tracked</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-white/10">
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
              {editingHabit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};