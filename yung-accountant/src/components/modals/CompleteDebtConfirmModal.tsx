// components/modals/CompleteDebtConfirmModal.tsx

import React from 'react';
import { X, Trophy, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CompleteDebtConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  debtName: string;
  remainingAmount: number;
  type: 'borrowed' | 'lent';
}

const CompleteDebtConfirmModal: React.FC<CompleteDebtConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  debtName,
  remainingAmount,
  type,
}) => {
  if (!isOpen) return null;

  const isBorrowed = type === 'borrowed';
  const actionText = isBorrowed ? 'pay off' : 'receive payment for';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-lg font-light text-white">Complete Debt</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-500/80 font-light">
              This action is IRREVERSIBLE
            </p>
          </div>
          
          <p className="text-white/60 text-sm font-light leading-relaxed mb-4">
            Are you sure you want to <span className="text-white font-medium">{actionText}</span> <span className="text-white font-medium">"{debtName}"</span>?
          </p>
          
          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Remaining Amount</span>
              <span className="text-green-500 font-light">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
          
          <div className="space-y-2 text-xs text-white/40">
            <p>• This will mark the debt as <span className="text-green-500">COMPLETED</span></p>
            <p>• A payment transaction will be created</p>
            <p>• Your wallet balance will be updated</p>
            <p className="text-yellow-500/60">• This action cannot be undone</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Complete Debt
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteDebtConfirmModal;