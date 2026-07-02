// pages/Calendar/DayModal.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Plus, Edit2, Trash2, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { useTranslation } from '../../i18n';
import Tooltip from '../../components/common/Tooltip';

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

  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-2">
      <div className={`w-full ${isVerySmall ? 'max-w-[95%]' : 'max-w-md'} flex flex-col ${isVerySmall ? 'max-h-[90vh]' : 'max-h-[85vh]'} rounded-[2rem] overflow-hidden glass-aero animate-scale-in`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div>
            <h3 className={`${isVerySmall ? 'text-sm' : 'text-base'} font-medium tracking-[0.01em]`} style={{ color: 'var(--theme-text-primary)' }}>
              {formatDate(selectedDate, 'long')}
            </h3>
            <p className={`${isVerySmall ? 'text-[9px]' : 'text-[11px]'} tracking-[0.03em] mt-0.5`} style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('calendar.title')}
            </p>
          </div>
          <Tooltip content={t('common.close')} position="bottom">
            <button onClick={onClose} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <X className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-4">
          <div className="space-y-1">
            {transactions.map(tx => {
              const cat = getCategoryById(tx.categoryId);
              if (!cat) return null;
              const isDebtTransaction = tx.tags && (tx.tags?.includes('debt') || tx.tags?.includes('debt-payment'));
              const IconComponent = getIconComponent(cat.icon);
              
              return (
                <div key={tx.id} className="flex items-center justify-between py-3 px-3 rounded-[1rem] transition-all duration-300 group hover:bg-[var(--theme-background-glass-hover)]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`${isVerySmall ? 'w-8 h-8' : 'w-9 h-9'} rounded-[0.85rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110 flex-shrink-0`}
                      style={{ backgroundColor: `${cat.color}14` }}
                    >
                      <IconComponent className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isVerySmall ? 'text-xs' : 'text-[13px]'} font-medium truncate`} style={{ color: 'var(--theme-text-primary)' }}>{cat.name}</p>
                      <p className={`${isVerySmall ? 'text-[9px]' : 'text-[11px]'} truncate tracking-[0.03em] mt-0.5`} style={{ color: 'var(--theme-text-tertiary)' }}>{tx.description || '-'}</p>
                      {isDebtTransaction && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block glass-sm" style={{ color: 'var(--semantic-warning)' }}>
                          {t('calendar.debtBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <p className={`${isVerySmall ? 'text-xs' : 'text-[13px]'} font-medium`} style={{ color: cat.type === 'income' ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                      {cat.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    {!isDebtTransaction ? (
                      <>
                        <Tooltip content={t('common.edit')} position="bottom">
                          <button
                            onClick={() => onEdit(tx)}
                           
                            className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm"
                          >
                            <Edit2 className={`${isVerySmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: 'var(--theme-text-tertiary)' }} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t('common.delete')} position="bottom">
                          <button
                            onClick={() => onDelete(tx.id)}
                           
                            className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm"
                          >
                            <Trash2 className={`${isVerySmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: '#EF4444', opacity: 0.7 }} />
                          </button>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip content={t('calendar.manageInDebts')} position="bottom">
                        <button
                          onClick={onGoToDebts}
                          className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 glass-sm"
                         
                        >
                          <ArrowRight className={`${isVerySmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: 'var(--semantic-warning)' }} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="text-center py-10">
                <div className={`${isVerySmall ? 'w-12 h-12' : 'w-14 h-14'} mx-auto mb-3 flex items-center justify-center rounded-[1.25rem] glass-sm`}>
                  <CalendarIcon className={`${isVerySmall ? 'w-5 h-5' : 'w-6 h-6'}`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('calendar.noTransactions')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="p-4">
            <button
              onClick={onAddTransaction}
              className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2.5"
              style={{ 
                backgroundColor: 'var(--theme-primary)', 
                color: '#FFFFFF',
                boxShadow: '0 4px 20px -6px var(--theme-primary)'
              }}
            >
              <Plus className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform duration-300 group-hover:rotate-90`} strokeWidth={2.5} />
              {t('transactions.addTransaction')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};