// components/modals/TransactionModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useWalletStore, useTransactionStore } from '../../store';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect from '../../components/common/CustomSelect';
import { formatCurrency } from '../../utils/formatters';
import { AlertCircle, Save, X, PlusCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIconComponent } from '../../utils/iconHelpers';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
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
        disabled: false 
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                  {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
                </h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                  {editingTransaction ? 'Update your transaction' : 'Record a financial movement'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            <div className={isDebtTransaction ? 'opacity-50 pointer-events-none' : ''}>
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

            <div className={isDebtTransaction ? 'opacity-50 pointer-events-none' : ''}>
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

            <div className={isDebtTransaction ? 'opacity-50 pointer-events-none' : ''}>
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

              {walletId && selectedWallet && !noWalletsMessage && (
                  <div className={`mt-1 text-[10px] flex items-center gap-1 font-light ${isExpense && amount > realAvailableBalance ? 'text-red-500/80' : 'text-[var(--theme-text-tertiary)]'}`}>
                      <span>Available balance: {formatCurrency(realAvailableBalance)}</span>
                  </div>
              )}
            </div>

            <div className={isDebtTransaction ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors placeholder:text-[var(--theme-text-tertiary)]/20"
                placeholder="What was this for?"
                disabled={isDebtTransaction}
              />
            </div>

            <div className={isDebtTransaction ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
                disabled={isDebtTransaction}
              />
            </div>

            {balanceError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-500/80">{balanceError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
            >
              Cancel
            </button>
            {!isDebtTransaction ? (
              <button
                onClick={handleSubmit}
                disabled={!!balanceError || noWalletsMessage}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
                  balanceError || noWalletsMessage
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)]'
                }`}
              >
                <Save className="w-4 h-4" />
                {editingTransaction ? 'Update' : 'Save'}
              </button>
            ) : (
              <button
                onClick={handleGoToDebts}
                className="flex-1 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-500 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2"
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