// pages/Goals/CompletedGoalCard.tsx

import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CheckCircle, Calendar, Trash2 } from 'lucide-react';

interface CompletedGoalCardProps {
  goal: any;
  onDelete: (id: string, name: string) => void;
  onOpenDetail: (goal: any) => void;
}

export const CompletedGoalCard: React.FC<CompletedGoalCardProps> = ({
  goal,
  onDelete,
  onOpenDetail,
}) => {
  return (
    <div 
      onClick={() => onOpenDetail(goal)}
      className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-5 opacity-70 hover:opacity-100 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500/60" />
          <h3 className="text-base font-light text-white/60 line-through">{goal.name}</h3>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onDelete(goal.id, goal.name)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between text-xs mb-2">
        <span className="text-white/30">Completed: {formatCurrency(goal.currentAmount)}</span>
        <span className="text-white/30">Target: {formatCurrency(goal.targetAmount)}</span>
      </div>
      
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full w-full" />
      </div>
      
      <div className="flex items-center gap-2 text-[10px] text-white/20">
        <Calendar className="w-3 h-3" />
        Completed: {formatDate(goal.completedAt || goal.targetDate, 'long')}
      </div>
    </div>
  );
};