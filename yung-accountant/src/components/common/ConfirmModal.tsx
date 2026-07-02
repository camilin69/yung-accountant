// components/common/ConfirmModal.tsx
import { AlertTriangle, Trash2, X } from 'lucide-react';
import React, { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTranslation } from '../../i18n';

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
  isOpen, onClose, onConfirm, title, message,
  confirmText, cancelText, type = 'danger', icon,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, onClose);

  if (!isOpen) return null;

  const styles = {
    danger: { iconBg: 'rgba(239,68,68,0.12)', iconColor: '#EF4444', btnBg: '#EF4444' },
    warning: { iconBg: 'rgba(245,158,11,0.12)', iconColor: 'var(--semantic-warning)', btnBg: 'var(--semantic-warning)' },
    success: { iconBg: 'rgba(16,185,129,0.12)', iconColor: 'var(--semantic-income)', btnBg: 'var(--semantic-income)' },
    info: { iconBg: 'rgba(59,130,246,0.12)', iconColor: '#3B82F6', btnBg: 'var(--theme-primary)' },
  }[type];

  const titleId = 'confirm-modal-title';
  const descId = 'confirm-modal-desc';

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-[2rem] overflow-hidden glass-aero animate-scale-in"
      >
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center" style={{ backgroundColor: styles.iconBg }}>
              {icon || (type === 'danger' ? <Trash2 className="w-5 h-5" style={{ color: styles.iconColor }} /> : <AlertTriangle className="w-5 h-5" style={{ color: styles.iconColor }} />)}
            </div>
            <h3 id={titleId} className="text-lg font-medium" style={{ color: 'var(--theme-text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        <div className="p-5">
          <p id={descId} className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{message}</p>
        </div>

        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
            style={{ color: 'var(--theme-text-tertiary)' }}>{cancelText || t('common.cancel')}</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            style={{ backgroundColor: styles.btnBg, boxShadow: `0 4px 20px -6px ${styles.btnBg}` }}>{confirmText || t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;