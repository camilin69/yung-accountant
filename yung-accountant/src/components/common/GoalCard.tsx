// components/common/GoalCard.tsx

import React from 'react';
import type { Goal } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Target, Calendar } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  onAddFunds?: (id: string) => void;
}

const priorityColors = {
  high: 'text-red-500 bg-red-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-green-500 bg-green-500/10',
};

const GoalCard: React.FC<GoalCardProps> = ({ goal, onAddFunds }) => {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold">{goal.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">{formatDate(goal.targetDate, 'long')}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[goal.priority]}`}>
          {goal.priority}
        </span>
      </div>
      <div className="flex justify-between text-sm mb-2">
        <span>Saved: {formatCurrency(goal.currentAmount)}</span>
        <span>Target: {formatCurrency(goal.targetAmount)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{Math.round(progress)}% complete</span>
        <span>{formatCurrency(remaining)} left</span>
      </div>
      {onAddFunds && (
        <button
          onClick={() => onAddFunds(goal.id)}
          className="w-full mt-2 py-2 text-sm bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
        >
          + Add Funds
        </button>
      )}
    </div>
  );
};

export default GoalCard;