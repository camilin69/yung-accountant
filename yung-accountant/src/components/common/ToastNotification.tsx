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
          bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
          border: 'border-green-500/30',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
          border: 'border-red-500/30',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
          border: 'border-yellow-500/30',
          icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-[#6366F1]/20 to-[#EC4899]/20',
          border: 'border-[#6366F1]/30',
          icon: <Info className="w-5 h-5 text-[#6366F1]" />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${styles.bg} backdrop-blur-xl border ${styles.border} shadow-2xl`}>
        {styles.icon}
        <p className="text-white/80 text-sm font-light">{message}</p>
        <button onClick={onClose} className="ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;