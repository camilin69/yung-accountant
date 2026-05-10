// pages/Goals/CompletedGoalCard.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CheckCircle, Calendar, Trash2 } from 'lucide-react';

interface CompletedGoalCardProps {
  goal: any;
  onOpenDetail: (goal: any) => void;
  onDelete: (id: string, name: string) => void;
}

export const CompletedGoalCard: React.FC<CompletedGoalCardProps> = ({
  goal,
  onOpenDetail,
  onDelete,
}) => {
  return (
    <div 
      onClick={() => onOpenDetail(goal)}
      className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-dark)] rounded-xl p-5 opacity-70 hover:opacity-100 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600/60" />
          <h3 className="text-base font-light text-[var(--theme-text-tertiary)] line-through">{goal.name}</h3>
        </div>
        {/* ✅ Botón de borrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id, goal.name);
          }}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="flex justify-between text-xs mb-2">
        <span className="text-[var(--theme-text-tertiary)]/50">Completed: {formatCurrency(goal.currentAmount)}</span>
        <span className="text-[var(--theme-text-tertiary)]/50">Target: {formatCurrency(goal.targetAmount)}</span>
      </div>
      
      <div className="h-1.5 bg-[var(--theme-border-dark)] rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-green-600 to-emerald-700 rounded-full w-full" />
      </div>
      
      <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-tertiary)]/50">
        <Calendar className="w-3 h-3" />
        Completed: {formatDate(goal.completedAt || goal.targetDate, 'long')}
      </div>
    </div>
  );
};
