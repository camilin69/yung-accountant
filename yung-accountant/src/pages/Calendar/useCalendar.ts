// pages/Calendar/useCalendar.ts

import { useState, useEffect } from 'react';
import { useTransactionStore, useCategoryStore } from '../../store';

export const useCalendar = () => {
  const { transactions, deleteTransaction, setTransactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsVerySmall(width < 480);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getDayTransactions = (date: string) => transactions.filter(t => t.date === date);

  const getMonthIncome = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'income' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthExpenses = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'expense' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const currentBalance = getMonthIncome() - getMonthExpenses();

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDayModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    const isDebtTransaction = transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'));
    
    if (isDebtTransaction) {
      setToastMessage('Debt transactions cannot be edited. Please manage them from the Debts module.');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    setEditingTransaction(transaction);
    setShowDayModal(false);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction && transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'))) {
      setToastMessage('Debt transactions must be managed from the Debts module');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    deleteTransaction(id);
    setToastMessage('Transaction deleted successfully');
    setToastType('success');
    setShowToast(true);
  };

  const handleResetAllTransactions = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setTransactions([]);
    setToastMessage('All transactions have been reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const selectedDateTransactions = selectedDate
    ? transactions.filter(t => t.date === selectedDate)
    : [];

  const getCardPadding = () => {
    if (isVerySmall) return 'p-2';
    if (isMobile) return 'p-2.5';
    return 'p-3';
  };

  const getHeaderPadding = () => {
    if (isVerySmall) return 'p-3 pb-2 pt-3';
    if (isMobile) return 'p-4 pb-2 pt-4';
    return 'p-6 pb-3 pt-5';
  };

  return {
    transactions,
    categories,
    // Estados
    currentDate,
    setCurrentDate,
    showTransactionModal,
    setShowTransactionModal,
    showDayModal,
    setShowDayModal,
    showResetConfirm,
    setShowResetConfirm,
    editingTransaction,
    setEditingTransaction,
    selectedDate,
    setSelectedDate,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    isMobile,
    isVerySmall,
    selectedDateTransactions,
    
    // Funciones
    getCategoryById,
    getDayTransactions,
    getMonthIncome,
    getMonthExpenses,
    currentBalance,
    handleDayClick,
    handleEditTransaction,
    handleDeleteTransaction,
    handleResetAllTransactions,
    confirmReset,
    getCardPadding,
    getHeaderPadding,
  };
};