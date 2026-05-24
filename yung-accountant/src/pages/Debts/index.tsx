// pages/Debts/index.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, DollarSign, Building2, CreditCard, Package, WalletIcon } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import { useDebtStore, useWalletStore, useCategoryStore, useTransactionStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import DebtDetailModal from './DebtDetailModal';
import CompleteDebtConfirmModal from '../../components/modals/CompleteDebtConfirmModal';
import ConfettiEffect from '../../components/common/ConfettiEffect';
import { DebtCard } from './DebtCard';
import { DebtFormModal } from './DebtFormModal';
import { useDebtForm } from './useDebtForm';
import { useNavigate } from 'react-router-dom';

const Debts: React.FC = () => {
  const navigate = useNavigate();
  const { getGradientTextClass } = useThemeStyles();
  const { debts, deleteDebt, addDebt, updateDebt, isLoading: isDebtsLoading, fetchDebts } = useDebtStore();
  const { wallets, isLoading: isWalletsLoading, fetchWallets } = useWalletStore();
  const { categories, isLoading: isCategoriesLoading, fetchAllCategories } = useCategoryStore();

  const debtsFetchedRef = useRef(false);
  const walletsFetchedRef = useRef(false);
  const categoriesFetchedRef = useRef(false);

  useEffect(() => {
    if (!debtsFetchedRef.current && debts.length === 0 && !isDebtsLoading) {
      debtsFetchedRef.current = true;
      fetchDebts();
    }
    if (!walletsFetchedRef.current && debts.length === 0 && !isWalletsLoading) {
      walletsFetchedRef.current = true;
      fetchWallets();
    }
    if (!categoriesFetchedRef.current && debts.length === 0 && !isCategoriesLoading) {
      categoriesFetchedRef.current = true;
      fetchAllCategories();
    }
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompleteFromEditConfirm, setShowCompleteFromEditConfirm] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);

  const getWalletIconComponent = (wallet: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-4 h-4" />,
      bank_account: <Building2 className="w-4 h-4" />,
      credit_card: <CreditCard className="w-4 h-4" />,
      debit_card: <CreditCard className="w-4 h-4" />,
      other: <Package className="w-4 h-4" />,
    };
    return iconMap[wallet.type] || <WalletIcon className="w-4 h-4" />;
  };

  const walletOptions = wallets
    .filter(w => w.isActive)
    .map(w => ({
      id: w.id,
      label: `${w.name}${w.lastFourDigits ? ` (****${w.lastFourDigits})` : ''}`,
      icon: getWalletIconComponent(w),
      color: w.color,
    }));

  const totalPaymentsMade = useMemo(() => {
    if (!editingDebt) return 0;
    const payments = editingDebt.payments || [];
    return payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  }, [editingDebt]);

  const hasActiveWallets = wallets.some(w => w.isActive);
  const noWalletsMessage = !hasActiveWallets && wallets.length === 0;

  const {
    formData, setFormData, errors, setErrors,
    realAmountToPay, setRealAmountError, realAmountError,
    setBalanceError, balanceError, paymentValidationError,
    setEditAmountError, editAmountError,
    interestRateInput, selectedVariableMonth, monthOptions,
    handleRealAmountChange, handleInterestTypeChange,
    handleMonthlyPaymentChange, handleTermMonthsChange,
    resetForm, setInterestRateInput, isFormValid,
    variableInterests, realAvailableBalance, selectedWallet
  } = useDebtForm({
    editingDebt,
    totalPaymentsMade,
    onSuccess: () => {
      setShowModal(false);
      resetForm();
      setEditingDebt(null);
    },
  });

  const getCategoryForDebt = (type: 'borrowed' | 'lent') => {
    const categoryName = type === 'borrowed' ? 'Borrow' : 'Lent';
    const categoryType: 'income' | 'expense' = type === 'borrowed' ? 'income' : 'expense';
    return categories.find(c => c.name === categoryName && c.type === categoryType);
  };

  const handleSubmit = async () => {
    if (!formData.creditorName.trim()) { setErrors(prev => ({ ...prev, creditorName: 'Name is required' })); return; }
    if (!formData.walletId) { setErrors(prev => ({ ...prev, walletId: 'Wallet is required' })); return; }
    if (formData.originalAmount <= 0) { setErrors(prev => ({ ...prev, originalAmount: 'Amount must be greater than 0' })); return; }
    if (realAmountToPay <= 0) { setToastMessage('Total amount to pay must be greater than 0'); setToastType('error'); setShowToast(true); return; }
    if (realAmountToPay < formData.originalAmount) {
      setRealAmountError(`Real amount cannot be less than the original amount (${formatCurrency(formData.originalAmount)})`);
      setToastMessage('Real amount cannot be less than the original amount'); setToastType('error'); setShowToast(true); return;
    }
    if (!isFormValid()) { setToastMessage('Please fix the errors before submitting'); setToastType('error'); setShowToast(true); return; }

    if (editingDebt) {
      const willComplete = realAmountToPay <= totalPaymentsMade;
      if (willComplete && realAmountToPay !== editingDebt.realAmountToPay) {
        setPendingEditData({
          type: formData.type, creditorName: formData.creditorName, walletId: formData.walletId,
          originalAmount: formData.originalAmount, monthlyPayment: formData.monthlyPayment,
          interestRate: formData.interestRate, interestType: formData.interestType,
          termMonths: formData.termMonths, startDate: formData.startDate, notes: formData.notes,
          realAmountToPay: realAmountToPay,
          variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
          willComplete: true,
        });
        setShowCompleteFromEditConfirm(true);
        return;
      }
      if (realAmountToPay < totalPaymentsMade) {
        setEditAmountError(`Cannot reduce total amount below total payments made (${formatCurrency(totalPaymentsMade)}).`);
        setToastMessage(`Cannot reduce debt amount: ${editAmountError}`); setToastType('error'); setShowToast(true); return;
      }
    }
    
    if (formData.type === 'lent' && formData.originalAmount > realAvailableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(realAvailableBalance)}`);
      setToastMessage(`Cannot create loan: ${balanceError}`); setToastType('error'); setShowToast(true); return;
    }

    const category = getCategoryForDebt(formData.type);

    if (editingDebt) {
      await updateDebt(editingDebt.id, {
        type: formData.type, creditorName: formData.creditorName, walletId: formData.walletId,
        categoryId: category?.id, originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment, interestRate: formData.interestRate,
        interestType: formData.interestType, termMonths: formData.termMonths,
        startDate: formData.startDate, notes: formData.notes, realAmountToPay: realAmountToPay,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
      });
      setToastMessage('Debt updated successfully'); setToastType('success');
    } else {
      await addDebt({
        type: formData.type, creditorName: formData.creditorName, walletId: formData.walletId,
        categoryId: category?.id || '', originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment, interestRate: formData.interestRate,
        interestType: formData.interestType, termMonths: formData.termMonths,
        startDate: formData.startDate, notes: formData.notes, realAmountToPay: realAmountToPay,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
        nextDueDate: '', realInterests: 0
      });
      const { fetchWallets } = useWalletStore.getState();
      const { fetchTransactions } = useTransactionStore.getState();
      const { fetchDebts } = useDebtStore.getState();
      fetchWallets(true); fetchTransactions(true); fetchDebts(true);
      setToastMessage('Debt created successfully'); setToastType('success');
    }
    
    setShowToast(true); resetForm(); setShowModal(false);
  };

  const executeEditComplete = async () => {
    if (!pendingEditData || !editingDebt) return;
    const category = getCategoryForDebt(pendingEditData.type);
    await updateDebt(editingDebt.id, {
      type: pendingEditData.type, creditorName: pendingEditData.creditorName,
      walletId: pendingEditData.walletId, categoryId: category?.id,
      originalAmount: pendingEditData.originalAmount, monthlyPayment: pendingEditData.monthlyPayment,
      interestRate: pendingEditData.interestRate, interestType: pendingEditData.interestType,
      termMonths: pendingEditData.termMonths, startDate: pendingEditData.startDate,
      notes: pendingEditData.notes, status: 'paid',
    });
    const { fetchWallets } = useWalletStore.getState();
    const { fetchTransactions } = useTransactionStore.getState();
    const { fetchDebts } = useDebtStore.getState();
    fetchWallets(true); fetchTransactions(true); fetchDebts(true);
    setShowConfetti(true);
    setToastMessage(`Debt "${editingDebt.creditorName}" COMPLETED!`); setToastType('success'); setShowToast(true);
    setPendingEditData(null); setShowCompleteFromEditConfirm(false); resetForm(); setShowModal(false);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleEdit = (debt: any) => {
    setEditingDebt(debt);
    setFormData({
      type: debt.type, creditorName: debt.creditorName, walletId: debt.walletId,
      originalAmount: debt.originalAmount, monthlyPayment: debt.monthlyPayment,
      interestRate: debt.interestRate, interestType: debt.interestType,
      termMonths: debt.termMonths, startDate: debt.startDate, notes: debt.notes || '',
    });
    setInterestRateInput(debt.interestRate?.toString() || '0');
    setShowModal(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    const hasPayments = debt.payments && debt.payments.length > 0;
    if (debt.status === 'active' && hasPayments) {
      setToastMessage(`Cannot delete "${debt.creditorName}". You must delete all ${debt.payments?.length} payment(s) first.`);
      setToastType('warning'); setShowToast(true); return;
    }
    setDebtToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (debtToDelete) {
      await deleteDebt(debtToDelete);
      const { fetchWallets } = useWalletStore.getState();
      const { fetchTransactions } = useTransactionStore.getState();
      const { fetchDebts } = useDebtStore.getState();
      fetchWallets(true); fetchTransactions(true); fetchDebts(true);
      setToastMessage('Debt deleted successfully'); setToastType('success'); setShowToast(true);
      setDebtToDelete(null); setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleOpenDetail = (debt: any) => { setSelectedDebtId(debt.id); setShowDetailModal(true); };

  const borrowedDebts = debts.filter(d => d.type === 'borrowed' && d.status === 'active');
  const lentDebts = debts.filter(d => d.type === 'lent' && d.status === 'active');
  const completedDebts = debts.filter(d => d.status === 'paid');

  const totalBorrowed = borrowedDebts.reduce((sum, d) => sum + (d.realAmountToPay || 0), 0);
  const totalLent = lentDebts.reduce((sum, d) => sum + (d.realAmountToPay || 0), 0);

  const handleCreateWallet = () => { setShowModal(false); navigate('/wallets'); };

  const statCards = [
    {
      icon: <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={1.5} />,
      label: 'I Owe',
      value: formatCurrency(totalBorrowed),
      sublabel: `${borrowedDebts.length} active debts`,
      color: '#EF4444',
      delay: 0,
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} strokeWidth={1.5} />,
      label: 'Owed to Me',
      value: formatCurrency(totalLent),
      sublabel: `${lentDebts.length} active debts`,
      color: '#10B981',
      delay: 100,
    },
    {
      icon: <ArrowLeftRight className="w-5 h-5" style={{ color: '#8B5CF6' }} strokeWidth={1.5} />,
      label: 'Net Position',
      value: `${totalLent - totalBorrowed >= 0 ? '+' : '-'}${formatCurrency(Math.abs(totalLent - totalBorrowed))}`,
      sublabel: 'Balance of debts',
      color: '#8B5CF6',
      delay: 200,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            Debts
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Manage your loans and borrowings
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingDebt(null); setShowModal(true); }} 
          className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 20px -6px var(--theme-primary)' }}
        >
          <Plus className="w-4 h-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.5} />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {statCards.map((stat, i) => (
          <div 
            key={i}
            className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
            style={{ animationDelay: `${stat.delay}ms` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                style={{ backgroundColor: `${stat.color}14`, boxShadow: `0 4px 12px -4px ${stat.color}15` }}
              >
                {stat.icon}
              </div>
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                {stat.label}
              </span>
            </div>
            <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>
              {stat.value}
            </p>
            <p className="text-[11px] mt-1 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
              {stat.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* Borrowed Debts */}
      {borrowedDebts.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-secondary)' }}>
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <TrendingDown className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={1.5} />
            </div>
            Debts I Owe
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {borrowedDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} />
            ))}
          </div>
        </div>
      )}

      {/* Lent Debts */}
      {lentDebts.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-secondary)' }}>
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} strokeWidth={1.5} />
            </div>
            Debts Owed to Me
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lentDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Debts */}
      {completedDebts.length > 0 && (
        <div>
          <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-tertiary)' }}>
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            </div>
            Completed
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {completedDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} onDelete={handleDelete} onClick={handleOpenDetail} isCompleted />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {debts.length === 0 && (
        <div className="rounded-[2.5rem] p-16 text-center glass-aero animate-fade-in-up">
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
            <ArrowLeftRight className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1} />
          </div>
          <p className="text-[18px] font-light tracking-[-0.02em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>No debts recorded</p>
          <p className="text-[14px] tracking-[0.03em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>
            Start tracking your loans and borrowings
          </p>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-7 py-3.5 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 24px -6px var(--theme-primary)' }}
          >
            Add Your First Debt
          </button>
        </div>
      )}

      {/* Modals */}
      <DebtFormModal
        isOpen={showModal}
        editingDebt={editingDebt}
        formData={formData}
        setFormData={setFormData}
        setInterestRateInput={setInterestRateInput}
        errors={errors}
        realAmountToPay={realAmountToPay}
        realAmountError={realAmountError}
        balanceError={balanceError}
        paymentValidationError={paymentValidationError}
        editAmountError={editAmountError}
        interestRateInput={interestRateInput}
        selectedVariableMonth={selectedVariableMonth}
        monthOptions={monthOptions}
        walletOptions={walletOptions}
        selectedWallet={selectedWallet}
        realAvailableBalance={realAvailableBalance}
        totalPaymentsMade={totalPaymentsMade}
        noWalletsMessage={noWalletsMessage}
        hasActiveWallets={hasActiveWallets}
        onClose={() => { setShowModal(false); resetForm(); setEditingDebt(null); }}
        onSubmit={handleSubmit}
        onInterestTypeChange={handleInterestTypeChange}
        onMonthlyPaymentChange={handleMonthlyPaymentChange}
        onTermMonthsChange={handleTermMonthsChange}
        onRealAmountChange={handleRealAmountChange}
        onWalletChange={(value) => setFormData({ ...formData, walletId: value })}
        onCreateWallet={handleCreateWallet}
      />

      <DebtDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedDebtId(null); }}
        debtId={selectedDebtId}
        onEdit={() => { const debt = debts.find(d => d.id === selectedDebtId); if (debt) { setShowDetailModal(false); handleEdit(debt); } }}
        onDelete={() => { if (selectedDebtId) handleDelete(selectedDebtId); }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Debt"
        message={debts.find(d => d.id === debtToDelete)?.status === 'paid'
          ? 'Are you sure you want to delete this completed debt? ALL associated transactions and payments will be permanently deleted.'
          : 'Are you sure you want to delete this debt? This action cannot be undone.'}
        confirmText={debts.find(d => d.id === debtToDelete)?.status === 'paid' ? 'Delete Everything' : 'Delete'}
        type="danger"
      />

      <CompleteDebtConfirmModal
        isOpen={showCompleteFromEditConfirm}
        onClose={() => { setShowCompleteFromEditConfirm(false); setPendingEditData(null); }}
        onConfirm={executeEditComplete}
        debtName={editingDebt?.creditorName || ''}
        remainingAmount={totalPaymentsMade}
        type={editingDebt?.type || 'borrowed'}
        isFromEdit={true}
      />

      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default Debts;