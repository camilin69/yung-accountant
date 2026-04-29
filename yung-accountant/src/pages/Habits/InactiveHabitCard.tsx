// pages/Habits/InactiveHabitCard.tsx
import React from 'react';
import { Calendar, Edit2, Trash2, Power } from 'lucide-react';

interface InactiveHabitCardProps {
  habit: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (habit: any, e: React.MouseEvent) => void;
  onEdit: (habit: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const InactiveHabitCard: React.FC<InactiveHabitCardProps> = ({
  habit,
  isSelected,
  onSelect,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      key={habit.id}
      onClick={() => onSelect(habit.id)}
      className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:bg-[var(--theme-background-glass-hover)] ${
        isSelected ? 'border-[var(--theme-primary)]/50' : 'border-[var(--theme-border-dark)]'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
            <Calendar className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
          </div>
          <div>
            <h3 className="text-base font-light text-[var(--theme-text-tertiary)]">{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[var(--theme-text-tertiary)]/50">Inactive</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onToggleActive(habit, e)} className="p-1.5 rounded-lg hover:bg-green-500/20 text-[var(--theme-text-tertiary)] hover:text-green-500 transition-colors" title="Activate">
            <Power className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => onDelete(habit.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};