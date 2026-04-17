// components/common/TransactionItem.tsx

import React from 'react';
import type { Transaction } from '../../types';
import { formatCurrency, formatDate, getCategoryIcon } from '../../utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDelete }) => {
  const isIncome = transaction.isIncome;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
          isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          {getCategoryIcon(transaction.category)}
        </div>
        <div>
          <div className="font-medium">{transaction.category}</div>
          <div className="text-xs text-gray-500">
            {transaction.description || '-'} • {formatDate(transaction.date)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`font-semibold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(transaction.id)}
            className="text-gray-500 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default TransactionItem;