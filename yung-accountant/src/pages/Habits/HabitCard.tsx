// pages/Habits/HabitCard.tsx
import React from 'react';
import { Calendar, Edit2, Trash2, Power, PowerOff, Flame, TrendingUp, CheckCircle, Clock, CloudUpload } from 'lucide-react';
import { isOptimistic } from '../../services/offlineHelper';

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
      className={`group rounded-[1.75rem] p-5 transition-all duration-500 cursor-pointer animate-fade-in-up glass-md hover:-translate-y-1 ${
        isSelected ? 'glass-aero' : ''
      }`}
      style={isSelected ? { boxShadow: '0 0 20px -6px var(--theme-primary)' } : {}}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-11 h-11 rounded-[1.15rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}
          >
            <Calendar className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>Daily habit</span>
                {isOptimistic(habit.id) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', color: 'var(--semantic-warning)' }}>
                    <CloudUpload className="w-2.5 h-2.5" /> Pending sync
                  </span>
                )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onToggleActive(habit, e)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm" title={habit.isActive ? 'Deactivate' : 'Activate'}>
            {habit.isActive ? <Power className="w-3.5 h-3.5" style={{ color: 'var(--semantic-warning)', opacity: 0.8 }} strokeWidth={1.5} /> : <PowerOff className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />}
          </button>
          <button onClick={() => onEdit(habit)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
          </button>
          <button onClick={(e) => onDelete(habit.id, e)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Streak Info */}
      <div className="flex items-center gap-5 pt-3" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" style={{ color: '#F97316', opacity: 0.7 }} strokeWidth={1.5} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Streak: {habit.currentStreak}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--semantic-warning)', opacity: 0.7 }} strokeWidth={1.5} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Best: {habit.bestStreak}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {isCompletedToday ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--semantic-income)', opacity: 0.85 }}>Done today</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Pending</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};