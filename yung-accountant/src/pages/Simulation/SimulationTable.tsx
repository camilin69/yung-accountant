// pages/Simulation/SimulationTable.tsx
import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Edit2, Trash2, ChevronDown, PieChart } from 'lucide-react';
import { periodIcons } from './constants';
import { getIconComponent } from '../../utils/iconHelpers';

interface SimulationTableProps {
  sortedTransactions: any[];
  visibleCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  allSimulationsLength: number;
  visibleTransactionsLength: number;
  onViewDetails: (transaction: any) => void;
  onEdit: (transaction: any, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  loadMore: () => void;
  getCategoryById: (id: string) => any;
  isVerySmall: boolean;
  isMobile: boolean;
}

export const SimulationTable: React.FC<SimulationTableProps> = ({
  sortedTransactions,
  visibleCount,
  hasMore,
  isLoadingMore,
  allSimulationsLength,
  visibleTransactionsLength,
  onViewDetails,
  onEdit,
  onDelete,
  loadMore,
  getCategoryById,
}) => {
  if (allSimulationsLength === 0) {
    return (
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="text-center py-8 text-[var(--theme-text-tertiary)] text-sm font-light">
          No simulated transactions yet. Click "Simulate" to add one.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-[var(--theme-background-secondary)] border-b border-[var(--theme-border-light)]">
            <tr>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Created</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Amount</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Period</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Category</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)] hidden md:table-cell">Description</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Range</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Duration</th>
              <th className="text-left p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Total</th>
              <th className="text-center p-3 text-[10px] font-light text-[var(--theme-text-tertiary)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.slice(0, visibleCount).map((tx: any) => {
              const cat = getCategoryById(tx.categoryId);
              const totalAmount = tx.period === 'day' ? tx.amount * tx.days : tx.period === 'week' ? tx.amount * tx.weeks : tx.amount * tx.months;
              const periodLabel = tx.period === 'day' ? 'day' : tx.period === 'week' ? 'week' : 'month';
              const isIncome = cat?.type === 'income';
              const IconComponent = cat ? getIconComponent(cat.icon) : null;
              
              return (
                <tr key={tx.id} onClick={() => onViewDetails(tx)} className="border-b border-[var(--theme-border-dark)] hover:bg-[var(--theme-background-glass-hover)] transition-colors group cursor-pointer">
                  <td className="p-3 text-xs font-light text-[var(--theme-text-secondary)] whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                  <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-600' : 'text-red-600'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                  <td className="p-3 text-xs font-light text-[var(--theme-text-secondary)] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {periodIcons[tx.period]}
                      <span>per {periodLabel}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat?.color}20` }}>
                        {IconComponent && <IconComponent className="w-3.5 h-3.5" style={{ color: cat?.color }} />}
                      </div>
                      <span className="text-xs font-light text-[var(--theme-text-primary)] whitespace-nowrap">{cat?.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs font-light text-[var(--theme-text-tertiary)] hidden md:table-cell">{tx.description || '-'}</td>
                  <td className="p-3 text-xs font-light text-[var(--theme-text-secondary)] whitespace-nowrap">
                    {formatDate(tx.startDate, 'short')} → {formatDate(tx.endDate, 'short')}
                  </td>
                  <td className="p-3 text-xs font-light text-[var(--theme-text-secondary)]">{tx.days}d</td>
                  <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>
                    {isIncome ? '+' : '-'}{formatCurrency(totalAmount)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => onEdit(tx, e)} className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => onDelete(tx.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="p-4 text-center border-t border-[var(--theme-border-light)]">
          <button onClick={loadMore} disabled={isLoadingMore} className="px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 mx-auto">
            {isLoadingMore ? <><div className="w-4 h-4 border-2 border-[var(--theme-text-tertiary)]/30 border-t-[var(--theme-primary)] rounded-full animate-spin" /> Loading...</> : <>Load More <ChevronDown className="w-4 h-4" /></>}
          </button>
        </div>
      )}
      
      <div className="p-3 border-t border-[var(--theme-border-light)] bg-[var(--theme-background-secondary)]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
            <span className="text-[10px] text-[var(--theme-text-tertiary)]">
              Showing {visibleTransactionsLength} of {allSimulationsLength} transactions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};