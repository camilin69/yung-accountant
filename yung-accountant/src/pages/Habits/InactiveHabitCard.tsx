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
      onClick={() => onSelect(habit.id)}
      className={`group rounded-[1.75rem] p-5 transition-all duration-500 cursor-pointer glass-sm hover:bg-[var(--theme-background-glass-hover)] ${
        isSelected ? 'glass-md' : ''
      }`}
      style={isSelected ? { boxShadow: '0 0 16px -4px var(--theme-primary)' } : {}}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-11 h-11 rounded-[1.15rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
            style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}
          >
            <Calendar className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-tertiary)' }}>{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Inactive</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onToggleActive(habit, e)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm" title="Activate">
            <Power className="w-3.5 h-3.5" style={{ color: '#10B981', opacity: 0.8 }} strokeWidth={1.5} />
          </button>
          <button onClick={() => onEdit(habit)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
          </button>
          <button onClick={(e) => onDelete(habit.id, e)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};