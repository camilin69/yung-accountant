// pages/Transactions/TransactionDetailModal.tsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Calendar, Wallet, Tag, Edit2, Trash2, ArrowLeft } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div className="flex items-center gap-3">
                {IconComponent && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                    {category?.name || 'Unknown'}
                  </h3>
                  <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                    Transaction Details
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isDebtTransaction && (
                <button
                  onClick={onEdit}
                  className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onDelete}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-[var(--theme-text-tertiary)] hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          {/* Amount */}
          <div className="text-center py-4">
            <p className={`text-3xl font-light ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-1 font-light">
              {isIncome ? 'Income' : 'Expense'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Category */}
            <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <Tag className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              <div>
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Category</p>
                <p className="text-sm font-light text-[var(--theme-text-primary)]">{category?.name || 'Unknown'}</p>
              </div>
            </div>

            {/* Wallet */}
            <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <Wallet className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              <div>
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Wallet</p>
                <p className="text-sm font-light text-[var(--theme-text-primary)]">{wallet?.name || 'Unknown'}</p>
                {wallet?.type && (
                  <p className="text-[9px] text-[var(--theme-text-tertiary)]/70 font-light capitalize">{wallet.type.replace('_', ' ')}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <Calendar className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              <div>
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Date</p>
                <p className="text-sm font-light text-[var(--theme-text-primary)]">{formatDate(transaction.date, 'long')}</p>
              </div>
            </div>

            {/* Description */}
            {transaction.description && (
              <div className="flex items-start gap-3 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
                <div className="w-4 h-4 mt-0.5 flex-shrink-0">📝</div>
                <div>
                  <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Description</p>
                  <p className="text-sm font-light text-[var(--theme-text-primary)]">{transaction.description}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {transaction.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]/80 font-light"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Debt Warning */}
            {isDebtTransaction && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-500/80 font-light">
                  ⚠️ This is a debt-related transaction. Please manage it from the Debts module.
                </p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t border-[var(--theme-border-light)] pt-3 space-y-1">
            {transaction.createdAt && (
              <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">
                Created: {formatDate(transaction.createdAt, 'long')}
              </p>
            )}
            {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
              <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">
                Updated: {formatDate(transaction.updatedAt, 'long')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
            >
              Close
            </button>
            {!isDebtTransaction && (
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;