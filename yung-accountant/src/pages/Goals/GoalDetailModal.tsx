// components/modals/GoalDetailModal.tsx
import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect from '../../components/common/CustomSelect';
import ConfettiEffect from '../../components/common/ConfettiEffect';
import ConfirmModal from '../../components/common/ConfirmModal';
import CompleteGoalConfirmModal from '../../components/modals/CompleteGoalConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { useNavigate } from 'react-router-dom';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
import GoalTransactionsTable from './GoalTransactionsTable';
import { 
  X, PlusCircle, Calendar, Target, TrendingUp,
  Edit2, Trash2, ArrowLeft, Lock, AlertCircle, PlusCircle as PlusCircleIcon
} from 'lucide-react';
import { useGoalStore, useWalletStore } from '../../store';

interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  isOpen, onClose, goalId, onEdit, onDelete,
}) => {
  const { goals, addGoalTransaction, updateGoal } = useGoalStore();
  const { wallets } = useWalletStore();
  const navigate = useNavigate();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [addAmount, setAddAmount] = useState(0);
  const [, setRemoveAmount] = useState(0);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [note, setNote] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [, setRemoveError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingAddAmount, setPendingAddAmount] = useState(0);
  const [pendingNote, setPendingNote] = useState('');

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
  
  const goal = goals.find(g => g.id === goalId);
  const isCompleted = goal?.status === 'completed';

  const activeWallets = wallets.filter(w => w.isActive);
  const hasActiveWallets = activeWallets.length > 0;
  const noWalletsMessage = !hasActiveWallets && wallets.length === 0;
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const currentWalletBalance = selectedWallet?.currentBalance || 0;

  const handleCreateWallet = () => { onClose(); navigate('/wallets'); };

  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false); setShowRemoveForm(false);
      setAddAmount(0); setRemoveAmount(0);
      setSelectedWalletId(''); setNote('');
      setAddError(null); setRemoveError(null); setBalanceError(null);
    }
  }, [isOpen]);

  if (!isOpen || !goal) return null;

  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const maxAdd = remaining;
  const willComplete = (goal.currentAmount + addAmount) >= goal.targetAmount;

  const priorityColor = goal.priority === 'high' 
    ? { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' } 
    : goal.priority === 'medium' 
    ? { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)' } 
    : { text: '#10B981', bg: 'rgba(16,185,129,0.12)' };

  const validateAddAmount = (amount: number): boolean => {
    if (amount <= 0) { setAddError('Amount must be greater than 0'); return false; }
    if (amount > maxAdd) { setAddError(`Cannot exceed goal target. Max: ${formatCurrency(maxAdd)}`); return false; }
    if (selectedWalletId && amount > currentWalletBalance) { setBalanceError(`Insufficient balance. Available: ${formatCurrency(currentWalletBalance)}`); return false; }
    if (!selectedWalletId && hasActiveWallets) { setAddError('Please select a wallet'); return false; }
    setAddError(null); setBalanceError(null);
    return true;
  };

  const handleAmountChange = (value: number) => {
    setAddAmount(value);
    if (selectedWalletId && value > 0) {
      if (value > currentWalletBalance) {
        setBalanceError(`Insufficient balance. Available: ${formatCurrency(currentWalletBalance)}`);
      } else { setBalanceError(null); }
    }
  };

  const handleWalletChange = (walletId: string) => {
    setSelectedWalletId(walletId); setBalanceError(null);
    if (addAmount > 0) {
      const wallet = wallets.find(w => w.id === walletId);
      if (wallet && addAmount > wallet.currentBalance) {
        setBalanceError(`Insufficient balance. Available: ${formatCurrency(wallet.currentBalance)}`);
      }
    }
  };

  const executeAddFundsAndComplete = async () => {
    const amountToAdd = pendingAddAmount || addAmount;
    const noteToUse = pendingNote || note;
    const walletIdToUse = selectedWalletId;
    
    await addGoalTransaction(goal.id, {
      amount: amountToAdd, type: 'add',
      note: noteToUse || 'Added funds',
      date: new Date().toISOString(), walletId: walletIdToUse,
    });

    const newAmount = goal.currentAmount + amountToAdd;
    const willCompleteNow = newAmount >= goal.targetAmount;
    
    await updateGoal(goal.id, { currentAmount: newAmount, status: willCompleteNow ? 'completed' : 'active' });
    const { fetchGoals } = useGoalStore.getState();
    await fetchGoals(true);
    
    if (willCompleteNow) {
      setShowConfetti(true);
      setToastMessage(`Congratulations! You completed "${goal.name}"!`);
      setToastType('success'); setShowToast(true);
      setTimeout(() => onClose(), 2000);
    } else {
      setToastMessage(`Added ${formatCurrency(amountToAdd)} to "${goal.name}"`);
      setToastType('success'); setShowToast(true);
    }
    
    setAddAmount(0); setSelectedWalletId(''); setNote('');
    setShowAddForm(false); setPendingAddAmount(0); setPendingNote('');
  };

  const handleAddFunds = () => {
    if (!hasActiveWallets) { setAddError('Please create a wallet first'); return; }
    if (!selectedWalletId) { setAddError('Please select a wallet'); return; }
    if (!validateAddAmount(addAmount)) return;
    
    if (willComplete) {
      setPendingAddAmount(addAmount); setPendingNote(note);
      setShowCompleteConfirm(true);
    } else {
      executeAddFundsAndComplete();
    }
  };

  const handleConfirmComplete = () => {
    executeAddFundsAndComplete();
    setShowCompleteConfirm(false);
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  return (
    <>
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl flex flex-col max-h-[90vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
          {/* Header */}
          <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
              <div>
                <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{goal.name}</h3>
                <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {isCompleted ? 'Completed Goal' : 'Goal details & history'}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {!isCompleted && (
                <>
                  <button onClick={onEdit} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                    <Edit2 className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  </button>
                  <button onClick={handleDeleteClick} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                    <Trash2 className="w-4 h-4" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
                  </button>
                </>
              )}
              <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto modal-scroll">
            <div className="p-5 space-y-5">
              {/* Goal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1.25rem] p-4 glass-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Target className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Target</span>
                  </div>
                  <p className="text-xl font-light tracking-[-0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(goal.targetAmount)}</p>
                </div>
                <div className="rounded-[1.25rem] p-4 glass-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10B981' }} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Saved</span>
                  </div>
                  <p className="text-xl font-light tracking-[-0.02em]" style={{ color: '#10B981' }}>{formatCurrency(goal.currentAmount)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Progress</span>
                  <span className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--theme-gradient-primary)', boxShadow: '0 0 16px -4px var(--theme-primary)' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-medium mt-2" style={{ color: 'var(--theme-text-tertiary)' }}>
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span>{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>

              {/* Goal Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ color: priorityColor.text, backgroundColor: priorityColor.bg }}>
                    {goal.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  <span className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Due: {formatDate(goal.targetDate, 'long')}</span>
                </div>
                {goal.context && (
                  <div className="col-span-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Context: {goal.context}</span>
                  </div>
                )}
                {isCompleted && (
                  <div className="col-span-2 flex items-center gap-2.5 mt-2 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <Lock className="w-4 h-4" style={{ color: '#10B981' }} strokeWidth={1.5} />
                    <span className="text-xs font-medium" style={{ color: '#10B981', opacity: 0.85 }}>Completed Goal - No further modifications allowed</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isCompleted && (
                <div className="flex gap-3">
                  {!showAddForm && !showRemoveForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      disabled={progress >= 100}
                      className={`flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-500 hover:-translate-y-1 ${
                        progress >= 100 ? 'opacity-20 cursor-not-allowed glass-sm' : ''
                      }`}
                      style={{ 
                        backgroundColor: progress >= 100 ? 'var(--theme-background-glass-hover)' : '#10B981',
                        color: progress >= 100 ? 'var(--theme-text-tertiary)' : '#FFFFFF',
                        boxShadow: progress >= 100 ? 'none' : '0 4px 20px -6px #10B981'
                      }}
                    >
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                      Add Funds
                    </button>
                  )}

                  {/* Add Form */}
                  {showAddForm && (
                    <div className="w-full space-y-4">
                      <CustomSelect
                        label="Wallet"
                        value={selectedWalletId}
                        onChange={handleWalletChange}
                        options={walletOptions}
                        placeholder={noWalletsMessage ? "No wallets available" : "Select a wallet"}
                        required
                      />
                      
                      {noWalletsMessage && (
                        <div className="p-3 rounded-[1rem] flex items-center gap-2.5" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                          <p className="text-xs font-medium" style={{ color: '#F59E0B', opacity: 0.85 }}>
                            You don't have any wallets yet.{' '}
                            <button onClick={handleCreateWallet} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline" style={{ color: '#F59E0B' }}>
                              <PlusCircleIcon className="w-3.5 h-3.5" /> Create wallet
                            </button>
                          </p>
                        </div>
                      )}

                      {selectedWalletId && selectedWallet && !noWalletsMessage && (
                        <div className="text-[10px] font-medium flex items-center gap-1.5" style={{ color: addAmount > currentWalletBalance ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
                          <WalletIcon className="w-3 h-3" />
                          <span>Available balance: {formatCurrency(currentWalletBalance)}</span>
                        </div>
                      )}

                      <NumberInput
                        label="Amount to add"
                        value={addAmount}
                        onChange={handleAmountChange}
                        placeholder={`Max: ${formatCurrency(Math.min(maxAdd, currentWalletBalance))}`}
                        max={Math.min(maxAdd, currentWalletBalance)}
                        min={1}
                        showPreview
                        previewLabel="You are adding"
                      />
                      <div>
                        <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Note (optional)</label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note about this contribution"
                          className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                          style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleAddFunds} 
                          disabled={!hasActiveWallets || !selectedWalletId || addAmount <= 0 || !!balanceError}
                          className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-1 ${
                            !hasActiveWallets || !selectedWalletId || addAmount <= 0 || balanceError
                              ? 'opacity-20 cursor-not-allowed glass-sm'
                              : ''
                          }`}
                          style={{ 
                            backgroundColor: !hasActiveWallets || !selectedWalletId || addAmount <= 0 || balanceError ? 'var(--theme-background-glass-hover)' : '#10B981',
                            color: !hasActiveWallets || !selectedWalletId || addAmount <= 0 || balanceError ? 'var(--theme-text-tertiary)' : '#FFFFFF',
                            boxShadow: !hasActiveWallets || !selectedWalletId || addAmount <= 0 || balanceError ? 'none' : '0 4px 16px -4px #10B981'
                          }}
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => { setShowAddForm(false); setAddAmount(0); setSelectedWalletId(''); setNote(''); setAddError(null); setBalanceError(null); }} 
                          className="flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                          style={{ color: 'var(--theme-text-tertiary)' }}
                        >
                          Cancel
                        </button>
                      </div>
                      {(addError || balanceError) && (
                        <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                          <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{addError || balanceError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction History */}
              <GoalTransactionsTable goalId={goal.id} isReadOnly={isCompleted}/>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.name}"? ALL associated transactions and savings will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Everything"
        type="danger"
      />

      <CompleteGoalConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => { setShowCompleteConfirm(false); setPendingAddAmount(0); setPendingNote(''); }}
        onConfirm={handleConfirmComplete}
        goalName={goal.name}
      />

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default GoalDetailModal;