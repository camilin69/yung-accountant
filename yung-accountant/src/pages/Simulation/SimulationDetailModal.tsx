// components/modals/SimulationDetailModal.tsx
import React from 'react';
import { useTranslation } from '../../i18n';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { SimulationTransaction } from '../../types';
import { Calendar, FileText, X, TrendingUp, DollarSign, CalendarDays, ArrowLeft } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';

interface SimulationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: SimulationTransaction | null;
  category: any;
}

const SimulationDetailModal: React.FC<SimulationDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  category,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !transaction) return null;

  let totalAmount: number;
  if (transaction.period === 'day') totalAmount = transaction.amount * transaction.days;
  else if (transaction.period === 'week') totalAmount = transaction.amount * transaction.weeks;
  else totalAmount = transaction.amount * transaction.months;

  const dailyAmount = totalAmount / transaction.days;
  const weeklyAmount = totalAmount / transaction.weeks;
  const monthlyAmount = totalAmount / transaction.months;

  const periodLabels = { day: 'Daily', week: 'Weekly', month: 'Monthly' };
  const periodIcons = {
    day: <Calendar className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />,
    week: <CalendarDays className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />,
    month: <Calendar className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />,
  };

  const CategoryIcon = category ? getIconComponent(category.icon) : null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>Simulation Details</h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {periodLabels[transaction.period]} recurring transaction
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Amount and Period */}
            <div className="rounded-[1.25rem] p-5 glass-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Amount per {transaction.period}</p>
                  <p className="text-[28px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="text-right">
                  <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center glass-sm">
                    {periodIcons[transaction.period]}
                  </div>
                  <p className="text-[10px] font-medium mt-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{periodLabels[transaction.period]}</p>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3.5 p-4 rounded-[1.25rem] glass-sm">
              <div className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 hover:scale-110"
                style={{ backgroundColor: `${category?.color}18` }}>
                {CategoryIcon && <CategoryIcon className="w-5 h-5" style={{ color: category?.color }} />}
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{t('transactions.category')}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{category?.name || 'Unknown'}</p>
              </div>
            </div>

            {/* Description */}
            {transaction.description && (
              <div className="flex items-center gap-3.5 p-4 rounded-[1.25rem] glass-sm">
                <div className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center glass-sm">
                  <FileText className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{t('transactions.description')}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{transaction.description}</p>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-3.5 p-4 rounded-[1.25rem] glass-sm">
              <div className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center glass-sm">
                <Calendar className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Date Range</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>
                  {formatDate(transaction.startDate, 'short')} → {formatDate(transaction.endDate, 'short')}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-[1.25rem] glass-sm">
              {[
                { label: t('simulation.days'), value: transaction.days },
                { label: t('simulation.weeks'), value: transaction.weeks.toFixed(2) },
                { label: t('simulation.months'), value: transaction.months.toFixed(2) },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{item.label}</p>
                  <p className="text-lg font-light tracking-[-0.02em] mt-1" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="p-5 rounded-[1.25rem] glass-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Financial Breakdown</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Per day', value: dailyAmount },
                  { label: 'Per week', value: weeklyAmount },
                  { label: 'Per month (30.44 days)', value: monthlyAmount },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                      <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{item.label}</span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
                <div className="h-px" style={{ backgroundColor: 'var(--theme-border-dark)' }} />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Total for period</span>
                  <span className="text-lg font-light tracking-[-0.02em]" style={{ color: 'var(--theme-primary)' }}>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationDetailModal;