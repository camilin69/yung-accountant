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
  isOpen, onClose, onConfirm, title, message,
  confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger', icon,
}) => {
  if (!isOpen) return null;

  const styles = {
    danger: { iconBg: 'rgba(239,68,68,0.12)', iconColor: '#EF4444', btnBg: '#EF4444' },
    warning: { iconBg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B', btnBg: '#F59E0B' },
    success: { iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10B981', btnBg: '#10B981' },
    info: { iconBg: 'rgba(59,130,246,0.12)', iconColor: '#3B82F6', btnBg: 'var(--theme-primary)' },
  }[type];

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-4">
      <div className="w-full max-w-md rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center" style={{ backgroundColor: styles.iconBg }}>
              {icon || (type === 'danger' ? <Trash2 className="w-5 h-5" style={{ color: styles.iconColor }} /> : <AlertTriangle className="w-5 h-5" style={{ color: styles.iconColor }} />)}
            </div>
            <h3 className="text-lg font-medium" style={{ color: 'var(--theme-text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{message}</p>
        </div>

        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
            style={{ color: 'var(--theme-text-tertiary)' }}>{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            style={{ backgroundColor: styles.btnBg, boxShadow: `0 4px 20px -6px ${styles.btnBg}` }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;