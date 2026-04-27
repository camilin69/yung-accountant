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
      className={`bg-white/[0.03] backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:bg-white/[0.06] ${
        isSelected ? 'border-[#6366F1]/50' : 'border-white/10'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-light text-white">{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40">Daily habit</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => onToggleActive(habit, e)} className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-white/40 hover:text-yellow-500 transition-colors" title={habit.isActive ? 'Deactivate' : 'Activate'}>
            {habit.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => onDelete(habit.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Streak Info */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-orange-500/60" />
          <span className="text-[10px] text-white/40">Streak: {habit.currentStreak}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-yellow-500/60" />
          <span className="text-[10px] text-white/40">Best: {habit.bestStreak}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {isCompletedToday ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-green-500/80">Done today</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/30">Pending</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};