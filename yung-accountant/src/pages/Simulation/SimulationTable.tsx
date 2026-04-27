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
      <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="text-center py-8 text-white/40 text-sm font-light">
          No simulated transactions yet. Click "Simulate" to add one.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-[#1A1A2E] border-b border-white/10">
            <tr>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Created</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Amount</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Period</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Category</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40 hidden md:table-cell">Description</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Range</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Duration</th>
              <th className="text-left p-3 text-[10px] font-light text-white/40">Total</th>
              <th className="text-center p-3 text-[10px] font-light text-white/40">Actions</th>
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
                <tr key={tx.id} onClick={() => onViewDetails(tx)} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                  <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-500' : 'text-red-500'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                  <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">
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
                      <span className="text-xs font-light text-white/80 whitespace-nowrap">{cat?.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs font-light text-white/40 hidden md:table-cell">{tx.description || '-'}</td>
                  <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">
                    {formatDate(tx.startDate, 'short')} → {formatDate(tx.endDate, 'short')}
                  </td>
                  <td className="p-3 text-xs font-light text-white/60">{tx.days}d</td>
                  <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-500' : 'text-red-500'} whitespace-nowrap`}>
                    {isIncome ? '+' : '-'}{formatCurrency(totalAmount)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => onEdit(tx, e)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => onDelete(tx.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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
        <div className="p-4 text-center border-t border-white/10">
          <button onClick={loadMore} disabled={isLoadingMore} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 mx-auto">
            {isLoadingMore ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading...</> : <>Load More <ChevronDown className="w-4 h-4" /></>}
          </button>
        </div>
      )}
      
      <div className="p-3 border-t border-white/10 bg-[#1A1A2E]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-3 h-3 text-white/30" />
            <span className="text-[10px] text-white/30">
              Showing {visibleTransactionsLength} of {allSimulationsLength} transactions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};