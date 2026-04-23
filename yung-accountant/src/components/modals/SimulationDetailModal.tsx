// components/modals/SimulationDetailModal.tsx

import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { SimulationTransaction } from '../../types';
import { Calendar, FileText, X, TrendingUp, DollarSign, CalendarDays } from 'lucide-react';
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

  // 1. Calcular el TOTAL según el período
  let totalAmount: number;
  
  if (transaction.period === 'day') {
    totalAmount = transaction.amount * transaction.days;
  } else if (transaction.period === 'week') {
    totalAmount = transaction.amount * transaction.weeks;
  } else { // month
    totalAmount = transaction.amount * transaction.months;
  }

  // 2. Derivar los demás valores a partir del TOTAL
  const dailyAmount = totalAmount / transaction.days;
  const weeklyAmount = totalAmount / transaction.weeks;
  const monthlyAmount = totalAmount / transaction.months;

  const periodLabels = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
  };

  const periodIcons = {
    day: <Calendar className="w-5 h-5 text-blue-400" />,
    week: <CalendarDays className="w-5 h-5 text-yellow-400" />,
    month: <Calendar className="w-5 h-5 text-purple-400" />,
  };

  const CategoryIcon = category ? getIconComponent(category.icon) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <div>
              <h3 className="text-lg font-light text-white">Simulation Details</h3>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                {periodLabels[transaction.period]} recurring transaction
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Amount and Period */}
            <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/40 font-light mb-1">Amount per {transaction.period}</p>
                  <p className="text-2xl font-light text-white">{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="text-right">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/10">
                    {periodIcons[transaction.period]}
                  </div>
                  <p className="text-[10px] text-white/40 font-light mt-1">{periodLabels[transaction.period]}</p>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category?.color}20` }}
              >
                {CategoryIcon && <CategoryIcon className="w-5 h-5" style={{ color: category?.color }} />}
              </div>
              <div>
                <p className="text-[9px] text-white/40 font-light">Category</p>
                <p className="text-sm font-light text-white">{category?.name || 'Unknown'}</p>
              </div>
            </div>

            {/* Description */}
            {transaction.description && (
              <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03]">
                  <FileText className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <p className="text-[9px] text-white/40 font-light">Description</p>
                  <p className="text-sm font-light text-white">{transaction.description}</p>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03]">
                <Calendar className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-[9px] text-white/40 font-light">Date Range</p>
                <p className="text-sm font-light text-white">
                  {formatDate(transaction.startDate, 'short')} → {formatDate(transaction.endDate, 'short')}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-light">Days</p>
                <p className="text-base font-light text-white">{transaction.days}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-light">Weeks</p>
                <p className="text-base font-light text-white">{transaction.weeks.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-light">Months</p>
                <p className="text-base font-light text-white">{transaction.months.toFixed(2)}</p>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
                <p className="text-[9px] text-white/40 font-light uppercase tracking-wider">Financial Breakdown</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-white/30" />
                    <span className="text-white/40 font-light">Per day</span>
                  </div>
                  <span className="text-white font-light">{formatCurrency(dailyAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-white/30" />
                    <span className="text-white/40 font-light">Per week</span>
                  </div>
                  <span className="text-white font-light">{formatCurrency(weeklyAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-white/30" />
                    <span className="text-white/40 font-light">Per month (30.44 days)</span>
                  </div>
                  <span className="text-white font-light">{formatCurrency(monthlyAmount)}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 font-light">Total for period</span>
                  <span className="text-base font-light text-[#6366F1]">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0">
          <div className="flex gap-3 p-5 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
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