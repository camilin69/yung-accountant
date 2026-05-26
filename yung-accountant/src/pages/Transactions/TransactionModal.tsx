// components/modals/TransactionModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useWalletStore, useTransactionStore } from '../../store';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect from '../../components/common/CustomSelect';
import { formatCurrency } from '../../utils/formatters';
import { AlertCircle, Save, X, PlusCircle, ArrowLeft, Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIconComponent } from '../../utils/iconHelpers';
import type { Category } from '../../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTransaction?: any;
  defaultDate?: string;
  incomeCategories: Category[];
  expenseCategories: Category[];
  categories: Category[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultDate,
  incomeCategories,
  expenseCategories,
  categories
}) => {
  const { wallets } = useWalletStore();
  const { addTransaction, updateTransaction } = useTransactionStore();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isDebtTransaction, setIsDebtTransaction] = useState(false);
  const [_debtWarningMessage, setDebtWarningMessage] = useState<string | null>(null);

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

  const selectedWallet = wallets.find(w => w.id === walletId);
  const availableBalance = selectedWallet?.currentBalance || 0;
  const hasActiveWallets = wallets.some(w => w.isActive);
  const noWalletsMessage = !hasActiveWallets && wallets.length === 0;
  const selectedCategory = categories.find(c => c.id === categoryId);
  const isExpense = selectedCategory?.type === 'expense';

  const realAvailableBalance = useMemo(() => {
    if (!selectedWallet) return 0;
    
    let balance = selectedWallet.currentBalance;
    
    // Si estamos editando, revertir el efecto de la transacción anterior
    if (editingTransaction) {
        const oldCategory = categories.find(c => c.id === editingTransaction.categoryId);
        if (oldCategory?.type === 'income') {
            balance -= editingTransaction.amount; // Quitar el ingreso anterior
        } else if (oldCategory?.type === 'expense') {
            balance += editingTransaction.amount; // Devolver el gasto anterior
        }
    }
    
    return balance;
  }, [selectedWallet, editingTransaction, categories]);

  
  useEffect(() => {
    if (isExpense && amount > 0 && walletId && !isDebtTransaction) {
      if (amount > realAvailableBalance) {
        setBalanceError(`Insufficient balance. Available: ${formatCurrency(realAvailableBalance)}`);
      } else {
        setBalanceError(null);
      }
    } else {
      setBalanceError(null);
    }
  }, [amount, walletId, isExpense, realAvailableBalance, isDebtTransaction]);

  
  const categoryOptions = [
    ...(incomeCategories.filter((cat: Category) => !cat.isSystem).length > 0 
      ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: null, disabled: true }] 
      : []),
    ...incomeCategories
      .filter((cat: Category) => !cat.isSystem)  // <-- Solo no sistema
      .map(cat => {
        const IconComponent = getIconComponent(cat.icon);
        return { 
          id: cat.id, 
          label: cat.name, 
          icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
          color: cat.color,
          disabled: false 
        };
      }),
    ...(expenseCategories.filter((cat: Category) => !cat.isSystem).length > 0 
      ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: null, disabled: true }] 
      : []),
    ...expenseCategories
      .filter((cat: Category) => !cat.isSystem)  // <-- Solo no sistema
      .map(cat => {
        const IconComponent = getIconComponent(cat.icon);
        return { 
          id: cat.id, 
          label: cat.name, 
          icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
          color: cat.color,
          disabled: false 
        };
      }),
  ];


  const isFutureDate = (dateString: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateString);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate > today;
  };

  useEffect(() => {
    if (!isOpen) {
      setAmount(0);
      setDescription('');
      setCategoryId('');
      setWalletId('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setError(null);
      setBalanceError(null);
      setIsDebtTransaction(false);
      setDebtWarningMessage(null);
    } else if (editingTransaction && !isDebtTransaction) {
      setAmount(editingTransaction.amount);
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.categoryId);
      setWalletId(editingTransaction.walletId || '');
      setDate(editingTransaction.date);
      setError(null);
    } else if (editingTransaction && isDebtTransaction) {
      setAmount(0);
      setDescription('');
      setCategoryId('');
      setWalletId('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
    } else {
      setAmount(0);
      setDescription('');
      setWalletId('');
      setError(null);
      setBalanceError(null);
      const defaultCategory = categories.find(c => c.type === 'expense' && !c.isSystem);
      setCategoryId(defaultCategory?.id || '');
      const defaultWallet = wallets.find(w => w.isActive);
      setWalletId(defaultWallet?.id || '');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, editingTransaction, categories, wallets, defaultDate, isDebtTransaction]);

  const validateAmount = (value: number): boolean => {
    if (value <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreateWallet = () => {
    onClose();
    navigate('/wallets');
  };

  const handleGoToDebts = () => {
    onClose();
    navigate('/debts');
  };

  const handleSubmit = () => {
    if (isDebtTransaction) {
      setError('Debt transactions cannot be edited. Please manage them from the Debts module.');
      return;
    }

    if (!hasActiveWallets) {
      setError('Please create a wallet first');
      return;
    }

    if (!validateAmount(amount)) return;
    if (!categoryId) {
      setError('Please select a category');
      return;
    }
    if (!walletId) {
      setError('Please select a wallet');
      return;
    }
    
    if (isExpense && amount > availableBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
      return;
    }

    if (isFutureDate(date)) {
      setError('Transaction date cannot be in the future');
      return;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        amount,
        description,
        categoryId,
        walletId,
        date,
      });
    } else {
      addTransaction({
        amount,
        description,
        categoryId,
        walletId,
        date,
        tags: [],
      });
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[90vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
              </h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {editingTransaction ? 'Update your transaction' : 'Record a financial movement'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Amount */}
            <div className={isDebtTransaction ? 'opacity-30 pointer-events-none' : ''}>
              <NumberInput
                label="Amount"
                value={amount}
                onChange={setAmount}
                placeholder="0"
                min={1}
                required
                error={error}
                showPreview
                previewLabel="Amount"
                disabled={isDebtTransaction}
              />
            </div>

            {/* Category */}
            <div className={isDebtTransaction ? 'opacity-30 pointer-events-none' : ''}>
              <CustomSelect
                label="Category"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setError(null);
                }}
                options={categoryOptions}
                placeholder="Select a category"
                required
                disabled={isDebtTransaction}
              />
            </div>

            {/* Wallet */}
            <div className={isDebtTransaction ? 'opacity-30 pointer-events-none' : ''}>
              <CustomSelect
                label="Wallet"
                value={walletId}
                onChange={(value) => {
                  setWalletId(value);
                  setBalanceError(null);
                }}
                options={walletOptions}
                placeholder={noWalletsMessage ? "No wallets available" : "Select a wallet"}
                required
                disabled={isDebtTransaction}
              />
              
              {noWalletsMessage && (
                <div className="mt-2 p-3 rounded-[1rem] flex items-center gap-2.5" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <p className="text-xs font-medium" style={{ color: '#F59E0B', opacity: 0.85 }}>
                    You don't have any wallets yet.{' '}
                    <button
                      onClick={handleCreateWallet}
                      className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                      style={{ color: '#F59E0B' }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Create wallet
                    </button>
                  </p>
                </div>
              )}

              {walletId && selectedWallet && !noWalletsMessage && (
                  <div className="mt-1.5 text-[10px] font-medium flex items-center gap-1.5" style={{ color: isExpense && amount > realAvailableBalance ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
                      <WalletIcon className="w-3 h-3" />
                      <span>Available balance: {formatCurrency(realAvailableBalance)}</span>
                  </div>
              )}
            </div>

            {/* Description */}
            <div className={isDebtTransaction ? 'opacity-30 pointer-events-none' : ''}>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                placeholder="What was this for?"
                disabled={isDebtTransaction}
              />
            </div>

            {/* Date */}
            <div className={isDebtTransaction ? 'opacity-30 pointer-events-none' : ''}>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                disabled={isDebtTransaction}
              />
            </div>

            {/* Balance Error */}
            {balanceError && (
              <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{balanceError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Cancel
            </button>
            {!isDebtTransaction ? (
              <button
                onClick={handleSubmit}
                disabled={!!balanceError || noWalletsMessage}
                className={`flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1 ${
                  balanceError || noWalletsMessage ? '' : ''
                }`}
                style={{ 
                  backgroundColor: !balanceError && !noWalletsMessage ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                  boxShadow: !balanceError && !noWalletsMessage ? 'var(--shadow-button)' : 'none'
                }}
              >
                <Save className="w-4 h-4" />
                {editingTransaction ? 'Update' : 'Save'}
              </button>
            ) : (
              <button
                onClick={handleGoToDebts}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
              >
                <PlusCircle className="w-4 h-4" />
                Go to Debts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;