// pages/Goals/GoalCard.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Edit2, Trash2, Calendar, ShoppingBag } from 'lucide-react';
import { PRIORITY_COLORS } from './constants';
import { useTranslation } from '../../i18n';
import Tooltip from '../../components/common/Tooltip';

interface GoalCardProps {
  goal: any;
  onEdit: (goal: any) => void;
  onDelete: (id: string, name: string) => void;
  onCompletePurchase: (goal: any) => void;
  onOpenDetail: (goal: any) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal, onEdit, onDelete, onCompletePurchase, onOpenDetail,
}) => {
  const { t } = useTranslation();
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = progress >= 100;
  const priorityStyle = PRIORITY_COLORS[goal.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;

  return (
    <div
      onClick={() => onOpenDetail(goal)}
      className="group rounded-[2rem] p-6 transition-all duration-700 ease-out cursor-pointer animate-fade-in-up glass-md hover:-translate-y-2"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{goal.name}</h3>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('common.edit')} position="bottom">
            <button
              onClick={() => onEdit(goal)}
             
              className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100 glass-sm"
            >
              <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <Tooltip content={t('common.delete')} position="bottom">
            <button
              onClick={() => onDelete(goal.id, goal.name)}
             
              className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100 glass-sm"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ color: priorityStyle, backgroundColor: `${priorityStyle}14` }}>
          {t('goals.' + goal.priority)}
        </span>
        {goal.context && (
          <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{goal.context}</span>
        )}
      </div>

      <div className="flex justify-between text-xs mb-2">
        <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('goals.saved')}: {formatCurrency(goal.currentAmount)}</span>
        <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('goals.goal')}: {formatCurrency(goal.targetAmount)}</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--theme-gradient-primary)', boxShadow: '0 0 14px -4px var(--theme-primary)' }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-medium mb-4" style={{ color: 'var(--theme-text-tertiary)' }}>
        <span>{Math.round(progress)}% {t('goals.completed').toLowerCase()}</span>
        <span>{formatCurrency(remaining)} {t('goals.remaining')}</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-medium mb-4" style={{ color: 'var(--theme-text-tertiary)' }}>
        <Calendar className="w-3 h-3" strokeWidth={1.5} />
        {t('goals.targetDate')}: {formatDate(goal.targetDate, 'long')}
      </div>

      {isCompleted && (
        <button
          onClick={(e) => { e.stopPropagation(); onCompletePurchase(goal); }}
          className="w-full py-3 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 transition-all duration-500 hover:-translate-y-1"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px -4px var(--theme-primary)'
          }}
        >
          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
          {t('goals.completeGoal')}
        </button>
      )}
    </div>
  );
};