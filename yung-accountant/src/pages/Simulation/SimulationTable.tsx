// pages/Simulation/SimulationTable.tsx
import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Edit2, Trash2, ChevronDown, PieChart } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { periodIcons } from './constants';
import { getIconComponent } from '../../utils/iconHelpers';

interface SimulationTableProps {
  sortedTransactions: any[]; visibleCount: number; hasMore: boolean;
  isLoadingMore: boolean; allSimulationsLength: number;
  visibleTransactionsLength: number; onViewDetails: (transaction: any) => void;
  onEdit: (transaction: any, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  loadMore: () => void; getCategoryById: (id: string) => any;
  isVerySmall: boolean; isMobile: boolean;
}

export const SimulationTable: React.FC<SimulationTableProps> = ({
  sortedTransactions, visibleCount, hasMore, isLoadingMore,
  allSimulationsLength, visibleTransactionsLength, onViewDetails,
  onEdit, onDelete, loadMore, getCategoryById,
}) => {
  const { t } = useTranslation();

  const headerLabels: Record<string, string> = {
    'Created': t('simulation.tableCreated'),
    'Amount': t('common.amount'),
    'Period': t('simulation.period'),
    'Category': t('transactions.category'),
    'Description': t('transactions.description'),
    'Range': t('simulation.tableRange'),
    'Duration': t('simulation.tableDuration'),
    'Total': t('common.total'),
    'Actions': t('simulation.tableActions'),
  };

  if (allSimulationsLength === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
          {t('simulation.emptyTable')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
              {['Created', 'Amount', 'Period', 'Category', 'Description', 'Range', 'Duration', 'Total', 'Actions'].map((header) => (
                <th key={header} className={`text-left p-4 text-[10px] font-medium tracking-[0.08em] uppercase ${header === 'Description' ? 'hidden md:table-cell' : ''} ${header === 'Actions' ? 'text-center' : ''}`}
                  style={{ color: 'var(--theme-text-tertiary)' }}>{headerLabels[header] || header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.slice(0, visibleCount).map((tx: any, idx: number) => {
              const cat = getCategoryById(tx.categoryId);
              const totalAmount = tx.period === 'day' ? tx.amount * tx.days : tx.period === 'week' ? tx.amount * tx.weeks : tx.amount * tx.months;
              const periodLabel = tx.period === 'day' ? t('simulation.perDay') : tx.period === 'week' ? t('simulation.perWeek') : t('simulation.perMonth');
              const isIncome = cat?.type === 'income';
              const IconComponent = cat ? getIconComponent(cat.icon) : null;
              
              return (
                <tr key={tx.id} onClick={() => onViewDetails(tx)} 
                  className="transition-all duration-300 group cursor-pointer hover:bg-[var(--theme-background-glass-hover)]"
                  style={{ borderBottom: idx < Math.min(visibleCount, sortedTransactions.length) - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}>
                  <td className="p-4 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>{formatDateTime(tx.createdAt)}</td>
                  <td className="p-4 text-xs font-medium" style={{ color: isIncome ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                  <td className="p-4 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[0.75rem] flex items-center justify-center glass-sm">{periodIcons[tx.period]}</div>
                      <span>{periodLabel}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[0.75rem] flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${cat?.color}16` }}>
                        {IconComponent && <IconComponent className="w-3.5 h-3.5" style={{ color: cat?.color }} />}
                      </div>
                      <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>{cat?.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-medium hidden md:table-cell" style={{ color: 'var(--theme-text-tertiary)' }}>{tx.description || '-'}</td>
                  <td className="p-4 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>
                    {formatDate(tx.startDate, 'short')} → {formatDate(tx.endDate, 'short')}
                  </td>
                  <td className="p-4 text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{tx.days}d</td>
                  <td className="p-4 text-xs font-medium whitespace-nowrap" style={{ color: isIncome ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                    {isIncome ? '+' : '-'}{formatCurrency(totalAmount)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => onEdit(tx, e)} className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm">
                        <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                      </button>
                      <button onClick={(e) => onDelete(tx.id, e)} className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
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
        <div className="p-4 text-center" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <button onClick={loadMore} disabled={isLoadingMore} 
            className="px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto glass-sm"
            style={{ color: 'var(--theme-text-tertiary)' }}>
            {isLoadingMore ? (
              <><div className="w-4 h-4 border-2 border-[var(--theme-text-tertiary)]/20 border-t-[var(--theme-primary)] rounded-full animate-spin" /> {t('common.loading')}</>
            ) : (
              <>{t('common.loadMore')} <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
      
      <div className="p-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('simulation.showingTransactions', { visible: visibleTransactionsLength, total: allSimulationsLength })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};