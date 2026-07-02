// components/modals/CompleteDebtConfirmModal.tsx
import React from 'react';
import { X, Trophy, AlertTriangle, CheckCircle, Edit2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

interface CompleteDebtConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  debtName: string;
  remainingAmount: number;
  type: 'borrowed' | 'lent';
  isFromEdit?: boolean;
}

const CompleteDebtConfirmModal: React.FC<CompleteDebtConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  debtName,
  remainingAmount,
  type,
  isFromEdit = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const isBorrowed = type === 'borrowed';
  const actionText = isBorrowed ? 'pay off' : 'receive payment for';
  
  const title = isFromEdit ? 'Complete Debt via Edit' : 'Complete Debt';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${isFromEdit ? 'bg-blue-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
              {isFromEdit ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Trophy className="w-5 h-5 text-green-500" />}
            </div>
            <h3 className="text-lg font-light text-[var(--theme-text-primary)]">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
            <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Warning Box */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-500/80 font-light">
              This action is IRREVERSIBLE
            </p>
          </div>
          
          {/* Message */}
          <p className="text-[var(--theme-text-secondary)] text-sm font-light leading-relaxed mb-4">
            Are you sure you want to <span className="text-[var(--theme-text-primary)] font-medium">{actionText}</span> <span className="text-[var(--theme-text-primary)] font-medium">"{debtName}"</span>?
          </p>
          
          {/* Amount Box */}
          <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)] mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--theme-text-tertiary)]">{isFromEdit ? 'New Amount' : 'Remaining Amount'}</span>
              <span className="text-green-600 font-light">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
          
          {/* Consequences List */}
          <div className="space-y-2 text-xs text-[var(--theme-text-tertiary)]">
            <p>• This will mark the debt as <span className="text-green-600">COMPLETED</span></p>
            {!isFromEdit && <p>• A payment transaction will be created</p>}
            {!isFromEdit && <p>• Your wallet balance will be updated</p>}
            {isFromEdit && <p>• The debt will be marked as paid</p>}
            {isFromEdit && <p>• No new payment transaction will be created</p>}
            <p className="text-yellow-500/60">• This action cannot be undone</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
              isFromEdit 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                : 'bg-gradient-to-r from-green-600 to-emerald-700'
            }`}
          >
            {isFromEdit ? <Edit2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {isFromEdit ? 'Complete & Update' : 'Complete Debt'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteDebtConfirmModal;