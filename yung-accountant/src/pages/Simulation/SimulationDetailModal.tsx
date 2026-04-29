// components/modals/SimulationDetailModal.tsx
import React from 'react';
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
  if (!isOpen || !transaction) return null;

  let totalAmount: number;
  
  if (transaction.period === 'day') {
    totalAmount = transaction.amount * transaction.days;
  } else if (transaction.period === 'week') {
    totalAmount = transaction.amount * transaction.weeks;
  } else {
    totalAmount = transaction.amount * transaction.months;
  }

  const dailyAmount = totalAmount / transaction.days;
  const weeklyAmount = totalAmount / transaction.weeks;
  const monthlyAmount = totalAmount / transaction.months;

  const periodLabels = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
  };

  const periodIcons = {
    day: <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />,
    week: <CalendarDays className="w-5 h-5 text-[var(--theme-primary)]" />,
    month: <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />,
  };

  const CategoryIcon = category ? getIconComponent(category.icon) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">Simulation Details</h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                  {periodLabels[transaction.period]} recurring transaction
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Amount and Period */}
            <div className="bg-[var(--theme-background-glass)] rounded-lg p-4 border border-[var(--theme-border-dark)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)] font-light mb-1">Amount per {transaction.period}</p>
                  <p className="text-2xl font-light text-[var(--theme-text-primary)]">{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="text-right">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)]">
                    {periodIcons[transaction.period]}
                  </div>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)] font-light mt-1">{periodLabels[transaction.period]}</p>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category?.color}20` }}
              >
                {CategoryIcon && <CategoryIcon className="w-5 h-5" style={{ color: category?.color }} />}
              </div>
              <div>
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Category</p>
                <p className="text-sm font-light text-[var(--theme-text-primary)]">{category?.name || 'Unknown'}</p>
              </div>
            </div>

            {/* Description */}
            {transaction.description && (
              <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--theme-background-glass)]">
                  <FileText className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                </div>
                <div>
                  <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Description</p>
                  <p className="text-sm font-light text-[var(--theme-text-primary)]">{transaction.description}</p>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--theme-background-glass)]">
                <Calendar className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              </div>
              <div>
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Date Range</p>
                <p className="text-sm font-light text-[var(--theme-text-primary)]">
                  {formatDate(transaction.startDate, 'short')} → {formatDate(transaction.endDate, 'short')}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div className="text-center">
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Days</p>
                <p className="text-base font-light text-[var(--theme-text-primary)]">{transaction.days}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Weeks</p>
                <p className="text-base font-light text-[var(--theme-text-primary)]">{transaction.weeks.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Months</p>
                <p className="text-base font-light text-[var(--theme-text-primary)]">{transaction.months.toFixed(2)}</p>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light uppercase tracking-wider">Financial Breakdown</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
                    <span className="text-[var(--theme-text-tertiary)] font-light">Per day</span>
                  </div>
                  <span className="text-[var(--theme-text-primary)] font-light">{formatCurrency(dailyAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
                    <span className="text-[var(--theme-text-tertiary)] font-light">Per week</span>
                  </div>
                  <span className="text-[var(--theme-text-primary)] font-light">{formatCurrency(weeklyAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
                    <span className="text-[var(--theme-text-tertiary)] font-light">Per month (30.44 days)</span>
                  </div>
                  <span className="text-[var(--theme-text-primary)] font-light">{formatCurrency(monthlyAmount)}</span>
                </div>
                <div className="h-px bg-[var(--theme-border-dark)] my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--theme-text-secondary)] font-light">Total for period</span>
                  <span className="text-base font-light text-[var(--theme-primary)]">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationDetailModal;