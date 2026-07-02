// pages/Simulation/useSimulation.ts

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSimulationStore, useCategoryStore } from '../../store';
import { toLocalDateString } from '../../utils/formatters';
import type { SortBy } from './constants';

export const useSimulation = () => {
  const { 
    simulations,
    isLoading: simLoading,
    fetchSimulations,
    addSimulation, 
    updateSimulation, 
    deleteSimulation 
  } = useSimulationStore();
  const { categories, isLoading: catLoading, fetchAllCategories } = useCategoryStore();
  

  const simFetchedRef = useRef(false);
  const catFetchedRef = useRef(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [formData, setFormData] = useState({
    amount: 0,
    period: 'day' as 'day' | 'week' | 'month',
    categoryId: '',
    description: '',
    startDate: '',
    endDate: '',
    days: 0,
    weeks: 0,
    months: 0,
  });
  
  const [errors, setErrors] = useState({
    amount: '',
    categoryId: '',
    startDate: '',
    endDate: '',
  });

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

  useEffect(() => {
    if (!simFetchedRef.current && simulations.length === 0 && !simLoading) {
      simFetchedRef.current = true;
      fetchSimulations();
    }
    if (!catFetchedRef.current && categories.length === 0 && !catLoading) {
      catFetchedRef.current = true;
      fetchAllCategories();
    }
  }, []);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const calculateWeeksFromDays = (days: number): number => days / 7;
  const calculateMonthsFromDays = (days: number): number => days / 30.44;
  const calculateDaysFromWeeks = (weeks: number): number => weeks * 7;
  const calculateDaysFromMonths = (months: number): number => months * 30.44;

  const updateEndDateFromDays = (start: string, days: number): string => {
    if (!start || days <= 0) return '';
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days - 1);
    return toLocalDateString(endDate);
  };

  const parseDecimal = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const roundToTwo = (num: number): number => Math.round(num * 100) / 100;

  const calculateTotalAmount = (transaction: any): number => {
    if (transaction.period === 'day') return transaction.amount * transaction.days;
    if (transaction.period === 'week') return transaction.amount * transaction.weeks;
    return transaction.amount * transaction.months;
  };

  const globalStats = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalMonthlyIncome = 0;
    let totalMonthlyExpenses = 0;
    let totalDailyIncome = 0;
    let totalDailyExpenses = 0;

    simulations.forEach(t => {
      const total = calculateTotalAmount(t);
      const category = getCategoryById(t.categoryId);
      const dailyAmount = total / t.days;
      const monthlyAmount = total / t.months;

      if (category?.type === 'income') {
        totalIncome += total;
        totalMonthlyIncome += monthlyAmount;
        totalDailyIncome += dailyAmount;
      } else {
        totalExpenses += total;
        totalMonthlyExpenses += monthlyAmount;
        totalDailyExpenses += dailyAmount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      monthlyIncome: totalMonthlyIncome,
      monthlyExpenses: totalMonthlyExpenses,
      monthlyNet: totalMonthlyIncome - totalMonthlyExpenses,
      dailyIncome: totalDailyIncome,
      dailyExpenses: totalDailyExpenses,
      dailyNet: totalDailyIncome - totalDailyExpenses,
    };
  };

  const stats = globalStats();

  const updateFromDays = useCallback((days: number, startDate: string) => {
    if (!startDate || days <= 0) return;
    const weeks = calculateWeeksFromDays(days);
    const months = calculateMonthsFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    setFormData(prev => ({ ...prev, days, weeks: roundToTwo(weeks), months: roundToTwo(months), endDate }));
  }, []);

  const updateFromWeeks = useCallback((weeks: number, startDate: string) => {
    if (!startDate || weeks <= 0) return;
    const days = Math.round(calculateDaysFromWeeks(weeks));
    const months = calculateMonthsFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    setFormData(prev => ({ ...prev, days, weeks: roundToTwo(weeks), months: roundToTwo(months), endDate }));
  }, []);

  const updateFromMonths = useCallback((months: number, startDate: string) => {
    if (!startDate || months <= 0) return;
    const days = Math.round(calculateDaysFromMonths(months));
    const weeks = calculateWeeksFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    setFormData(prev => ({ ...prev, days, weeks: roundToTwo(weeks), months: roundToTwo(months), endDate }));
  }, []);

  const updateFromDates = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return;
    const days = calculateDays(startDate, endDate);
    const weeks = calculateWeeksFromDays(days);
    const months = calculateMonthsFromDays(days);
    setFormData(prev => ({ ...prev, days, weeks: roundToTwo(weeks), months: roundToTwo(months) }));
  }, []);

  const handleAmountChange = (value: number) => {
    setFormData(prev => ({ ...prev, amount: value }));
    if (value <= 0) {
      setErrors(prev => ({ ...prev, amount: 'Amount must be greater than 0' }));
    } else {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    setFormData(prev => ({ ...prev, period }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, categoryId: value }));
    if (!value) {
      setErrors(prev => ({ ...prev, categoryId: 'Category is required' }));
    } else {
      setErrors(prev => ({ ...prev, categoryId: '' }));
    }
  };

  const handleStartDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, startDate: value, endDate: '' }));
    if (!value) {
      setErrors(prev => ({ ...prev, startDate: 'Start date is required' }));
      return;
    }
    setErrors(prev => ({ ...prev, startDate: '' }));
  };

  const handleEndDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, endDate: value }));
    if (!value) {
      setErrors(prev => ({ ...prev, endDate: 'End date is required' }));
      return;
    }
    if (formData.startDate && value < formData.startDate) {
      setErrors(prev => ({ ...prev, endDate: 'End date cannot be before start date' }));
      return;
    }
    setErrors(prev => ({ ...prev, endDate: '' }));
    if (formData.startDate && value) {
      updateFromDates(formData.startDate, value);
    }
  };

  const handleDaysChange = (value: number) => {
    if (!formData.startDate) {
      setFormData(prev => ({ ...prev, days: value }));
      return;
    }
    if (value > 0) {
      updateFromDays(value, formData.startDate);
    } else {
      setFormData(prev => ({ ...prev, days: 0, weeks: 0, months: 0, endDate: '' }));
    }
  };

  const handleWeeksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      setFormData(prev => ({ ...prev, weeks: 0 }));
      return;
    }
    const weeks = parseDecimal(rawValue);
    if (!formData.startDate) {
      setFormData(prev => ({ ...prev, weeks }));
      return;
    }
    if (weeks > 0) {
      updateFromWeeks(weeks, formData.startDate);
    }
  };

  const handleMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      setFormData(prev => ({ ...prev, months: 0 }));
      return;
    }
    const months = parseDecimal(rawValue);
    if (!formData.startDate) {
      setFormData(prev => ({ ...prev, months }));
      return;
    }
    if (months > 0) {
      updateFromMonths(months, formData.startDate);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    if (formData.amount <= 0) {
      setErrors(prev => ({ ...prev, amount: 'Amount must be greater than 0' }));
      isValid = false;
    }
    if (!formData.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: 'Category is required' }));
      isValid = false;
    }
    if (!formData.startDate) {
      setErrors(prev => ({ ...prev, startDate: 'Start date is required' }));
      isValid = false;
    }
    if (!formData.endDate) {
      setErrors(prev => ({ ...prev, endDate: 'End date is required' }));
      isValid = false;
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      setErrors(prev => ({ ...prev, endDate: 'End date cannot be before start date' }));
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setToastMessage('Please fill in all required fields correctly');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const transactionData = {
      amount: formData.amount,
      period: formData.period,
      categoryId: formData.categoryId,
      description: formData.description,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: formData.days,
      weeks: formData.weeks,
      months: formData.months,
    };

    try {
      if (editingTransaction) {
        await updateSimulation(editingTransaction.id, transactionData);
        setToastMessage('Transaction updated successfully');
      } else {
        await addSimulation(transactionData);
        setToastMessage('Transaction added successfully');
      }
      setToastType('success');
      setShowToast(true);
      resetForm();
      setShowModal(false);
    } catch (error) {
      setToastMessage('Error saving simulation');
      setToastType('error');
      setShowToast(true);
    }
  };


  const resetForm = () => {
    setFormData({
      amount: 0,
      period: 'day',
      categoryId: '',
      description: '',
      startDate: '',
      endDate: '',
      days: 0,
      weeks: 0,
      months: 0,
    });
    setErrors({ amount: '', categoryId: '', startDate: '', endDate: '' });
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTransaction(transaction);
    const days = transaction.days || calculateDays(transaction.startDate, transaction.endDate);
    const weeks = transaction.weeks || roundToTwo(calculateWeeksFromDays(days));
    const months = transaction.months || roundToTwo(calculateMonthsFromDays(days));
    setFormData({
      amount: transaction.amount,
      period: transaction.period,
      categoryId: transaction.categoryId,
      description: transaction.description,
      startDate: transaction.startDate,
      endDate: transaction.endDate,
      days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await deleteSimulation(transactionToDelete);
      setToastMessage('Transaction deleted successfully');
      setToastType('success');
      setShowToast(true);
      setTransactionToDelete(null);
    }
  };

  const handleReset = () => setShowResetConfirm(true);

  const confirmReset = async () => {
    for (const t of simulations) {
      await deleteSimulation(t.id);
    }
    setToastMessage('All simulation data reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const allSimulations = [...simulations].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const visibleTransactions = useMemo(() => allSimulations.slice(0, visibleCount), [allSimulations, visibleCount]);
  const hasMore = visibleCount < allSimulations.length;

  const loadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 10, allSimulations.length));
      setIsLoadingMore(false);
    }, 300);
  };

  const getDayTransactions = (date: string) => {
    const activeTransactions = simulations.filter(t => t.startDate <= date && t.endDate >= date);
    return activeTransactions.map(t => {
      let totalAmount: number;
      if (t.period === 'day') {
        totalAmount = t.amount * t.days;
      } else if (t.period === 'week') {
        totalAmount = t.amount * t.weeks;
      } else {
        totalAmount = t.amount * t.months;
      }
      const dailyAmount = totalAmount / t.days;
      return {
        ...t,
        amount: dailyAmount,
        originalAmount: t.amount,
        originalPeriod: t.period,
      };
    });
  };

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...allSimulations];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'amount': comparison = a.amount - b.amount; break;
        case 'period': comparison = a.period.localeCompare(b.period); break;
        case 'category':
          const catA = getCategoryById(a.categoryId)?.name || '';
          const catB = getCategoryById(b.categoryId)?.name || '';
          comparison = catA.localeCompare(catB); break;
        case 'startDate': comparison = a.startDate.localeCompare(b.startDate); break;
        case 'duration': comparison = a.days - b.days; break;
        case 'total':
          const totalA = calculateTotalAmount(a);
          const totalB = calculateTotalAmount(b);
          comparison = totalA - totalB; break;
        case 'createdAt': comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [allSimulations, sortBy, sortOrder]);

  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isSystem);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);
  const isStartDateSelected = !!formData.startDate;

  const getHeaderPadding = () => {
    if (isVerySmall) return 'p-3 pb-2 pt-3';
    if (isMobile) return 'p-4 pb-2 pt-4';
    return 'p-6 pb-3 pt-5';
  };

  const getCardPadding = () => {
    if (isVerySmall) return 'p-2';
    if (isMobile) return 'p-3';
    return 'p-4';
  };

  const getCardTextSize = () => {
    if (isVerySmall) return 'text-lg';
    if (isMobile) return 'text-xl';
    return 'text-2xl';
  };

  return {
    categories,
    // Estados
    currentDate,
    setCurrentDate,
    showModal,
    setShowModal,
    showDetailModal,
    setShowDetailModal,
    editingTransaction,
    setEditingTransaction,
    selectedTransaction,
    setSelectedTransaction,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showResetConfirm,
    setShowResetConfirm,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    isMobile,
    isVerySmall,
    formData,
    setFormData,
    errors,
    setErrors,
    visibleCount,
    isLoadingMore,
    sortBy,
    sortOrder,
    stats,
    allSimulations,
    visibleTransactions,
    sortedTransactions,
    hasMore,
    incomeCategories,
    expenseCategories,
    isStartDateSelected,
    getHeaderPadding,
    getCardPadding,
    getCardTextSize,
    getCategoryById,
    getDayTransactions,
    calculateTotalAmount,
    handleAmountChange,
    handlePeriodChange,
    handleCategoryChange,
    handleStartDateChange,
    handleEndDateChange,
    handleDaysChange,
    handleWeeksChange,
    handleMonthsChange,
    handleSubmit,
    resetForm,
    handleEdit,
    handleDelete,
    handleViewDetails,
    confirmDelete,
    handleReset,
    confirmReset,
    loadMore,
    handleSort,
    isLoading: simLoading,
  };
};