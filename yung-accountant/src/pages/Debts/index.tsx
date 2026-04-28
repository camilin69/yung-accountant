// pages/Debts/index.tsx
import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, DollarSign, Building2, CreditCard, Package, WalletIcon } from 'lucide-react';
import { useDebtStore, useWalletStore, useCategoryStore, useUserStore } from '../../store';
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

// IDs fijos para las categorías
const BORROW_CATEGORY_ID = 'borrow-category';
const LENT_CATEGORY_ID = 'lent-category';

const Debts: React.FC = () => {
  const navigate = useNavigate();
  const { debts, deleteDebt, addDebt, updateDebt } = useDebtStore();
  const { wallets } = useWalletStore();
  const { categories, addCategory } = useCategoryStore();
  const { user } = useUserStore();

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
    formData,
    setFormData,
    errors,
    setErrors,
    realAmountToPay,
    setRealAmountError,
    realAmountError,
    setBalanceError,
    balanceError,
    paymentValidationError,
    setEditAmountError,
    editAmountError,
    interestRateInput,
    selectedVariableMonth,
    monthOptions,
    handleRealAmountChange,
    handleInterestTypeChange,
    handleMonthlyPaymentChange,
    handleTermMonthsChange,
    resetForm,
    setInterestRateInput,
    isFormValid,
    variableInterests,
    realAvailableBalance,
    selectedWallet
  } = useDebtForm({
    editingDebt,
    totalPaymentsMade,
    onSuccess: () => {
      setShowModal(false);
      resetForm();
      setEditingDebt(null);
    },
  });

  // Obtener o crear categoría Borrow/Lent
  const getOrCreateCategory = (type: 'borrowed' | 'lent') => {
    const categoryName = type === 'borrowed' ? 'Borrow' : 'Lent';
    const categoryType: 'income' | 'expense' = type === 'borrowed' ? 'income' : 'expense';
    const categoryIcon = type === 'borrowed' ? '💰' : '💸';
    const categoryColor = type === 'borrowed' ? '#10B981' : '#EF4444';
    
    let category = categories.find(c => c.name === categoryName && c.type === categoryType);
    
    if (!category && user?.id) {
      const newCategory = {
        id: type === 'borrowed' ? BORROW_CATEGORY_ID : LENT_CATEGORY_ID,
        name: categoryName,
        type: categoryType,
        icon: categoryIcon,
        color: categoryColor,
        isDefault: true,
      };
      addCategory(newCategory, user.id);
      category = categories.find(c => c.id === newCategory.id) || { ...newCategory, userId: user.id, createdAt: new Date().toISOString() };
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

    // Validar que el formulario sea válido
    if (!isFormValid()) {
      setToastMessage('Please fix the errors before submitting');
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
        categoryId: category?.id,
        originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment,
        interestRate: formData.interestRate,
        interestType: formData.interestType,
        termMonths: formData.termMonths,
        startDate: formData.startDate,
        notes: formData.notes,
        realAmountToPay: realAmountToPay,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
      });
      setToastMessage('Debt updated successfully');
      setToastType('success');
    } else {
      addDebt({
        type: formData.type,
        creditorName: formData.creditorName,
        walletId: formData.walletId,
        categoryId: category?.id || '',
        originalAmount: formData.originalAmount,
        monthlyPayment: formData.monthlyPayment,
        interestRate: formData.interestRate,
        interestType: formData.interestType,
        termMonths: formData.termMonths,
        startDate: formData.startDate,
        notes: formData.notes,
        status: 'active',
        realAmountToPay: realAmountToPay,
        variableInterests: formData.interestType === 'variable' ? variableInterests : undefined,
        nextDueDate: '',
        realInterests: 0
      });
      
      setToastMessage('Debt created successfully');
      setToastType('success');
    }
    
    setShowToast(true);
    resetForm();
    setShowModal(false);
  };

  // Función para ejecutar la actualización que completa la deuda
  const executeEditComplete = () => {
    if (!pendingEditData || !editingDebt) return;
    
    const category = getOrCreateCategory(pendingEditData.type);
    
    updateDebt(editingDebt.id, {
      type: pendingEditData.type,
      creditorName: pendingEditData.creditorName,
      walletId: pendingEditData.walletId,
      categoryId: category?.id,
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
    setInterestRateInput(debt.interestRate?.toString() || '0');
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
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleOpenDetail = (debt: any) => {
    setSelectedDebtId(debt.id);
    setShowDetailModal(true);
  };

  const borrowedDebts = debts.filter(d => d.type === 'borrowed' && d.status === 'active');
  const lentDebts = debts.filter(d => d.type === 'lent' && d.status === 'active');
  const completedDebts = debts.filter(d => d.status === 'paid');

  const totalBorrowed = borrowedDebts.reduce((sum, d) => sum + (d.realAmountToPay || 0), 0);
  const totalLent = lentDebts.reduce((sum, d) => sum + (d.realAmountToPay || 0), 0);

  const handleCreateWallet = () => {
    setShowModal(false);
    navigate('/wallets');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">Debts</h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage your loans and borrowings</p>
        </div>
        <button onClick={() => { resetForm(); setEditingDebt(null); setShowModal(true); }} className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg">
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <TrendingDown className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-light text-red-500">{formatCurrency(totalBorrowed)}</p>
          <p className="text-[10px] text-white/30 mt-1">{borrowedDebts.length} active debts</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-light text-green-500">{formatCurrency(totalLent)}</p>
          <p className="text-[10px] text-white/30 mt-1">{lentDebts.length} active debts</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-5 border border-gray-800">
          <ArrowLeftRight className="w-5 h-5 text-[#6366F1] mb-2" />
          <p className={`text-2xl font-light ${totalLent - totalBorrowed >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalLent - totalBorrowed >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalLent - totalBorrowed))}
          </p>
        </div>
      </div>

      {/* Borrowed Debts */}
      {borrowedDebts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-light text-white/60 mb-4">Debts I Owe</h2>
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
          <h2 className="text-sm font-light text-white/60 mb-4">Debts Owed to Me</h2>
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
          <h2 className="text-sm font-light text-white/40 mb-4">Completed</h2>
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

      {/* Debt Form Modal */}
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

      {/* Debt Detail Modal */}
      <DebtDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedDebtId(null); }}
        debtId={selectedDebtId}
        onEdit={() => {
          const debt = debts.find(d => d.id === selectedDebtId);
          if (debt) {
            setShowDetailModal(false);
            handleEdit(debt);
          }
        }}
        onDelete={() => { if (selectedDebtId) handleDelete(selectedDebtId); }}
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
      
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Debts;