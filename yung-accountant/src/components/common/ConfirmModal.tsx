// components/common/ConfirmModal.tsx
import { AlertTriangle, Trash2, X } from 'lucide-react';
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon,
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-500',
          buttonBg: 'bg-gradient-to-r from-red-500 to-rose-600',
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-500',
          buttonBg: 'bg-gradient-to-r from-yellow-500 to-orange-600',
        };
      case 'success':
        return {
          iconBg: 'bg-green-500/20',
          iconColor: 'text-green-500',
          buttonBg: 'bg-gradient-to-r from-green-500 to-emerald-600',
        };
      default:
        return {
          iconBg: 'bg-[var(--theme-primary)]/20',
          iconColor: 'text-[var(--theme-primary)]',
          buttonBg: 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              {icon || (type === 'danger' ? <Trash2 className={`w-5 h-5 ${styles.iconColor}`} /> : <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />)}
            </div>
            <h3 className="text-lg font-light text-[var(--theme-text-primary)]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-[var(--theme-text-secondary)] text-sm font-light leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 ${styles.buttonBg} rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;