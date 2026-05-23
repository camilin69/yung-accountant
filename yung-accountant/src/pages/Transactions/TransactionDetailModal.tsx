// pages/Transactions/TransactionDetailModal.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Calendar, Wallet, Tag, Edit2, Trash2, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onEdit: () => void;
  onDelete: () => void;
  getCategoryById: (id: string) => any;
  getWalletById: (id: string) => any;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
  getCategoryById,
  getWalletById,
}) => {
  if (!isOpen || !transaction) return null;

  const category = getCategoryById(transaction.categoryId);
  const wallet = getWalletById(transaction.walletId);
  const isIncome = category?.type === 'income';
  const isDebtTransaction = transaction.tags?.includes('debt') || transaction.tags?.includes('debt-payment');

  const IconComponent = category ? getIconComponent(category.icon) : null;

  const detailItems = [
    { 
      icon: <Tag className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />, 
      label: 'Category', 
      value: category?.name || 'Unknown' 
    },
    { 
      icon: <Wallet className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />, 
      label: 'Wallet', 
      value: wallet?.name || 'Unknown', 
      sub: wallet?.type?.replace('_', ' ') 
    },
    { 
      icon: <Calendar className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />, 
      label: 'Date', 
      value: formatDate(transaction.date, 'long') 
    },
  ];

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div className="flex items-center gap-3">
              {IconComponent && (
                <div className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center transition-all duration-500 hover:scale-110"
                  style={{ backgroundColor: `${category.color}18` }}>
                  <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                  {category?.name || 'Unknown'}
                </h3>
                <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  Transaction Details
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {!isDebtTransaction && (
              <button onClick={onEdit} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm" title="Edit transaction">
                <Edit2 className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
              </button>
            )}
            <button onClick={onDelete} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm" title="Delete transaction">
              <Trash2 className="w-4 h-4" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
            </button>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          {/* Amount */}
          <div className="text-center py-5">
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-3 glass-sm"
              style={{ backgroundColor: isIncome ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
              <span className="text-[28px] font-light" style={{ color: isIncome ? '#10B981' : '#EF4444' }}>
                {isIncome ? '+' : '-'}
              </span>
            </div>
            <p className="text-[32px] font-light tracking-[-0.03em]" style={{ color: isIncome ? '#10B981' : '#EF4444' }}>
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs font-medium tracking-[0.04em] uppercase mt-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {isIncome ? 'Income' : 'Expense'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-2">
            {detailItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3.5 p-4 rounded-[1.25rem] transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] glass-sm">
                <div className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center glass-sm flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{item.label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</p>
                  {item.sub && (
                    <p className="text-[10px] capitalize mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{item.sub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="p-4 rounded-[1.25rem] glass-sm">
              <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{transaction.description}</p>
            </div>
          )}

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="p-4 rounded-[1.25rem] glass-sm">
              <p className="text-[10px] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: 'var(--theme-text-tertiary)' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {transaction.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-[10px] font-medium px-2.5 py-1 rounded-full glass-sm"
                    style={{ color: 'var(--theme-primary)' }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Debt Warning */}
          {isDebtTransaction && (
            <div className="flex items-start gap-3 p-4 rounded-[1.25rem]" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} strokeWidth={1.5} />
              <p className="text-xs font-medium leading-relaxed" style={{ color: '#F59E0B', opacity: 0.85 }}>
                This is a debt-related transaction. Please manage it from the Debts module.
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            {transaction.createdAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} strokeWidth={1.5} />
                <p className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                  Created: {formatDate(transaction.createdAt, 'long')}
                </p>
              </div>
            )}
            {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} strokeWidth={1.5} />
                <p className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                  Updated: {formatDate(transaction.updatedAt, 'long')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>
              Close
            </button>
            {!isDebtTransaction && (
              <button onClick={onEdit} className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--theme-primary)', boxShadow: 'var(--shadow-button)' }}>
                <Edit2 className="w-4 h-4" strokeWidth={1.5} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;