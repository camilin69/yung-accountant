// components/modals/SimulationDetailModal.tsx

import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
;
import type { SimulationTransaction } from '../../types';
import { Calendar, FileText, X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h3 className="text-lg font-light text-white">Transaction Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount and Period */}
          <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40">Amount</p>
                <p className="text-xl font-light text-white">{formatCurrency(transaction.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40">Period</p>
                <p className="text-sm font-light text-[#6366F1]">{periodLabels[transaction.period]}</p>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${category?.color}20` }}>
              {category?.icon}
            </div>
            <div>
              <p className="text-[10px] text-white/40">Category</p>
              <p className="text-sm font-light text-white">{category?.name}</p>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <FileText className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-[10px] text-white/40">Description</p>
                <p className="text-sm font-light text-white">{transaction.description}</p>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <Calendar className="w-4 h-4 text-white/40" />
            <div>
              <p className="text-[10px] text-white/40">Date Range</p>
              <p className="text-sm font-light text-white">
                {formatDate(transaction.startDate, 'short')} → {formatDate(transaction.endDate, 'short')}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-white/40">Days</p>
              <p className="text-base font-light text-white">{transaction.days}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/40">Weeks</p>
              <p className="text-base font-light text-white">{transaction.weeks.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/40">Months</p>
              <p className="text-base font-light text-white">{transaction.months.toFixed(2)}</p>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <p className="text-[10px] text-white/40 mb-2">Financial Breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Per day</span>
                <span className="text-white font-light">{formatCurrency(dailyAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Per week</span>
                <span className="text-white font-light">{formatCurrency(weeklyAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Per month (30.44 days)</span>
                <span className="text-white font-light">{formatCurrency(monthlyAmount)}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-white/60">Total for period</span>
                <span className="text-[#6366F1]">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationDetailModal;