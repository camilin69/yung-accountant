// components/common/ToastNotification.tsx
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  isOpen,
  onClose,
  message,
  type = 'success',
  duration = 3000,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.10)',
          border: 'rgba(16, 185, 129, 0.25)',
          icon: <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />,
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.10)',
          border: 'rgba(239, 68, 68, 0.25)',
          icon: <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />,
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.10)',
          border: 'rgba(245, 158, 11, 0.25)',
          icon: <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />,
        };
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.10)',
          border: 'rgba(59, 130, 246, 0.25)',
          icon: <Info className="w-5 h-5" style={{ color: '#3B82F6' }} />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-in-right">
      <div 
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl glass-aero animate-scale-in"
        style={{ 
          backgroundColor: styles.bg, 
          border: `1px solid ${styles.border}`,
          boxShadow: 'var(--shadow-glass-lg)'
        }}
      >
        {styles.icon}
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{message}</p>
        <button 
          onClick={onClose} 
          className="ml-2 p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
        >
          <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;