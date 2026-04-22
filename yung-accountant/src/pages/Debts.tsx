// pages/Debts.tsx - agregar validación dinámica en el modal de creación/edición

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { Plus, Trash2, Edit2, X, Save, TrendingUp, TrendingDown, ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';
import CustomSelect from '../components/common/CustomSelect';
import NumberInput from '../components/common/NumberInput';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import DebtDetailModal from '../components/modals/DebtDetailModal';

// IDs fijos para las categorías
const BORROW_CATEGORY_ID = 'borrow-category';
const LENT_CATEGORY_ID = 'lent-category';

const Debts: React.FC = () => {
  const { debts, wallets, categories, addDebt, updateDebt, deleteDebt, updateWalletBalance, addCategory } = useStore();
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
  });

  // Obtener la wallet seleccionada y su balance
  const selectedWallet = wallets.find(w => w.id === formData.walletId);
  const currentWalletBalance = selectedWallet?.currentBalance || 0;

  // Calcular el balance real disponible (sin contar la deuda actual si es borrowed)
  let realAvailableBalance = currentWalletBalance;

  // Si estamos editando una deuda existente de tipo 'borrowed', restar su monto
  if (editingDebt && editingDebt.type === 'borrowed' && editingDebt.walletId === formData.walletId) {
    realAvailableBalance -= editingDebt.originalAmount;
  }

  // Validación dinámica para Lent (préstamo que hago)
  useEffect(() => {
    if (formData.type === 'lent' && formData.originalAmount > 0 && formData.walletId) {
      let requiredAmount = formData.originalAmount;
      
      // Si estamos editando, calcular la diferencia neta
      if (editingDebt) {
        if (editingDebt.type === 'borrowed') {
          // Cambiando de Borrowed a Lent: necesitamos el monto TOTAL del préstamo
          requiredAmount = formData.originalAmount;
        } else if (editingDebt.type === 'lent') {
          // Editando un Lent existente: solo necesitamos el incremento
          const increase = formData.originalAmount - editingDebt.originalAmount;
          if (increase > 0) {
            requiredAmount = increase;
          } else {
            // Si es decremento, no hay problema de balance
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

  const walletOptions = wallets
    .filter(w => w.isActive)
    .map(w => ({
      id: w.id,
      label: `${w.icon} ${w.name}${w.lastFourDigits ? ` (****${w.lastFourDigits})` : ''}`,
      icon: w.icon,
      color: w.color,
    }));

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

  const calculateTotalToPay = () => {
    return formData.monthlyPayment * formData.termMonths;
  };

  const totalToPay = calculateTotalToPay();
  const totalInterest = totalToPay - formData.originalAmount;

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
    
    // Validar balance para Lent antes de crear
    if (formData.type === 'lent' && formData.originalAmount > realAvailableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(realAvailableBalance)}`);
      setToastMessage(`Cannot create loan: ${balanceError}`);
      setToastType('error');
      setShowToast(true);
      return;
    }

    const category = getOrCreateCategory(formData.type);
    const isIncome = formData.type === 'borrowed';

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
      });
      
      // Actualizar balance de wallet
      updateWalletBalance(formData.walletId, formData.originalAmount, isIncome);
      
      setToastMessage('Debt created successfully');
      setToastType('success');
    }
    
    setShowToast(true);
    resetForm();
    setShowModal(false);
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
    setErrors({
      creditorName: '',
      walletId: '',
      originalAmount: '',
    });
    setBalanceError(null);
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-white/10 sticky top-0 bg-[#1A1A2E]">
              <h3 className="text-lg font-light text-white">{editingDebt ? 'Edit Debt' : 'New Debt'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Debt Type */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Debt Type *</label>
                <div className="flex gap-3">
                  <button onClick={() => setFormData({ ...formData, type: 'borrowed' })} className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${formData.type === 'borrowed' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
                    <TrendingDown className="w-4 h-4" /> I Owe
                  </button>
                  <button onClick={() => setFormData({ ...formData, type: 'lent' })} className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${formData.type === 'lent' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
                    <TrendingUp className="w-4 h-4" /> Owed to Me
                  </button>
                </div>
              </div>
              {/* Creditor/Borrower Name */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  {formData.type === 'borrowed' ? 'Lender Name' : 'Borrower Name'} *
                </label>
                <input
                  type="text"
                  value={formData.creditorName}
                  onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                  placeholder={formData.type === 'borrowed' ? 'Bank, Friend, Family...' : 'Person who owes you...'}
                />
                {errors.creditorName && <p className="text-[10px] text-red-500/80 mt-1">{errors.creditorName}</p>}
              </div>

              {/* Wallet */}
              <div>
                <CustomSelect
                  label="Wallet"
                  value={formData.walletId}
                  onChange={(value) => setFormData({ ...formData, walletId: value })}
                  options={walletOptions}
                  placeholder="Select a wallet"
                  required
                  error={errors.walletId}
                />
                {formData.walletId && selectedWallet && (
                  <p className={`text-[10px] mt-1 ${formData.type === 'lent' && formData.originalAmount > realAvailableBalance ? 'text-red-500/80' : 'text-white/40'}`}>
                    Available balance: {formatCurrency(realAvailableBalance)}
                  </p>
                )}
              </div>

              {/* Amount */}
              <NumberInput
                label="Amount"
                value={formData.originalAmount}
                onChange={(value) => setFormData({ ...formData, originalAmount: value })}
                placeholder="0"
                min={1}
                required
                error={errors.originalAmount}
                showPreview
                previewLabel="Amount"
              />

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
                onChange={(value) => setFormData({ ...formData, monthlyPayment: value })}
                placeholder="0"
                min={1}
                required
                showPreview
                previewLabel="Monthly payment"
              />

              {/* Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">Interest Type</label>
                  <div className="flex gap-2">
                    <button onClick={() => setFormData({ ...formData, interestType: 'fixed' })} className={`flex-1 py-2 rounded-lg text-xs font-light transition-all duration-200 ${formData.interestType === 'fixed' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>Fixed</button>
                    <button onClick={() => setFormData({ ...formData, interestType: 'variable' })} className={`flex-1 py-2 rounded-lg text-xs font-light transition-all duration-200 ${formData.interestType === 'variable' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>Variable</button>
                  </div>
                </div>
              </div>

              {/* Term */}
              <NumberInput
                label="Term (months)"
                value={formData.termMonths}
                onChange={(value) => setFormData({ ...formData, termMonths: value })}
                placeholder="12"
                min={1}
              />

              {/* Start Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                />
              </div>

              {/* Payment Summary */}
              {formData.originalAmount > 0 && formData.termMonths > 0 && formData.monthlyPayment > 0 && (
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-[10px] text-white/40 mb-2">Payment Summary</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/40">Total to Pay:</span>
                      <span className="text-white/60">{formatCurrency(totalToPay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Total Interest:</span>
                      <span className="text-yellow-500">{formatCurrency(totalInterest)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light resize-none"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-[#1A1A2E]">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light">
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!!balanceError}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 ${
                  balanceError
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899] hover:scale-[1.02]'
                }`}
              >
                <Save className="w-4 h-4" />
                {editingDebt ? 'Update' : 'Create'}
              </button>
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

// Debt Card Component
const DebtCard: React.FC<{ debt: any; onEdit: (debt: any) => void; onDelete: (id: string, e?: React.MouseEvent) => void; onClick: (debt: any) => void; isCompleted?: boolean }> = ({ debt, onEdit, onDelete, onClick, isCompleted }) => {
  const { wallets } = useStore();
  const wallet = wallets.find(w => w.id === debt.walletId);
  const progress = ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100;

  return (
    <div onClick={() => onClick(debt)} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${debt.type === 'borrowed' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {debt.type === 'borrowed' ? <TrendingDown className="w-5 h-5 text-red-500" /> : <TrendingUp className="w-5 h-5 text-green-500" />}
          </div>
          <div>
            <h3 className="text-sm font-light text-white">{debt.creditorName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40">{wallet?.icon} {wallet?.name}</span>
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
        <div className="flex justify-between text-xs"><span className="text-white/40">Remaining</span><span className={debt.type === 'borrowed' ? 'text-red-500' : 'text-green-500'}>{formatCurrency(debt.remainingBalance)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/40">Monthly</span><span className="text-white/60">{formatCurrency(debt.monthlyPayment)}</span></div>
        <div className="pt-2"><div className="flex justify-between text-[10px] mb-1"><span className="text-white/40">Progress</span><span className="text-white/40">{Math.round(progress)}%</span></div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div>
        {isCompleted && <div className="flex items-center gap-2 pt-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] text-green-500/80">Completed</span></div>}
      </div>
    </div>
  );
};

export default Debts;