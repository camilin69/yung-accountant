// pages/Goals/GoalCard.tsx

import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Edit2, Trash2, Calendar, ShoppingBag } from 'lucide-react';
import { PRIORITY_COLORS } from './constants';

interface GoalCardProps {
  goal: any;
  onEdit: (goal: any) => void;
  onDelete: (id: string, name: string) => void;
  onCompletePurchase: (goal: any) => void;
  onOpenDetail: (goal: any) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  onCompletePurchase,
  onOpenDetail,
}) => {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = progress >= 100;
  const priorityColor = PRIORITY_COLORS[goal.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;

  return (
    <div 
      onClick={() => onOpenDetail(goal)}
      className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-base font-light text-white">{goal.name}</h3>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(goal.id, goal.name)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColor}`}>
          {goal.priority}
        </span>
        {goal.context && (
          <span className="text-[10px] text-white/30">{goal.context}</span>
        )}
      </div>
      
      <div className="flex justify-between text-xs mb-2">
        <span className="text-white/40">Saved: {formatCurrency(goal.currentAmount)}</span>
        <span className="text-white/40">Target: {formatCurrency(goal.targetAmount)}</span>
      </div>
      
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-white/40 mb-4">
        <span>{Math.round(progress)}% complete</span>
        <span>{formatCurrency(remaining)} left</span>
      </div>
      
      <div className="flex items-center gap-2 text-[10px] text-white/30 mb-4">
        <Calendar className="w-3 h-3" />
        Deadline: {formatDate(goal.targetDate, 'long')}
      </div>

      {isCompleted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompletePurchase(goal);
          }}
          className="w-full py-2 rounded-lg text-xs font-light flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#6366F1] to-[#EC4899] text-white hover:scale-[1.02]"
        >
          <ShoppingBag className="w-3 h-3" />
          Complete Purchase
        </button>
      )}
    </div>
  );
};