// pages/Goals/CompletedGoalCard.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CheckCircle, Calendar, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onOpenDetail(goal)}
      className="group rounded-[2rem] p-6 transition-all duration-500 cursor-pointer glass-sm opacity-60 hover:opacity-90 hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
            <CheckCircle className="w-4 h-4" style={{ color: 'var(--semantic-income)', opacity: 0.7 }} strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-medium line-through" style={{ color: 'var(--theme-text-tertiary)' }}>{goal.name}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id, goal.name);
          }}
          className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100 glass-sm"
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--semantic-expense)', opacity: 0.6 }} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>{t('goals.completed')}: {formatCurrency(goal.currentAmount)}</span>
        <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>{t('goals.goal')}: {formatCurrency(goal.targetAmount)}</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
        <div className="h-full rounded-full w-full" style={{ background: 'linear-gradient(90deg, var(--semantic-income), var(--semantic-income))', boxShadow: '0 0 12px -2px var(--semantic-income)' }} />
      </div>

      <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
        <Calendar className="w-3 h-3" strokeWidth={1.5} />
        {t('goals.completed')}: {formatDate(goal.completedAt || goal.targetDate, 'long')}
      </div>
    </div>
  );
};