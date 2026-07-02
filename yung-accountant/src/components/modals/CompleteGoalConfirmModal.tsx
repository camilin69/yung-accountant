// components/modals/CompleteGoalConfirmModal.tsx
import React from 'react';
import { X, Trophy, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CompleteGoalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  goalName: string;
}

const CompleteGoalConfirmModal: React.FC<CompleteGoalConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  goalName,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-lg font-light text-[var(--theme-text-primary)]">{t('goals.completeGoal')}</h3>
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
            Are you sure you want to complete <span className="text-[var(--theme-text-primary)] font-medium">"{goalName}"</span>?
          </p>
          
          {/* Consequences List */}
          <div className="space-y-2 text-xs text-[var(--theme-text-tertiary)]">
            <p>• You will not be able to add or remove funds</p>
            <p>• You will not be able to edit this goal</p>
            <p>• The goal will be moved to completed section</p>
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
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-orange-700 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            {t('goals.completeGoal')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteGoalConfirmModal;