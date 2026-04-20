// pages/SimulationCalendar.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import NumberInput from '../components/common/NumberInput';
import CustomSelect, { type SelectOption } from '../components/common/CustomSelect';
import Calendar from '../components/common/Calendar';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import { Plus, Trash2, Edit2, Save, X, TrendingUp, TrendingDown, Wallet, Sparkles, RefreshCw, CalendarDays, CalendarRange } from 'lucide-react';
import type { SimulationTransaction } from '../types';

const SimulationCalendar: React.FC = () => {
  const periodOptions: SelectOption[] = [
    { id: 'day', label: 'Daily', icon: '📅', description: '' },
    { id: 'week', label: 'Weekly', icon: '📆', description: '' },
    { id: 'month', label: 'Monthly', icon: '📅', description: '' },
  ];
  const { categories, simulationTransactions, addSimulationTransaction, updateSimulationTransaction, deleteSimulationTransaction } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SimulationTransaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
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

  // Calcular días entre dos fechas
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Calcular semanas a partir de días
  const calculateWeeksFromDays = (days: number): number => {
    return days / 7;
  };

  // Calcular meses a partir de días (30.44 días por mes)
  const calculateMonthsFromDays = (days: number): number => {
    return days / 30.44;
  };

  // Calcular días a partir de semanas
  const calculateDaysFromWeeks = (weeks: number): number => {
    return weeks * 7;
  };

  // Calcular días a partir de meses
  const calculateDaysFromMonths = (months: number): number => {
    return months * 30.44;
  };

  // Actualizar endDate basado en startDate y días
  const updateEndDateFromDays = (start: string, days: number): string => {
    if (!start || days <= 0) return '';
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days - 1);
    return endDate.toISOString().split('T')[0];
  };

  // Formatear número decimal para mostrar (con coma)
  const formatDecimal = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }).replace('.', ',');
  };

  // Parsear decimal desde string con coma
  const parseDecimal = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  // Redondear a 2 decimales
  const roundToTwo = (num: number): number => {
    return Math.round(num * 100) / 100;
  };

  const calculateTotalAmount = (
    amount: number, 
    period: 'day' | 'week' | 'month', 
    startDate: string, 
    endDate: string
  ): number => {
    if (!startDate || !endDate) return 0;
    
    const days = calculateDays(startDate, endDate);
    const weeks = days / 7;
    const months = days / 30.44;
    
    if (period === 'day') {
      return amount * days;
    }
    if (period === 'week') {
      return amount * weeks;
    }
    // month: el amount ya es mensual, multiplicar por número de meses
    return amount * months;
  };
  // Calcular el monto por día basado en el período seleccionado
  const calculateDailyAmount = (amount: number, period: 'day' | 'week' | 'month', startDate: string, endDate: string): number => {
    if (period === 'day') return amount;
    if (period === 'week') return amount / 7;
    
    // Para month: calcular días exactos en el rango
    if (period === 'month' && startDate && endDate) {
      const days = calculateDays(startDate, endDate);
      return amount / days;
    }
    return amount;
  };

  const getEquivalentValues = () => {
    if (!formData.startDate || !formData.endDate) {
      return { daily: 0, weekly: 0, monthly: 0 };
    }
    
    const days = calculateDays(formData.startDate, formData.endDate);
    const dailyAmount = calculateDailyAmount(formData.amount, formData.period, formData.startDate, formData.endDate);
    
    return {
      daily: dailyAmount,
      weekly: dailyAmount * 7,
      monthly: dailyAmount * days,
    };
  };

  const equivalents = getEquivalentValues();


  // Actualizar desde días
  const updateFromDays = useCallback((days: number, startDate: string) => {
    if (!startDate || days <= 0) return;
    
    const weeks = calculateWeeksFromDays(days);
    const months = calculateMonthsFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    
    setFormData(prev => ({
      ...prev,
      days: days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
      endDate: endDate
    }));
  }, []);

  // Actualizar desde semanas
  const updateFromWeeks = useCallback((weeks: number, startDate: string) => {
    if (!startDate || weeks <= 0) return;
    
    const days = Math.round(calculateDaysFromWeeks(weeks));
    const months = calculateMonthsFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    
    setFormData(prev => ({
      ...prev,
      days: days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
      endDate: endDate
    }));
  }, []);

  // Actualizar desde meses
  const updateFromMonths = useCallback((months: number, startDate: string) => {
    if (!startDate || months <= 0) return;
    
    const days = Math.round(calculateDaysFromMonths(months));
    const weeks = calculateWeeksFromDays(days);
    const endDate = updateEndDateFromDays(startDate, days);
    
    setFormData(prev => ({
      ...prev,
      days: days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
      endDate: endDate
    }));
  }, []);

  // Actualizar desde fechas
  const updateFromDates = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return;
    
    const days = calculateDays(startDate, endDate);
    const weeks = calculateWeeksFromDays(days);
    const months = calculateMonthsFromDays(days);
    
    setFormData(prev => ({
      ...prev,
      days: days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
    }));
  }, []);

  // Handlers
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

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  
  const getDayTransactions = (date: string) => {
    return simulationTransactions.filter(t => t.startDate <= date && t.endDate >= date);
  };

  const totalSimulated = simulationTransactions.reduce((sum: number, t: SimulationTransaction) => sum + t.amount, 0);
  
  const simulatedIncome = simulationTransactions
    .filter((t: SimulationTransaction) => getCategoryById(t.categoryId)?.type === 'income')
    .reduce((sum: number, t: SimulationTransaction) => sum + t.amount, 0);
    
  const simulatedExpenses = simulationTransactions
    .filter((t: SimulationTransaction) => getCategoryById(t.categoryId)?.type === 'expense')
    .reduce((sum: number, t: SimulationTransaction) => sum + t.amount, 0);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const categoryOptions = [
    ...(incomeCategories.length > 0 
      ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: '💰', disabled: true }] 
      : []),
    ...incomeCategories.map(cat => ({ 
      id: cat.id, 
      label: cat.name, 
      icon: cat.icon, 
      color: cat.color,
      disabled: false 
    })),
    ...(expenseCategories.length > 0 
      ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: '💸', disabled: true }] 
      : []),
    ...expenseCategories.map(cat => ({ 
      id: cat.id, 
      label: cat.name, 
      icon: cat.icon, 
      color: cat.color,
      disabled: false 
    })),
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
    
    // Guardar el amount tal como el usuario lo ingresó, sin convertir a diario
    const transactionData = {
      amount: formData.amount,  // ← Directamente el valor del input
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
    setErrors({
      amount: '',
      categoryId: '',
      startDate: '',
      endDate: '',
    });
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: SimulationTransaction) => {
    setEditingTransaction(transaction);
    const days = transaction.days || calculateDays(transaction.startDate, transaction.endDate);
    const weeks = transaction.weeks || roundToTwo(calculateWeeksFromDays(days));
    const months = transaction.months || roundToTwo(calculateMonthsFromDays(days));
    
    // transaction.amount ya es el valor según el período (ej: 30.000 para monthly)
    setFormData({
      amount: transaction.amount,
      period: transaction.period,
      categoryId: transaction.categoryId,
      description: transaction.description,
      startDate: transaction.startDate,
      endDate: transaction.endDate,
      days: days,
      weeks: roundToTwo(weeks),
      months: roundToTwo(months),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setShowDeleteConfirm(true);
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

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    simulationTransactions.forEach((t: SimulationTransaction) => deleteSimulationTransaction(t.id));
    setToastMessage('All simulation data reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const allSimulations = [...simulationTransactions].sort((a: SimulationTransaction, b: SimulationTransaction) => a.startDate.localeCompare(b.startDate));

  const isStartDateSelected = !!formData.startDate;
  const isEndDateEnabled = isStartDateSelected;

  const weeksDisplayValue = formData.weeks > 0 ? formatDecimal(formData.weeks) : '';
  const monthsDisplayValue = formData.months > 0 ? formatDecimal(formData.months) : '';

  // Mostrar el equivalente en otras unidades
  const dailyEquivalent = calculateDailyAmount(formData.amount, formData.period, formData.startDate, formData.endDate);
  const weeklyEquivalent = dailyEquivalent * 7;
  const monthlyEquivalent = dailyEquivalent * 30.44;

  return (
    <div className="h-screen flex flex-col bg-[#0F0F1A] overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
              Simulation Calendar
            </h1>
            <p className="text-xs text-white/40 mt-0.5 font-light">Simulate financial scenarios</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Reset
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              Simulate Range
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <Wallet className="w-3.5 h-3.5 text-[#6366F1]/80 mb-1" />
            <p className="text-lg font-light text-[#6366F1]">{formatCurrency(totalSimulated)}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Total Simulated</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <TrendingUp className="w-3.5 h-3.5 text-green-500/80 mb-1" />
            <p className="text-lg font-light text-green-500">+{formatCurrency(simulatedIncome)}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Simulated Income</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <TrendingDown className="w-3.5 h-3.5 text-red-500/80 mb-1" />
            <p className="text-lg font-light text-red-500">-{formatCurrency(simulatedExpenses)}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Simulated Expenses</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500/80 mb-1" />
            <p className="text-lg font-light text-yellow-500">{simulationTransactions.length}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Active Simulations</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6">
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
          className="h-[50%] mb-4"
        />

        {/* Transactions Table */}
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden h-[45%] mt-4">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-light text-white/60">Simulated Transactions</h3>
          </div>
          <div className="overflow-y-auto h-[calc(100%-52px)]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#1A1A2E] border-b border-white/10">
                <tr>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Amount</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Period</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Category</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Description</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Start Date</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">End Date</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Duration</th>
                  <th className="text-left p-3 text-[10px] font-light text-white/40">Total</th>
                  <th className="text-center p-3 text-[10px] font-light text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSimulations.map((tx: SimulationTransaction) => {
                  const cat = getCategoryById(tx.categoryId);
                  const daysDiff = tx.days || calculateDays(tx.startDate, tx.endDate);
                  const totalAmount = calculateTotalAmount(
                                                            tx.amount, 
                                                            tx.period, 
                                                            tx.startDate, 
                                                            tx.endDate
                                                          );
                  const weeksDisplay = (daysDiff / 7).toFixed(2).replace('.', ',');
                  const monthsDisplay = (daysDiff / 30.44).toFixed(2).replace('.', ',');
                  const periodIcon = tx.period === 'day' ? '📅' : tx.period === 'week' ? '📆' : '📅';
                  const periodLabel = tx.period === 'day' ? 'per day' : tx.period === 'week' ? 'per week' : 'per month';
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-3 text-sm font-light text-white/80">{formatCurrency(tx.amount)}</td>
                      <td className="p-3 text-sm font-light text-white/60">{periodIcon} {periodLabel}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat?.icon}</span>
                          <span className="text-sm font-light text-white/80">{cat?.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm font-light text-white/40">{tx.description || '-'}</td>
                      <td className="p-3 text-sm font-light text-white/60">{formatDate(tx.startDate, 'short')}</td>
                      <td className="p-3 text-sm font-light text-white/60">{formatDate(tx.endDate, 'short')}</td>
                      <td className="p-3 text-sm font-light text-white/60">
                        {daysDiff}d ({weeksDisplay}w / {monthsDisplay}m)
                      </td>
                      <td className="p-3 text-sm font-light text-[#6366F1]">{formatCurrency(totalAmount)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(tx)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {allSimulations.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/40 text-sm font-light">
                      No simulated transactions yet. Click "Simulate Range" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar simulación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-white/10 sticky top-0 bg-[#1A1A2E]">
              <h3 className="text-lg font-light text-white">
                {editingTransaction ? 'Edit Simulation' : 'New Simulation'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Amount with Period Selector */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <NumberInput
                        value={formData.amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        min={1}
                        required
                        error={errors.amount}
                      />
                    </div>
                    <div className="w-36">
                      <CustomSelect
                        value={formData.period}
                        onChange={(value) => handlePeriodChange(value as 'day' | 'week' | 'month')}
                        options={periodOptions}
                        placeholder="Select period"
                      />
                    </div>
                  </div>
                </div>
                {formData.amount > 0 && formData.startDate && formData.endDate && (
                  <div className="mt-2 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-[9px] text-white/30">
                      Equals: {formatCurrency(equivalents.daily)}/day | {formatCurrency(equivalents.weekly)}/week | {formatCurrency(equivalents.monthly)}/month
                    </p>
                  </div>
                )}
              </div>

              {/* Category */}
              <CustomSelect
                label="Category"
                value={formData.categoryId}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="Select a category"
                required
                error={errors.categoryId}
              />

              {/* Description */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                  placeholder="e.g., Daily coffee, Rent, etc."
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 ${
                    errors.startDate ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.startDate && <p className="text-[10px] text-red-500/80 mt-1">{errors.startDate}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={!isEndDateEnabled}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.endDate ? 'border-red-500/50' : 'border-white/10'
                  }`}
                  min={formData.startDate || undefined}
                />
                {errors.endDate && <p className="text-[10px] text-red-500/80 mt-1">{errors.endDate}</p>}
                {!isEndDateEnabled && (
                  <p className="text-[10px] text-white/30 mt-1">Select start date first</p>
                )}
              </div>

              {/* Duration Section */}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/40 mb-3 font-light">Duration (editable)</p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput
                    label="Days"
                    value={formData.days}
                    onChange={handleDaysChange}
                    placeholder="0"
                    min={1}
                    disabled={!isStartDateSelected}
                  />
                  
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">Weeks</label>
                    <input
                      type="text"
                      value={weeksDisplayValue}
                      onChange={handleWeeksChange}
                      disabled={!isStartDateSelected}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">Months</label>
                    <input
                      type="text"
                      value={monthsDisplayValue}
                      onChange={handleMonthsChange}
                      disabled={!isStartDateSelected}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-2">
                  {!isStartDateSelected && "⚠️ Select a start date first to enable duration fields"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-[#1A1A2E]">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingTransaction ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Simulation"
        message="Are you sure you want to delete this simulated transaction?"
        confirmText="Delete"
        type="danger"
      />

      {/* Confirm Reset Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Reset All Simulations"
        message="Are you sure you want to reset ALL simulation data? This action cannot be undone."
        confirmText="Reset All"
        cancelText="Cancel"
        type="danger"
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default SimulationCalendar;