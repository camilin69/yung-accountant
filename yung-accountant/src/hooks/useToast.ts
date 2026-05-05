// hooks/useToast.ts
import { useState, useCallback } from 'react';

interface ToastState {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({
      isOpen: true,
      message,
      type,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};