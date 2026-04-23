// pages/SimulationCalendar.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import NumberInput from '../components/common/NumberInput';
import CustomSelect, { type SelectOption } from '../components/common/CustomSelect';
import Calendar from '../components/common/Calendar';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import SimulationDetailModal from '../components/modals/SimulationDetailModal';
import type { SimulationTransaction } from '../types';
import { AlertCircle, ChevronDown, Clock, Edit2, PieChart, Plus, RefreshCw, Save, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { getIconComponent } from '../utils/iconHelpers';
import { Calendar as CalendarIcon } from 'lucide-react';

const SimulationCalendar: React.FC = () => {
  const periodOptions: SelectOption[] = [
    { id: 'day', label: 'Daily', icon: <CalendarIcon className="w-4 h-4 text-blue-400" /> },
    { id: 'week', label: 'Weekly', icon: <CalendarIcon className="w-4 h-4 text-yellow-400" /> },
    { id: 'month', label: 'Monthly', icon: <CalendarIcon className="w-4 h-4 text-purple-400" /> },
  ];
  
  const { categories, simulationTransactions, addSimulationTransaction, updateSimulationTransaction, deleteSimulationTransaction } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SimulationTransaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<SimulationTransaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);
  
  const periodIcons: Record<string, React.ReactNode> = {
    day: <CalendarIcon className="w-3 h-3 text-blue-400" />,
    week: <CalendarIcon className="w-3 h-3 text-yellow-400" />,
    month: <CalendarIcon className="w-3 h-3 text-purple-400" />,
  };
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

  // ==================== FUNCIONES AUXILIARES ====================
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    return endDate.toISOString().split('T')[0];
  };

  const formatDecimal = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }).replace('.', ',');
  };

  const parseDecimal = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const roundToTwo = (num: number): number => Math.round(num * 100) / 100;

  const calculateTotalAmount = (transaction: SimulationTransaction): number => {
    if (transaction.period === 'day') return transaction.amount * transaction.days;
    if (transaction.period === 'week') return transaction.amount * transaction.weeks;
    return transaction.amount * transaction.months;
  };

  // ==================== ESTADÍSTICAS GLOBALES ====================
  const globalStats = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalMonthlyIncome = 0;
    let totalMonthlyExpenses = 0;
    let totalDailyIncome = 0;
    let totalDailyExpenses = 0;

    simulationTransactions.forEach(t => {
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

  // ==================== FUNCIONES DE ACTUALIZACIÓN ====================
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

  // ==================== HANDLERS ====================
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

  const getDayTransactions = (date: string) => {
    const activeTransactions = simulationTransactions.filter(t => t.startDate <= date && t.endDate >= date);
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

  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isSystem);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);
  
  const categoryOptions: SelectOption[] = [
    ...(incomeCategories.length > 0 
      ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: null, disabled: true }] 
      : []),
    ...incomeCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return {
        id: cat.id,
        label: cat.name,
        icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
        color: cat.color,
        disabled: false,
      };
    }),
    ...(expenseCategories.length > 0 
      ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: null, disabled: true }] 
      : []),
    ...expenseCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return {
        id: cat.id,
        label: cat.name,
        icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
        color: cat.color,
        disabled: false,
      };
    }),
  ];



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

  const handleSubmit = () => {
    if (!validateForm()) {
      setToastMessage('Please fill in all required fields correctly');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const category = getCategoryById(formData.categoryId);
    const transactionData = {
      amount: formData.amount,
      period: formData.period,
      categoryId: formData.categoryId,
      categoryName: category?.name || 'Other',
      description: formData.description,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: formData.days,
      weeks: formData.weeks,
      months: formData.months,
    };

    if (editingTransaction) {
      updateSimulationTransaction(editingTransaction.id, transactionData);
      setToastMessage('Transaction updated successfully');
    } else {
      addSimulationTransaction(transactionData);
      setToastMessage('Transaction added successfully');
    }
    setToastType('success');
    setShowToast(true);
    resetForm();
    setShowModal(false);
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

  const handleEdit = (transaction: SimulationTransaction, e: React.MouseEvent) => {
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

  const handleViewDetails = (transaction: SimulationTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteSimulationTransaction(transactionToDelete);
      setToastMessage('Transaction deleted successfully');
      setToastType('success');
      setShowToast(true);
      setTransactionToDelete(null);
    }
  };

  const handleReset = () => setShowResetConfirm(true);

  const confirmReset = () => {
    simulationTransactions.forEach((t: SimulationTransaction) => deleteSimulationTransaction(t.id));
    setToastMessage('All simulation data reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const allSimulations = [...simulationTransactions].sort((a: SimulationTransaction, b: SimulationTransaction) => a.startDate.localeCompare(b.startDate));
  const visibleTransactions = useMemo(() => allSimulations.slice(0, visibleCount), [allSimulations, visibleCount]);
  const hasMore = visibleCount < allSimulations.length;

  const loadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 10, allSimulations.length));
      setIsLoadingMore(false);
    }, 300);
  };

  const isStartDateSelected = !!formData.startDate;
  const weeksDisplayValue = formData.weeks > 0 ? formatDecimal(formData.weeks) : '';
  const monthsDisplayValue = formData.months > 0 ? formatDecimal(formData.months) : '';
  const modalTotalPreview = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    if (formData.period === 'day') return formData.amount * formData.days;
    if (formData.period === 'week') return formData.amount * formData.weeks;
    return formData.amount * formData.months;
  };

  // Estados para ordenamiento
  const [sortBy, setSortBy] = useState<'amount' | 'period' | 'category' | 'startDate' | 'duration' | 'total' | 'createdAt'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'amount' | 'period' | 'category' | 'startDate' | 'duration' | 'total' | 'createdAt') => {
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
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [allSimulations, sortBy, sortOrder]);

  // Estilos responsivos
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

  return (
    // CAMBIO PRINCIPAL: min-h-screen en lugar de h-screen, eliminado overflow-hidden
    <div className="min-h-screen bg-[#0F0F1A] flex flex-col">
      {/* Header - padding responsivo */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-2' : 'justify-between items-center'} mb-4`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-xl' : (isMobile ? 'text-2xl' : 'text-3xl')} font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight`}>
              Simulation Calendar
            </h1>
            <p className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40 mt-0.5 font-light`}>
              Simulate financial scenarios
            </p>
          </div>
          <div className={`flex gap-2 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleReset}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-white/5 hover:bg-red-500/20 transition-all duration-300 text-white font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center`}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-180 transition-transform duration-500`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-white/5 hover:bg-white/10 transition-all duration-300 text-white font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-90 transition-transform duration-300`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Simulate</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - diseño responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
            <div className={`${getCardPadding()}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-[#6366F1]/10 flex items-center justify-center`}>
                    <Wallet className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-[#6366F1]`} />
                  </div>
                  <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>NET RESULT</span>
                </div>
              </div>
              <p className={`${getCardTextSize()} font-light ${stats.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.netBalance))}
              </p>
              <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-[10px]">
                <span className="text-white/30">Daily avg: {formatCurrency(stats.dailyNet)}</span>
                <span className="text-white/30">Monthly avg: {formatCurrency(stats.monthlyNet)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
            <div className={`${getCardPadding()}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-green-500/10 flex items-center justify-center`}>
                    <TrendingUp className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-green-500`} />
                  </div>
                  <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>TOTAL INCOME</span>
                </div>
              </div>
              <p className={`${getCardTextSize()} font-light text-green-500`}>+{formatCurrency(stats.totalIncome)}</p>
              <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-white/30">Daily:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.dailyIncome)}</span></div>
                <div><span className="text-white/30">Monthly:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.monthlyIncome)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
            <div className={`${getCardPadding()}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-red-500/10 flex items-center justify-center`}>
                    <TrendingDown className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-red-500`} />
                  </div>
                  <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>TOTAL EXPENSES</span>
                </div>
              </div>
              <p className={`${getCardTextSize()} font-light text-red-500`}>-{formatCurrency(stats.totalExpenses)}</p>
              <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-white/30">Daily:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.dailyExpenses)}</span></div>
                <div><span className="text-white/30">Monthly:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.monthlyExpenses)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de transacciones */}
        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40`}>
                {simulationTransactions.filter(t => getCategoryById(t.categoryId)?.type === 'income').length} Income
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-white/40`}>
                {simulationTransactions.filter(t => getCategoryById(t.categoryId)?.type === 'expense').length} Expenses
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-white/30" />
            <span className={`${isVerySmall ? 'text-[7px]' : 'text-[9px]'} text-white/30`}>{simulationTransactions.length} active</span>
          </div>
        </div>
      </div>

      {/* Calendario - Ocupa espacio flexible sin overflow hidden */}
      <div className="flex-1 px-4 pb-4">
        <Calendar
          transactions={simulationTransactions}
          categories={categories}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDayClick={() => {}}
          getDayTransactions={getDayTransactions}
          getCategoryById={getCategoryById}
          isFutureDisabled={false}
          showBalance={false}
          className="w-full"
        />
      </div>

      {/* Tabla de transacciones */}
      <div className="flex-shrink-0 px-4 pb-6">
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className={`${isVerySmall ? 'p-3' : 'p-4'} border-b border-white/10`}>
            <div className={`flex ${isVerySmall ? 'flex-col gap-2' : 'justify-between items-center'}`}>
              <h3 className="text-sm font-light text-white/60">Simulated Transactions</h3>
              <div className="flex items-center gap-2">
                <PieChart className="w-3 h-3 text-white/30" />
                <span className={`${isVerySmall ? 'text-[8px]' : 'text-[9px]'} text-white/30`}>
                  {allSimulations.length} total · Showing {visibleTransactions.length}
                </span>
              </div>
            </div>
            
            {/* Botones de ordenamiento - scrollable en móvil */}
            <div className={`flex flex-wrap gap-2 mt-3 ${isVerySmall ? 'overflow-x-auto pb-1' : ''}`}>
              <button onClick={() => handleSort('createdAt')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'createdAt' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('amount')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'amount' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('period')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'period' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Period {sortBy === 'period' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('category')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'category' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('startDate')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'startDate' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Start Date {sortBy === 'startDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('duration')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'duration' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Duration {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button onClick={() => handleSort('total')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 whitespace-nowrap ${sortBy === 'total' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          
          {/* Tabla con scroll horizontal en móvil si es necesario */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-[#1A1A2E] border-b border-white/10">
                <tr>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Created</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Amount</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Period</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Category</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40 hidden md:table-cell">Description</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Range</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Duration</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Total</th>
                  <th className="text-center p-3 text-[10px] font-light text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.slice(0, visibleCount).map((tx: SimulationTransaction) => {
                  const cat = getCategoryById(tx.categoryId);
                  const totalAmount = calculateTotalAmount(tx);
                  const periodLabel = tx.period === 'day' ? 'day' : tx.period === 'week' ? 'week' : 'month';
                  const isIncome = cat?.type === 'income';
                  
                  return (
                    <tr key={tx.id} onClick={() => handleViewDetails(tx)} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                      <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                      <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-500' : 'text-red-500'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                      <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {periodIcons[tx.period]}
                          <span>per {periodLabel}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat?.icon}</span>
                          <span className="text-xs font-light text-white/80 whitespace-nowrap">{cat?.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs font-light text-white/40 hidden md:table-cell">{tx.description || '-'}</td>
                      <td className="p-3 text-xs font-light text-white/60 whitespace-nowrap">
                        {formatDate(tx.startDate, 'short')} → {formatDate(tx.endDate, 'short')}
                      </td>
                      <td className="p-3 text-xs font-light text-white/60">{tx.days}d</td>
                      <td className={`p-3 text-xs font-light ${isIncome ? 'text-green-500' : 'text-red-500'} whitespace-nowrap`}>
                        {isIncome ? '+' : '-'}{formatCurrency(totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleEdit(tx, e)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => handleDelete(tx.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {hasMore && (
            <div className="p-4 text-center border-t border-white/10">
              <button onClick={loadMore} disabled={isLoadingMore} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 mx-auto">
                {isLoadingMore ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading...</> : <>Load More <ChevronDown className="w-4 h-4" /></>}
              </button>
            </div>
          )}
          
          {allSimulations.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm font-light">
              No simulated transactions yet. Click "Simulate Range" to add one.
            </div>
          )}
        </div>
      </div>

      {/* Modales (se mantienen igual) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="sticky top-0 z-10">
              <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <div>
                  <h3 className="text-lg font-light text-white">{editingTransaction ? 'Edit Simulation' : 'New Simulation'}</h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">{editingTransaction ? 'Update your simulation' : 'Create a recurring transaction simulation'}</p>
                </div>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Amount <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="flex-1"><NumberInput value={formData.amount} onChange={handleAmountChange} placeholder="0" min={1} required error={errors.amount} /></div>
                    <div className="w-36"><CustomSelect value={formData.period} onChange={(value) => handlePeriodChange(value as 'day' | 'week' | 'month')} options={periodOptions} placeholder="Select period" /></div>
                  </div>
                  {formData.amount > 0 && formData.startDate && formData.endDate && (
                    <div className="mt-2 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                      <p className="text-[9px] text-white/30 font-light">Total for period: <span className="text-[#6366F1]">{formatCurrency(modalTotalPreview())}</span></p>
                    </div>
                  )}
                </div>

                <CustomSelect label="Category" value={formData.categoryId} onChange={handleCategoryChange} options={categoryOptions} placeholder="Select a category" required error={errors.categoryId} />

                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Description (optional)</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20" placeholder="e.g., Daily coffee, Rent, etc." />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.startDate} onChange={(e) => handleStartDateChange(e.target.value)} className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors ${errors.startDate ? 'border-red-500/50' : 'border-white/10'}`} />
                  {errors.startDate && <div className="flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3 text-red-500/80" /><p className="text-[10px] text-red-500/80">{errors.startDate}</p></div>}
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">End Date <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.endDate} onChange={(e) => handleEndDateChange(e.target.value)} disabled={!isStartDateSelected} className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.endDate ? 'border-red-500/50' : 'border-white/10'}`} min={formData.startDate || undefined} />
                  {errors.endDate && <div className="flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3 text-red-500/80" /><p className="text-[10px] text-red-500/80">{errors.endDate}</p></div>}
                  {!isStartDateSelected && <p className="text-[10px] text-white/30 font-light mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Select start date first</p>}
                </div>

                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-3 font-light">Duration (editable)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberInput label="Days" value={formData.days} onChange={handleDaysChange} placeholder="0" min={1} disabled={!isStartDateSelected} />
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-light">Weeks</label>
                      <input type="text" value={weeksDisplayValue} onChange={handleWeeksChange} disabled={!isStartDateSelected} placeholder="0" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/20" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-light">Months</label>
                      <input type="text" value={monthsDisplayValue} onChange={handleMonthsChange} disabled={!isStartDateSelected} placeholder="0" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/20" />
                    </div>
                  </div>
                  {!isStartDateSelected && <p className="text-[10px] text-amber-500/80 font-light mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Select a start date first to enable duration fields</p>}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0">
              <div className="flex gap-3 p-5 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"><Save className="w-4 h-4" />{editingTransaction ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SimulationDetailModal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedTransaction(null); }} transaction={selectedTransaction} category={selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : null} />
      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Simulation" message="Are you sure you want to delete this simulated transaction?" confirmText="Delete" type="danger" />
      <ConfirmModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={confirmReset} title="Reset All Simulations" message="Are you sure you want to reset ALL simulation data? This action cannot be undone." confirmText="Reset All" cancelText="Cancel" type="danger" />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default SimulationCalendar;