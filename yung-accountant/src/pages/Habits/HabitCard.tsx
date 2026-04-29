// pages/Habits/HabitCard.tsx
import React from 'react';
import { Calendar, Edit2, Trash2, Power, PowerOff, Flame, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface HabitCardProps {
  habit: any;
  isSelected: boolean;
  isCompletedToday: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (habit: any, e: React.MouseEvent) => void;
  onEdit: (habit: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isSelected,
  isCompletedToday,
  onSelect,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      onClick={() => onSelect(habit.id)}
      className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:bg-[var(--theme-background-glass-hover)] ${
        isSelected ? 'border-[var(--theme-primary)]/50' : 'border-[var(--theme-border-light)]'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--theme-primary)]/10">
            <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />
          </div>
          <div>
            <h3 className="text-base font-light text-[var(--theme-text-primary)]">{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[var(--theme-text-tertiary)]">Daily habit</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onToggleActive(habit, e)} className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-[var(--theme-text-tertiary)] hover:text-yellow-500 transition-colors" title={habit.isActive ? 'Deactivate' : 'Activate'}>
            {habit.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => onDelete(habit.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Streak Info */}
      <div className="flex items-center gap-4 pt-2 border-t border-[var(--theme-border-light)]">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-orange-500/60" />
          <span className="text-[10px] text-[var(--theme-text-tertiary)]">Streak: {habit.currentStreak}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-yellow-500/60" />
          <span className="text-[10px] text-[var(--theme-text-tertiary)]">Best: {habit.bestStreak}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {isCompletedToday ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="text-[10px] text-green-600/80">Done today</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
              <span className="text-[10px] text-[var(--theme-text-tertiary)]">Pending</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};