// pages/Calendar/DayModal.tsx

import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Plus, Edit2, Trash2, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';

interface DayModalProps {
  isOpen: boolean;
  selectedDate: string | null;
  transactions: any[];
  isVerySmall: boolean;
  isMobile: boolean;
  onClose: () => void;
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
  onAddTransaction: () => void;
  onGoToDebts: () => void;
  getCategoryById: (id: string) => any;
}

export const DayModal: React.FC<DayModalProps> = ({
  isOpen,
  selectedDate,
  transactions,
  isVerySmall,
  onClose,
  onEdit,
  onDelete,
  onAddTransaction,
  onGoToDebts,
  getCategoryById,
}) => {
  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className={`bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full ${isVerySmall ? 'max-w-[95%]' : 'max-w-md'} flex flex-col ${isVerySmall ? 'max-h-[90vh]' : 'max-h-[85vh]'}`}>
        <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-3 border-b border-white/10">
            <div>
              <h3 className={`${isVerySmall ? 'text-sm' : 'text-base'} font-light text-white`}>{formatDate(selectedDate, 'long')}</h3>
              <p className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Daily transactions</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {transactions.map(t => {
              const cat = getCategoryById(t.categoryId);
              if (!cat) return null;
              const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
              const IconComponent = getIconComponent(cat.icon);
              
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`${isVerySmall ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110 flex-shrink-0`}
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <IconComponent className={`${isVerySmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isVerySmall ? 'text-xs' : 'text-sm'} font-light text-white truncate`}>{cat.name}</p>
                      <p className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40 truncate`}>{t.description || '-'}</p>
                      {isDebtTransaction && (
                        <span className="text-[7px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80 mt-0.5 inline-block">
                          Debt
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <p className={`${isVerySmall ? 'text-xs' : 'text-sm'} font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    {!isDebtTransaction ? (
                      <>
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-500" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={onGoToDebts}
                        className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Manage in Debts module"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 hover:text-amber-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="text-center py-6">
                <div className={`${isVerySmall ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-2 bg-white/[0.03] flex items-center justify-center rounded-lg`}>
                  <CalendarIcon className={`${isVerySmall ? 'w-4 h-4' : 'w-5 h-5'} text-white/20`} />
                </div>
                <p className="text-white/40 text-xs font-light">No transactions for this day</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onAddTransaction}
              className="w-full py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center justify-center gap-2 group rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};