// pages/Debts.tsx - agregar validación dinámica en el modal de creación/edición

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { Plus, Trash2, Edit2, X, Save, TrendingUp, TrendingDown, ArrowLeftRight, CheckCircle, AlertCircle, PlusCircle } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import NumberInput from '../components/common/NumberInput';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import DebtDetailModal from '../components/modals/DebtDetailModal';
import { useNavigate } from 'react-router-dom';
import CompleteDebtConfirmModal from '../components/modals/CompleteDebtConfirmModal';
import ConfettiEffect from '../components/common/ConfettiEffect';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';

// IDs fijos para las categorías
const BORROW_CATEGORY_ID = 'borrow-category';
const LENT_CATEGORY_ID = 'lent-category';

const Debts: React.FC = () => {
  const { debts, wallets, categories, addDebt, updateDebt, deleteDebt, addCategory } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [interestRateInput, setInterestRateInput] = useState('');
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [editAmountError, setEditAmountError] = useState<string | null>(null);
  const [showCompleteFromEditConfirm, setShowCompleteFromEditConfirm] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [realAmountToPay, setRealAmountToPay] = useState(0);
  const [realInterests, setRealInterests] = useState(0);
  const [variableInterests, setVariableInterests] = useState<{ month: number; rate: number }[]>([]);
  const [realAmountError, setRealAmountError] = useState<string | null>(null);
  const [selectedVariableMonth, setSelectedVariableMonth] = useState(1);

  const getWalletIconComponent = (wallet: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-4 h-4" style={{ color: wallet.color }} />,
      bank_account: <Building2 className="w-4 h-4" style={{ color: wallet.color }} />,
      credit_card: <CreditCard className="w-4 h-4" style={{ color: wallet.color }} />,
      debit_card: <CreditCard className="w-4 h-4" style={{ color: wallet.color }} />,
      other: <Package className="w-4 h-4" style={{ color: wallet.color }} />,
    };
    return iconMap[wallet.type] || <WalletIcon className="w-4 h-4" style={{ color: wallet.color }} />;
  };

  const walletOptions = wallets
    .filter(w => w.isActive)
    .map(w => ({
      id: w.id,
      label: `${w.name}${w.lastFourDigits ? ` (****${w.lastFourDigits})` : ''}`,
      icon: getWalletIconComponent(w),
      color: w.color,
  }));

  const isAutoCalculatingRef = useRef(false);
  
  const [formData, setFormData] = useState({
    type: 'borrowed' as 'borrowed' | 'lent',
    creditorName: '',
    walletId: '',
    originalAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    interestType: 'fixed' as 'fixed' | 'variable',
    termMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [errors, setErrors] = useState({
    creditorName: '',
    walletId: '',
    originalAmount: '',
    monthlyPayment: '',
    termMonths: '',
    startDate: '',
    type: '',
  });

  // Obtener la wallet seleccionada y su balance
  const selectedWallet = wallets.find(w => w.id === formData.walletId);
  const currentWalletBalance = selectedWallet?.currentBalance || 0;

  // Calcular el balance real disponible (sin contar la deuda actual si es borrowed)
  let realAvailableBalance = currentWalletBalance;

  // Si estamos editando una deuda existente de tipo 'borrowed', restar su monto
  if (editingDebt && editingDebt.type === 'borrowed' && editingDebt.walletId === formData.walletId) {
    realAvailableBalance -= editingDebt.originalAmount;
  } else if (editingDebt && editingDebt.type === 'lent' && editingDebt.walletId === formData.walletId) {
    realAvailableBalance += editingDebt.originalAmount;
  }
  const totalPaymentsMade = useMemo(() => {
    if (!editingDebt) return 0;
    const payments = editingDebt.payments || [];
    return payments.reduce((sum: any, p: { amount: any; }) => sum + p.amount, 0);
  }, [editingDebt]);

  // 1. Calcular realAmountToPay automáticamente SOLO si no fue editado manualmente
  useEffect(() => {
    if (formData.monthlyPayment > 0 && formData.termMonths > 0) {
      const calculatedRealAmount = formData.monthlyPayment * formData.termMonths;
      
      setRealAmountToPay(calculatedRealAmount);
      setRealInterests(calculatedRealAmount - formData.originalAmount);
      setRealAmountError(null);
    }
  }, [formData.monthlyPayment, formData.termMonths]);

  // 1.2. Recuperar realInterests cuando cambia originalAmount o realAmountToPay
  useEffect(() => {
    if (realAmountToPay > 0) {
      setRealInterests(realAmountToPay - formData.originalAmount);
    }
  }, [formData.originalAmount, realAmountToPay]);


  // 2. Validación para edición de monto (no puede ser menor a pagos realizados)
  useEffect(() => {
    if (editingDebt && formData.originalAmount > 0) {
      if (formData.originalAmount < totalPaymentsMade) {
        setEditAmountError(
          `Cannot reduce amount below total payments made (${formatCurrency(totalPaymentsMade)}). ` +
          `Current payments total: ${formatCurrency(totalPaymentsMade)}`
        );
      } else {
        setEditAmountError(null);
      }
    } else {
      setEditAmountError(null);
    }
  }, [formData.originalAmount, editingDebt, totalPaymentsMade]);

  // 3. Validación dinámica para Lent (préstamo que hago)
  useEffect(() => {
    if (formData.type === 'lent' && formData.originalAmount > 0 && formData.walletId) {
      let requiredAmount = formData.originalAmount;
      
      if (editingDebt) {
        if (editingDebt.type === 'borrowed') {
          requiredAmount = formData.originalAmount;
        } else if (editingDebt.type === 'lent') {
          const increase = formData.originalAmount - editingDebt.originalAmount;
          if (increase > 0) {
            requiredAmount = increase;
          } else {
            setBalanceError(null);
            return;
          }
        }
      }
      
      if (requiredAmount > realAvailableBalance) {
        setBalanceError(`Insufficient balance. Required: ${formatCurrency(requiredAmount)}. Available: ${formatCurrency(realAvailableBalance)}`);
      } else {
        setBalanceError(null);
      }
    } else {
      setBalanceError(null);
    }
  }, [formData.type, formData.originalAmount, formData.walletId, realAvailableBalance, editingDebt]);

  // 4. Validación de pago (que total a pagar no sea menor al monto original)
  useEffect(() => {
    if (formData.originalAmount > 0 && realAmountToPay > 0) {
      if (realAmountToPay < formData.originalAmount) {
        setPaymentValidationError(
          `Real amount to pay (${formatCurrency(realAmountToPay)}) is less than the original amount (${formatCurrency(formData.originalAmount)}).`
        );
      } else {
        setPaymentValidationError(null);
      }
    } else {
      setPaymentValidationError(null);
    }
  }, [formData.originalAmount, realAmountToPay]);



  const monthOptions = useMemo(() => {
    return Array.from({ length: formData.termMonths }, (_, i) => ({
      id: String(i + 1),
      label: `Month ${i + 1}`,
      icon: '',
    }));
  }, [formData.termMonths]);

  const handleRealAmountChange = (value: number) => {
    // Validar que no sea menor al original amount
    if (value < formData.originalAmount) {
      setRealAmountError(`Real amount cannot be less than the original amount (${formatCurrency(formData.originalAmount)})`);
      setRealAmountToPay(value);
      setRealInterests(realAmountToPay - formData.originalAmount);
      return;
    }
    
    setRealAmountError(null);
    setRealAmountToPay(value);
    setRealInterests(realAmountToPay - formData.originalAmount);
    
  };

  const handleInterestTypeChange = (type: 'fixed' | 'variable') => {
    setFormData(prev => ({ ...prev, interestType: type }));
    if (type === 'fixed') {
      setVariableInterests([]);
      // Redondear a 3 decimales y formatear con coma
      const roundedRate = Math.round(formData.interestRate * 1000) / 1000;
      setInterestRateInput(roundedRate.toString().replace('.', ','));
      setFormData(prev => ({ ...prev, interestRate: roundedRate }));
    } else {
      // Inicializar con valores por defecto para cada mes
      const newVariableInterests = Array.from({ length: formData.termMonths }, (_, i) => ({
        month: i + 1,
        rate: formData.interestRate || 0,
      }));
      setVariableInterests(newVariableInterests);
      const currentRate = newVariableInterests[0]?.rate || 0;
      const roundedRate = Math.round(currentRate * 1000) / 1000;
      setInterestRateInput(roundedRate === 0 ? '' : roundedRate.toString().replace('.', ','));
      setSelectedVariableMonth(1);
    }
  };
  
  const handleMonthlyPaymentChange = (value: number) => {
    setFormData(prev => ({ ...prev, monthlyPayment: value }));
  };

  const handleTermMonthsChange = (value: number) => {
    setFormData(prev => ({ ...prev, termMonths: value }));
    
    // Reajustar los intereses variables si es necesario
    if (formData.interestType === 'variable') {
      const newVariableInterests = Array.from({ length: value }, (_, i) => {
        if (i < variableInterests.length) {
          return variableInterests[i];
        }
        return { month: i + 1, rate: formData.interestRate || 0 };
      });
      setVariableInterests(newVariableInterests);
      if (selectedVariableMonth > value) {
        setSelectedVariableMonth(1);
      }
    }
  };

  const hasActiveWallets = wallets.some(w => w.isActive);
  const noWalletsMessage = !hasActiveWallets && wallets.length === 0;
  const navigate = useNavigate();

  const handleCreateWallet = () => {
    setShowModal(false);
    navigate('/wallets');
  };
  // Obtener o crear categoría Borrow/Lent
  const getOrCreateCategory = (type: 'borrowed' | 'lent') => {
    const categoryName = type === 'borrowed' ? 'Borrow' : 'Lent';
    const categoryType: 'income' | 'expense' = type === 'borrowed' ? 'income' : 'expense';
    const categoryIcon = type === 'borrowed' ? '💰' : '💸';
    const categoryColor = type === 'borrowed' ? '#10B981' : '#EF4444';
    
    let category = categories.find(c => c.name === categoryName && c.type === categoryType);
    
    if (!category) {
      const newCategory = {
        id: type === 'borrowed' ? BORROW_CATEGORY_ID : LENT_CATEGORY_ID,
        name: categoryName,
        type: categoryType,
        icon: categoryIcon,
        color: categoryColor,
        isDefault: true,
      };
      addCategory(newCategory);
      category = categories.find(c => c.id === newCategory.id) || { ...newCategory, userId: '1', createdAt: new Date().toISOString() };
    }
    
    return category;
  };


  const handleSubmit = () => {
    if (!formData.creditorName.trim()) {
      setErrors(prev => ({ ...prev, creditorName: 'Name is required' }));
      return;
    }
    if (!formData.walletId) {
      setErrors(prev => ({ ...prev, walletId: 'Wallet is required' }));
      return;
    }
    if (formData.originalAmount <= 0) {
      setErrors(prev => ({ ...prev, originalAmount: 'Amount must be greater than 0' }));
      return;
    }
    if (realAmountToPay <= 0) {
      setToastMessage('Total amount to pay must be greater than 0');
      setToastType('error');
      setShowToast(true);
      return;
    }
    if (realAmountToPay < formData.originalAmount) {
      setRealAmountError(`Real amount cannot be less than the original amount (${formatCurrency(formData.originalAmount)})`);
      setToastMessage(`Real amount cannot be less than the original amount`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    // Para edición: verificar si la nueva cantidad es menor o igual a los pagos realizados
    if (editingDebt) {
      const willComplete = realAmountToPay <= totalPaymentsMade;
      
      if (willComplete && realAmountToPay !== editingDebt.realAmountToPay) {
        setPendingEditData({
          type: formData.type,
          creditorName: formData.creditorName,
          walletId: formData.walletId,
          originalAmount: formData.originalAmount,
          monthlyPayment: formData.monthlyPayment,
          interestRate: formData.interestRate,
          interestType: formData.interestType,
          termMonths: formData.termMonths,
          startDate: formData.startDate,
          notes: formData.notes,
          realAmountToPay: realAmountToPay,
          realInterests: realInterests,
          variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
          willComplete: true,
        });
        setShowCompleteFromEditConfirm(true);
        return;
      }
      
      if (realAmountToPay < totalPaymentsMade) {
        setEditAmountError(
          `Cannot reduce total amount below total payments made (${formatCurrency(totalPaymentsMade)}).`
        );
        setToastMessage(`Cannot reduce debt amount: ${editAmountError}`);
        setToastType('error');
        setShowToast(true);
        return;
      }
    }
    
    // Validar balance para Lent antes de crear
    if (formData.type === 'lent' && formData.originalAmount > realAvailableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(realAvailableBalance)}`);
      setToastMessage(`Cannot create loan: ${balanceError}`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    const category = getOrCreateCategory(formData.type);

    if (editingDebt) {
      updateDebt(editingDebt.id, {
        type: formData.type,
        creditorName: formData.creditorName,
        walletId: formData.walletId,
        categoryId: category.id,
        originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment,
        interestRate: formData.interestRate,
        interestType: formData.interestType,
        termMonths: formData.termMonths,
        startDate: formData.startDate,
        notes: formData.notes,
        realAmountToPay: realAmountToPay,
        realInterests: realInterests,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
      });
      setToastMessage('Debt updated successfully');
      setToastType('success');
    } else {
      addDebt({
        type: formData.type,
        creditorName: formData.creditorName,
        walletId: formData.walletId,
        categoryId: category.id,
        originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment,
        interestRate: formData.interestRate,
        interestType: formData.interestType,
        termMonths: formData.termMonths,
        startDate: formData.startDate,
        notes: formData.notes,
        status: 'active',
        nextDueDate: formData.startDate,
        realAmountToPay: realAmountToPay,
        realInterests: realInterests,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
      });
      
      setToastMessage('Debt created successfully');
      setToastType('success');
    }
    
    setShowToast(true);
    resetForm();
    setShowModal(false);
  };

  // Calcular si el formulario es válido
  const isFormValid = () => {
    return !(
      !!balanceError || 
      !!editAmountError ||
      !!realAmountError ||
      noWalletsMessage || 
      !formData.walletId ||
      !formData.creditorName.trim() ||
      formData.originalAmount <= 0 ||
      formData.monthlyPayment <= 0 ||
      formData.termMonths <= 0 ||
      !formData.startDate ||
      realAmountToPay < formData.originalAmount ||
      (editingDebt && formData.originalAmount < totalPaymentsMade)
    );
  };

  // Función para ejecutar la actualización que completa la deuda
  const executeEditComplete = () => {
    if (!pendingEditData || !editingDebt) return;
    
    const category = getOrCreateCategory(pendingEditData.type);
    
    updateDebt(editingDebt.id, {
      type: pendingEditData.type,
      creditorName: pendingEditData.creditorName,
      walletId: pendingEditData.walletId,
      categoryId: category.id,
      originalAmount: pendingEditData.originalAmount,
      monthlyPayment: pendingEditData.monthlyPayment,
      interestRate: pendingEditData.interestRate,
      interestType: pendingEditData.interestType,
      termMonths: pendingEditData.termMonths,
      startDate: pendingEditData.startDate,
      notes: pendingEditData.notes,
      status: 'paid',
    });
    
    // Mostrar confeti
    setShowConfetti(true);
    
    setToastMessage(`🎉🎉🎉 Debt "${editingDebt.creditorName}" COMPLETED! 🎉🎉🎉`);
    setToastType('success');
    setShowToast(true);
    
    setPendingEditData(null);
    setShowCompleteFromEditConfirm(false);
    resetForm();
    setShowModal(false);
    
    // Ocultar confeti después de 3 segundos
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  };


  const resetForm = () => {
    setFormData({
      type: 'borrowed',
      creditorName: '',
      walletId: '',
      originalAmount: 0,
      monthlyPayment: 0,
      interestRate: 0,
      interestType: 'fixed',
      termMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setInterestRateInput('');
    setRealAmountToPay(0);
    setRealInterests(0);
    setRealAmountError(null);
    setVariableInterests([]);
    isAutoCalculatingRef.current = false;
    setErrors({
      creditorName: '',
      walletId: '',
      originalAmount: '',
      monthlyPayment: '',
      termMonths: '',
      startDate: '',
      type: '',
    });
    setBalanceError(null);
    setEditAmountError(null);
    setEditingDebt(null);
  };

  const handleEdit = (debt: any) => {
    setEditingDebt(debt);
    setFormData({
      type: debt.type,
      creditorName: debt.creditorName,
      walletId: debt.walletId,
      originalAmount: debt.originalAmount,
      monthlyPayment: debt.monthlyPayment,
      interestRate: debt.interestRate,
      interestType: debt.interestType,
      termMonths: debt.termMonths,
      startDate: debt.startDate,
      notes: debt.notes || '',
    });
    setInterestRateInput(debt.interestRate.toString());
    setRealAmountToPay(debt.realAmountToPay || debt.monthlyPayment * debt.termMonths);
    setRealInterests(debt.realInterests || (debt.realAmountToPay - debt.originalAmount));
    setRealAmountError(null);
    setVariableInterests(debt.variableInterests || []);
    isAutoCalculatingRef.current = false;
    setBalanceError(null);
    setShowModal(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDebtToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (debtToDelete) {
      deleteDebt(debtToDelete);
      setToastMessage('Debt deleted successfully');
      setToastType('success');
      setShowToast(true);
      setDebtToDelete(null);
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
    }
  };

  const handleOpenDetail = (debt: any) => {
    setSelectedDebtId(debt.id);
    setShowDetailModal(true);
  };

  const borrowedDebts = debts.filter(d => d.type === 'borrowed' && d.status === 'active');
  const lentDebts = debts.filter(d => d.type === 'lent' && d.status === 'active');
  const completedDebts = debts.filter(d => d.status === 'paid');

  const totalBorrowed = borrowedDebts.reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalLent = lentDebts.reduce((sum, d) => sum + d.remainingBalance, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">Debts</h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage your loans and borrowings</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg">
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-xs text-white/40">I OWE</span>
          </div>
          <p className="text-2xl font-light text-red-500">{formatCurrency(totalBorrowed)}</p>
          <p className="text-[10px] text-white/30 mt-1">{borrowedDebts.length} active debts</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-xs text-white/40">OWED TO ME</span>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(totalLent)}</p>
          <p className="text-[10px] text-white/30 mt-1">{lentDebts.length} active debts</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="w-5 h-5 text-[#6366F1]" />
            <span className="text-xs text-white/40">NET POSITION</span>
          </div>
          <p className={`text-2xl font-light ${totalLent - totalBorrowed >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalLent - totalBorrowed >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalLent - totalBorrowed))}
          </p>
          <p className="text-[10px] text-white/30 mt-1">What I'm owed - What I owe</p>
        </div>
      </div>

      {/* Borrowed Debts */}
      {borrowedDebts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Debts I Owe
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {borrowedDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} />
            ))}
          </div>
        </div>
      )}

      {/* Lent Debts */}
      {lentDebts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Debts Owed to Me
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lentDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Debts */}
      {completedDebts.length > 0 && (
        <div>
          <h2 className="text-sm font-light text-white/40 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} isCompleted />
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/40 text-sm font-light">No debts recorded</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light">Add Your First Debt</button>
        </div>
      )}

      {/* Modal para agregar/editar debt */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-light text-white">{editingDebt ? 'Edit Debt' : 'New Debt'}</h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">
                    {editingDebt ? 'Update your debt details' : 'Record a new debt or loan'}
                  </p>
                </div>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Debt Type */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Debt Type *</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (!editingDebt) {
                          setFormData({ ...formData, type: 'borrowed' });
                          setErrors(prev => ({ ...prev, type: '' }));
                        }
                      }} 
                      disabled={!!editingDebt && editingDebt.type !== 'borrowed'}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                        formData.type === 'borrowed' 
                          ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                          : editingDebt && editingDebt.type !== 'borrowed'
                            ? 'bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" /> I Owe
                    </button>
                    <button 
                      onClick={() => {
                        if (!editingDebt) {
                          setFormData({ ...formData, type: 'lent' });
                          setErrors(prev => ({ ...prev, type: '' }));
                        }
                      }} 
                      disabled={!!editingDebt && editingDebt.type !== 'lent'}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                        formData.type === 'lent' 
                          ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                          : editingDebt && editingDebt.type !== 'lent'
                            ? 'bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" /> Owed to Me
                    </button>
                  </div>
                  {editingDebt && (
                    <p className="text-[9px] text-amber-500/60 font-light mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Debt type cannot be changed while editing
                    </p>
                  )}
                </div>

                {/* Creditor/Borrower Name */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">
                    {formData.type === 'borrowed' ? 'Lender Name' : 'Borrower Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.creditorName}
                    onChange={(e) => {
                      setFormData({ ...formData, creditorName: e.target.value });
                      if (e.target.value.trim()) {
                        setErrors(prev => ({ ...prev, creditorName: '' }));
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                      errors.creditorName ? 'border-red-500/50' : 'border-white/10'
                    }`}
                    placeholder={formData.type === 'borrowed' ? 'Bank, Friend, Family...' : 'Person who owes you...'}
                  />
                  {errors.creditorName && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500/80" />
                      <p className="text-[10px] text-red-500/80">{errors.creditorName}</p>
                    </div>
                  )}
                </div>

                {/* Wallet */}
                <div>
                  <CustomSelect
                    label="Wallet"
                    value={formData.walletId}
                    onChange={(value) => {
                      setFormData({ ...formData, walletId: value });
                      if (value) {
                        setErrors(prev => ({ ...prev, walletId: '' }));
                      }
                    }}
                    options={walletOptions}
                    placeholder={noWalletsMessage ? "No wallets available" : "Select a wallet"}
                    required
                    error={errors.walletId}
                  />
                  {noWalletsMessage && (
                    <div className="mt-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <p className="text-xs text-amber-500/80 flex items-center gap-2 flex-wrap">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>You don't have any wallets yet.</span>
                        <button
                          onClick={handleCreateWallet}
                          className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors font-medium underline-offset-2 hover:underline"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Create wallet
                        </button>
                      </p>
                    </div>
                  )}
                  {formData.walletId && selectedWallet && !noWalletsMessage && (
                    <p className={`text-[10px] mt-1 font-light ${formData.type === 'lent' && formData.originalAmount > realAvailableBalance ? 'text-red-500/80' : 'text-white/40'}`}>
                      Available balance: {formatCurrency(realAvailableBalance)}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <NumberInput
                  label="Amount"
                  value={formData.originalAmount}
                  onChange={(value) => {
                    setFormData({ ...formData, originalAmount: value });
                    if (value > 0) {
                      setErrors(prev => ({ ...prev, originalAmount: '' }));
                    }
                  }}
                  placeholder="0"
                  min={editingDebt ? totalPaymentsMade : 1}
                  max={editingDebt && formData.type === 'lent' ? realAvailableBalance + totalPaymentsMade : undefined}
                  required
                  showPreview
                  previewLabel="Amount"
                  error={errors.originalAmount || editAmountError}
                />

                {editAmountError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <div className="flex-1">
                      <p className="text-xs text-red-500/80">{editAmountError}</p>
                      {editingDebt && totalPaymentsMade > 0 && (
                        <p className="text-[9px] text-red-500/60 mt-1">
                          You have made {formatCurrency(totalPaymentsMade)} in payments already.
                          The debt amount cannot be less than this.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Balance Error Warning */}
                {balanceError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-red-500/80">{balanceError}</p>
                  </div>
                )}

                {/* Monthly Payment */}
                <NumberInput
                  label="Monthly Payment"
                  value={formData.monthlyPayment}
                  onChange={handleMonthlyPaymentChange}
                  placeholder="0"
                  min={1}
                  required
                  showPreview
                  previewLabel="Monthly payment"
                  error={errors.monthlyPayment}
                />

                {/* Payment Validation Error */}
                {paymentValidationError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-red-500/80">{paymentValidationError}</p>
                  </div>
                )}

                {/* Interest Rate & Type */}
                <div className="space-y-3">
                  {/* Interest Rate */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">
                      Interest Rate (%)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={interestRateInput}
                        onChange={(e) => {
                          let value = e.target.value;
                          
                          if (value === '') {
                            setInterestRateInput('');
                            if (formData.interestType === 'fixed') {
                              setFormData({ ...formData, interestRate: 0 });
                            } else {
                              const newInterests = [...variableInterests];
                              if (newInterests[selectedVariableMonth - 1]) {
                                newInterests[selectedVariableMonth - 1].rate = 0;
                                setVariableInterests(newInterests);
                              }
                            }
                            return;
                          }
                          
                          let normalizedValue = value.replace(',', '.');
                          const regex = /^\d*\.?\d{0,3}$/;
                          if (!regex.test(normalizedValue)) return;
                          
                          const parts = normalizedValue.split('.');
                          const integerPart = parts[0];
                          if (integerPart.length > 2) return;
                          
                          const numValue = parseFloat(normalizedValue);
                          if (isNaN(numValue)) return;
                          if (numValue > 99.999) return;
                          
                          const displayValue = normalizedValue.replace('.', ',');
                          setInterestRateInput(displayValue);
                          
                          if (formData.interestType === 'fixed') {
                            setFormData({ ...formData, interestRate: numValue });
                            if (variableInterests.length > 0) {
                              const updatedInterests = variableInterests.map(i => ({ ...i, rate: numValue }));
                              setVariableInterests(updatedInterests);
                            }
                          } else {
                            const newInterests = [...variableInterests];
                            if (newInterests[selectedVariableMonth - 1]) {
                              newInterests[selectedVariableMonth - 1].rate = numValue;
                              setVariableInterests(newInterests);
                              const avgRate = newInterests.reduce((sum, i) => sum + i.rate, 0) / newInterests.length;
                              setFormData(prev => ({ ...prev, interestRate: avgRate }));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          let value = e.target.value;
                          if (value === '' || value === '-') {
                            setInterestRateInput('');
                            if (formData.interestType === 'fixed') {
                              setFormData({ ...formData, interestRate: 0 });
                            }
                            return;
                          }
                          
                          let normalizedValue = value.replace(',', '.');
                          let numValue = parseFloat(normalizedValue);
                          if (!isNaN(numValue)) {
                            if (numValue > 99.999) {
                              numValue = 99.999;
                            }
                            if (numValue < 0) {
                              numValue = 0;
                            }
                            const formattedValue = numValue.toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
                            setInterestRateInput(formattedValue);
                            
                            if (formData.interestType === 'fixed') {
                              setFormData({ ...formData, interestRate: numValue });
                            } else {
                              const newInterests = [...variableInterests];
                              if (newInterests[selectedVariableMonth - 1]) {
                                newInterests[selectedVariableMonth - 1].rate = numValue;
                                setVariableInterests(newInterests);
                                const avgRate = newInterests.reduce((sum, i) => sum + i.rate, 0) / newInterests.length;
                                setFormData(prev => ({ ...prev, interestRate: avgRate }));
                              }
                            }
                          }
                        }}
                        min="0"
                        max="99.999"
                        className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                        placeholder="0"
                      />
                      {/* CustomSelect para meses - SOLO cuando es variable */}
                      {formData.interestType === 'variable' && (
                        <div className="w-32">
                          <CustomSelect
                            value={String(selectedVariableMonth)}
                            onChange={(value) => {
                              const newMonth = parseInt(value);
                              setSelectedVariableMonth(newMonth);
                              const currentRate = variableInterests[newMonth - 1]?.rate || 0;
                              setInterestRateInput(currentRate === 0 ? '' : currentRate.toString().replace('.', ','));
                            }}
                            options={monthOptions}
                            placeholder="Select month"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] text-white/20 font-light mt-1">
                      {formData.interestType === 'fixed' 
                        ? 'Max: 99,999% (2 digits left, 3 decimals right)'
                        : `Editing month ${selectedVariableMonth} of ${formData.termMonths}`}
                    </p>
                  </div>

                  {/* Interest Type */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">Interest Type</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          handleInterestTypeChange('fixed');
                          setSelectedVariableMonth(1);
                        }} 
                        className={`flex-1 py-2.5 rounded-lg text-xs font-light transition-all duration-200 ${
                          formData.interestType === 'fixed' 
                            ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' 
                            : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                        }`}
                      >
                        Fixed
                      </button>
                      <button 
                        onClick={() => {
                          handleInterestTypeChange('variable');
                          setSelectedVariableMonth(1);
                        }} 
                        className={`flex-1 py-2.5 rounded-lg text-xs font-light transition-all duration-200 ${
                          formData.interestType === 'variable' 
                            ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' 
                            : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                        }`}
                      >
                        Variable
                      </button>
                    </div>
                  </div>
                </div>

                {/* Term */}
                <NumberInput
                  label="Term (months)"
                  value={formData.termMonths}
                  onChange={handleTermMonthsChange}
                  placeholder="12"
                  min={1}
                  required
                  error={errors.termMonths}
                />

                {/* Start Date */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value });
                      if (e.target.value) {
                        setErrors(prev => ({ ...prev, startDate: '' }));
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors ${
                      errors.startDate ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  />
                  {errors.startDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500/80" />
                      <p className="text-[10px] text-red-500/80">{errors.startDate}</p>
                    </div>
                  )}
                </div>

                {/* Payment Summary */}
                {formData.originalAmount > 0 && formData.termMonths > 0 && formData.monthlyPayment > 0 && (
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-[10px] text-white/40 font-light mb-2">Payment Summary</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/40 font-light">Calculated Total ({formatCurrency(formData.monthlyPayment).replace('$', '')} * {formData.termMonths} ):</span>
                        <span className="text-white/60 font-light">{formatCurrency(formData.monthlyPayment * formData.termMonths)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40 font-light">Original Amount:</span>
                        <span className="text-white/60 font-light">{formatCurrency(formData.originalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40 font-light">Calculated Interest:</span>
                        <span className="text-yellow-500 font-light">{formatCurrency(realAmountToPay - formData.originalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real Amount to Pay - EDITABLE */}
                {(formData.monthlyPayment > 0 && formData.termMonths > 0) && (
                  <div>
                    <NumberInput
                      label="Real Amount to Pay *"
                      value={realAmountToPay}
                      onChange={handleRealAmountChange}
                      placeholder="0"
                      min={formData.originalAmount}
                      required
                      showPreview
                      previewLabel="Total to pay"
                      error={realAmountError}
                    />
                    {realAmountError && (
                      <p className="text-[8px] text-red-500/80 font-light mt-1 flex items-center gap-1">
                        ⚠️ {realAmountError}
                      </p>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors resize-none placeholder:text-white/20"
                    rows={2}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
            </div>
            
            {/* Footer - Sticky */}
            <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-white/10">
                <button 
                  onClick={() => { setShowModal(false); resetForm(); }} 
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!isFormValid()}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
                    !isFormValid()
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899]'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {editingDebt ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      

      {/* Debt Detail Modal */}
      <DebtDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDebtId(null);
        }}
        debtId={selectedDebtId}
        onEdit={() => {
          const debt = debts.find(d => d.id === selectedDebtId);
          if (debt) {
            setShowDetailModal(false);
            handleEdit(debt);
          }
        }}
        onDelete={() => {
          if (selectedDebtId) {
            handleDelete(selectedDebtId);
          }
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Debt"
        message="Are you sure you want to delete this debt? This action cannot be undone. All associated transactions will also be deleted."
        confirmText="Delete"
        type="danger"
      />
      
      <CompleteDebtConfirmModal
        isOpen={showCompleteFromEditConfirm}
        onClose={() => {
          setShowCompleteFromEditConfirm(false);
          setPendingEditData(null);
        }}
        onConfirm={executeEditComplete}
        debtName={editingDebt?.creditorName || ''}
        remainingAmount={totalPaymentsMade}
        type={editingDebt?.type || 'borrowed'}
        isFromEdit={true}
      />

      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
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

// Debt Card Component - Versión corregida
const DebtCard: React.FC<{ debt: any; onEdit: (debt: any) => void; onDelete: (id: string, e?: React.MouseEvent) => void; onClick: (debt: any) => void; isCompleted?: boolean }> = ({ debt, onEdit, onDelete, onClick, isCompleted }) => {
  const { wallets } = useStore();
  const wallet = wallets.find(w => w.id === debt.walletId);
  const getWalletIcon = (wallet: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-4 h-4" />,
      bank_account: <Building2 className="w-4 h-4" />,
      credit_card: <CreditCard className="w-4 h-4" />,
      debit_card: <CreditCard className="w-4 h-4" />,
      other: <Package className="w-4 h-4" />,
    };
    return iconMap[wallet?.type] || <WalletIcon className="w-4 h-4" />;
  };
  
  // Usar realAmountToPay para todo
  const totalToPay = debt.realAmountToPay || debt.originalAmount;
  const totalPaymentsMade = debt.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const remainingToPay = totalToPay - totalPaymentsMade;
  const progress = (totalPaymentsMade / totalToPay) * 100;
  
  const isBorrowed = debt.type === 'borrowed';
  const remainingColor = isBorrowed ? 'text-red-500' : 'text-green-500';
  const progressBarColor = isBorrowed ? 'from-red-500 to-rose-600' : 'from-green-500 to-emerald-600';

  return (
    <div onClick={() => onClick(debt)} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBorrowed ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {isBorrowed ? <TrendingDown className="w-5 h-5 text-red-500" /> : <TrendingUp className="w-5 h-5 text-green-500" />}
          </div>
          <div>
            <h3 className="text-sm font-light text-white">{debt.creditorName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                {wallet && getWalletIcon(wallet)}
                <span>{wallet?.name}</span>
              </span>
            </div>
          </div>
        </div>
        {!isCompleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => onDelete(debt.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Remaining</span>
          <span className={remainingColor}>{formatCurrency(remainingToPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Total to Pay</span>
          <span className="text-white/60">{formatCurrency(totalToPay)}</span>
        </div>
        {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
          <div className="flex justify-between text-[9px]">
            <span className="text-white/30">Original Amount</span>
            <span className="text-white/30 line-through">{formatCurrency(debt.originalAmount)}</span>
          </div>
        )}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-white/40">Progress</span>
            <span className="text-white/40">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-green-500/80">Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};


export default Debts;