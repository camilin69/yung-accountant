// components/modals/GoalDetailModal.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import NumberInput from '../common/NumberInput';
import CustomSelect from '../common/CustomSelect';
import ConfettiEffect from '../common/ConfettiEffect';
import ConfirmModal from '../common/ConfirmModal';
import CompleteGoalConfirmModal from './CompleteGoalConfirmModal';
import ToastNotification from '../common/ToastNotification';
import { useNavigate } from 'react-router-dom';
import { Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
import { 
  X, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Target, 
  TrendingUp,
  Clock,
  Edit2,
  Trash2,
  ArrowLeft,
  Lock,
  AlertCircle,
  PlusCircle as PlusCircleIcon
} from 'lucide-react';

interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  isOpen,
  onClose,
  goalId,
  onEdit,
  onDelete,
}) => {
  const { goals, categories, wallets, updateGoalAmount, addGoalTransaction, updateGoal, addTransaction } = useStore();
  const navigate = useNavigate();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [addAmount, setAddAmount] = useState(0);
  const [removeAmount, setRemoveAmount] = useState(0);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [note, setNote] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
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

  // Verificar si hay wallets activas
  const activeWallets = wallets.filter(w => w.isActive);
  const hasActiveWallets = activeWallets.length > 0;
  const noWalletsMessage = !hasActiveWallets && wallets.length === 0;
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const currentWalletBalance = selectedWallet?.currentBalance || 0;


  const handleCreateWallet = () => {
    onClose();
    navigate('/wallets');
  };

  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false);
      setShowRemoveForm(false);
      setAddAmount(0);
      setRemoveAmount(0);
      setSelectedWalletId('');
      setNote('');
      setAddError(null);
      setRemoveError(null);
      setBalanceError(null);
    }
  }, [isOpen]);

  if (!isOpen || !goal) return null;

  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const maxAdd = remaining;
  const maxRemove = goal.currentAmount;
  const willComplete = (goal.currentAmount + addAmount) >= goal.targetAmount;

  const priorityColor = goal.priority === 'high' ? 'text-red-500/80 bg-red-500/10' : 
                       goal.priority === 'medium' ? 'text-yellow-500/80 bg-yellow-500/10' : 
                       'text-green-500/80 bg-green-500/10';

  const validateAddAmount = (amount: number): boolean => {
    if (amount <= 0) {
      setAddError('Amount must be greater than 0');
      return false;
    }
    if (amount > maxAdd) {
      setAddError(`Cannot exceed goal target. Max: ${formatCurrency(maxAdd)}`);
      return false;
    }
    // Validación contra balance de la wallet seleccionada
    if (selectedWalletId && amount > currentWalletBalance) {
      setBalanceError(`Insufficient balance. Available: ${formatCurrency(currentWalletBalance)}`);
      return false;
    }
    if (!selectedWalletId && hasActiveWallets) {
      setAddError('Please select a wallet');
      return false;
    }
    setAddError(null);
    setBalanceError(null);
    return true;
  };

  const validateRemoveAmount = (amount: number): boolean => {
    if (amount <= 0) {
      setRemoveError('Amount must be greater than 0');
      return false;
    }
    if (amount > maxRemove) {
      setRemoveError(`Cannot remove more than saved. Max: ${formatCurrency(maxRemove)}`);
      return false;
    }
    setRemoveError(null);
    return true;
  };

  const handleAmountChange = (value: number) => {
    setAddAmount(value);
    if (selectedWalletId && value > 0) {
      if (value > currentWalletBalance) {
        setBalanceError(`Insufficient balance. Available: ${formatCurrency(currentWalletBalance)}`);
      } else {
        setBalanceError(null);
      }
    }
  };

  const handleWalletChange = (walletId: string) => {
    setSelectedWalletId(walletId);
    setBalanceError(null);
    if (addAmount > 0) {
      const wallet = wallets.find(w => w.id === walletId);
      if (wallet && addAmount > wallet.currentBalance) {
        setBalanceError(`Insufficient balance. Available: ${formatCurrency(wallet.currentBalance)}`);
      }
    }
  };

  // Ejecutar la adición de fondos y completar la meta (con transacción automática)
  const executeAddFundsAndComplete = () => {
    const amountToAdd = pendingAddAmount || addAmount;
    const noteToUse = pendingNote || note;
    const walletIdToUse = selectedWalletId;
    
    const newAmount = goal.currentAmount + amountToAdd;
    const willCompleteNow = newAmount >= goal.targetAmount;
    
    // NO crear transacción real - Solo actualizar el goal internamente
    // El dinero no se mueve físicamente, es solo una promesa de ahorro
    
    // Actualizar el monto de la meta
    updateGoalAmount(goal.id, newAmount);
    
    // Registrar la transacción interna (solo para historial del goal)
    addGoalTransaction(goal.id, {
      goalId: goal.id,
      amount: amountToAdd,
      type: 'add',
      note: noteToUse || 'Added funds',
      date: new Date().toISOString(),
      walletId: walletIdToUse,
    });
    
    if (willCompleteNow) {
      // Buscar la categoría de compra guardada en la meta
      const purchaseCategoryId = goal.purchaseCategoryId;
      const category = categories.find(c => c.id === purchaseCategoryId);
      
      if (category && walletIdToUse) {
        // SOLO cuando se completa la compra, se crea la transacción real
        addTransaction({
          amount: newAmount,
          categoryId: category.id,
          walletId: walletIdToUse,
          description: `Purchase: ${goal.name}`,
          date: new Date().toISOString().split('T')[0],
          tags: ['goal', 'purchase', goal.id],
        });
      }
      
      updateGoal(goal.id, { status: 'completed' });
      setShowConfetti(true);
      setToastMessage(`🎉 Congratulations! You completed and purchased "${goal.name}"!`);
      setToastType('success');
      setShowToast(true);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setToastMessage(`Added ${formatCurrency(amountToAdd)} to "${goal.name}" (virtual savings)`);
      setToastType('success');
      setShowToast(true);
    }
    
    setAddAmount(0);
    setSelectedWalletId('');
    setNote('');
    setShowAddForm(false);
    setPendingAddAmount(0);
    setPendingNote('');
  };


  // Manejar el clic en "Add Funds"
  const handleAddFunds = () => {
    if (!hasActiveWallets) {
      setAddError('Please create a wallet first');
      return;
    }
    if (!selectedWalletId) {
      setAddError('Please select a wallet');
      return;
    }
    if (!validateAddAmount(addAmount)) return;
    
    if (willComplete) {
      // Guardar datos pendientes y mostrar modal de confirmación
      setPendingAddAmount(addAmount);
      setPendingNote(note);
      setShowCompleteConfirm(true);
    } else {
      executeAddFundsAndComplete();
    }
  };

  // Manejar la confirmación de completar la meta
  const handleConfirmComplete = () => {
    executeAddFundsAndComplete();
    setShowCompleteConfirm(false);
  };

  // Manejar la eliminación de fondos
  const handleRemoveFunds = () => {
    if (!validateRemoveAmount(removeAmount)) return;
    
    const newAmount = goal.currentAmount - removeAmount;
    updateGoalAmount(goal.id, newAmount);
    addGoalTransaction(goal.id, {
      goalId: goal.id,
      amount: removeAmount,
      type: 'remove',
      note: note || 'Removed funds',
      date: new Date().toISOString(),
      walletId: selectedWalletId,
    });
    
    setRemoveAmount(0);
    setNote('');
    setShowRemoveForm(false);
    
    setToastMessage(`Removed ${formatCurrency(removeAmount)} from "${goal.name}"`);
    setToastType('warning');
    setShowToast(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const transactions = goal.transactions || [];
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 z-10">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </button>
                <div>
                  <h3 className="text-lg font-light text-white">{goal.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">
                    {isCompleted ? 'Completed Goal' : 'Goal details & history'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!isCompleted && (
                  <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit2 className="w-4 h-4 text-white/60" />
                  </button>
                )}
                <button onClick={handleDeleteClick} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-white/60 hover:text-red-500" />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Goal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-[10px] text-white/40 font-light">Target</span>
                  </div>
                  <p className="text-lg font-light text-white">{formatCurrency(goal.targetAmount)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500/80" />
                    <span className="text-[10px] text-white/40 font-light">Saved</span>
                  </div>
                  <p className="text-lg font-light text-green-500">{formatCurrency(goal.currentAmount)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/40 font-light">Progress</span>
                  <span className="text-white/60 font-light">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/30 font-light mt-2">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span>{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>

              {/* Goal Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColor}`}>
                    {goal.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs text-white/40 font-light">Due: {formatDate(goal.targetDate, 'long')}</span>
                </div>
                {goal.context && (
                  <div className="col-span-2">
                    <span className="text-xs text-white/40 font-light">Context: {goal.context}</span>
                  </div>
                )}
                {isCompleted && (
                  <div className="col-span-2 flex items-center gap-2 mt-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Lock className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-500/80 font-light">Completed Goal - No further modifications allowed</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isCompleted && (
                <div className="flex gap-3">
                  {!showAddForm && !showRemoveForm && (
                    <>
                      <button
                        onClick={() => setShowAddForm(true)}
                        disabled={progress >= 100}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-light flex items-center justify-center gap-2 transition-all duration-300 ${
                          progress >= 100
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-[1.02]'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Funds
                      </button>
                      <button
                        onClick={() => setShowRemoveForm(true)}
                        disabled={goal.currentAmount === 0}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-light flex items-center justify-center gap-2 transition-all duration-300 ${
                          goal.currentAmount === 0
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:scale-[1.02]'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4" />
                        Remove Funds
                      </button>
                    </>
                  )}

                  {/* Add Form */}
                  {showAddForm && (
                    <div className="w-full space-y-4">
                      {/* Wallet Selector */}
                      <div>
                        <CustomSelect
                          label="Wallet"
                          value={selectedWalletId}
                          onChange={handleWalletChange}
                          options={walletOptions}
                          placeholder={noWalletsMessage ? "No wallets available" : "Select a wallet"}
                          required
                        />
                        
                        {/* Mensaje de "No wallets" con enlace para crear */}
                        {noWalletsMessage && (
                          <div className="mt-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <p className="text-xs text-amber-500/80 flex items-center gap-2 flex-wrap">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>You don't have any wallets yet.</span>
                              <button
                                onClick={handleCreateWallet}
                                className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors font-medium underline-offset-2 hover:underline"
                              >
                                <PlusCircleIcon className="w-3.5 h-3.5" />
                                Create wallet
                              </button>
                            </p>
                          </div>
                        )}

                        {/* Mostrar balance si hay wallet seleccionada */}
                        {selectedWalletId && selectedWallet && !noWalletsMessage && (
                          <div className={`mt-1 text-[10px] flex items-center gap-1 font-light ${addAmount > currentWalletBalance ? 'text-red-500/80' : 'text-white/40'}`}>
                            <span>Available balance: {formatCurrency(currentWalletBalance)}</span>
                          </div>
                        )}
                      </div>

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
                        <label className="block text-xs text-white/40 mb-1.5 font-light">Note (optional)</label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note about this contribution"
                          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleAddFunds} 
                          disabled={!hasActiveWallets || !selectedWalletId || addAmount <= 0 || !!balanceError}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-300 ${
                            !hasActiveWallets || !selectedWalletId || addAmount <= 0 || balanceError
                              ? 'bg-white/10 text-white/30 cursor-not-allowed'
                              : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                          }`}
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => { setShowAddForm(false); setAddAmount(0); setSelectedWalletId(''); setNote(''); setAddError(null); setBalanceError(null); }} 
                          className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                      {(addError || balanceError) && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <p className="text-xs text-red-500/80">{addError || balanceError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove Form */}
                  {showRemoveForm && (
                    <div className="w-full space-y-4">
                      <NumberInput
                        label="Amount to remove"
                        value={removeAmount}
                        onChange={setRemoveAmount}
                        placeholder={`Max: ${formatCurrency(maxRemove)}`}
                        max={maxRemove}
                        min={1}
                        showPreview
                        previewLabel="You are removing"
                      />
                      <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-light">Note (optional)</label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note about this removal"
                          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleRemoveFunds} 
                          disabled={removeAmount <= 0}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-300 ${
                            removeAmount <= 0
                              ? 'bg-white/10 text-white/30 cursor-not-allowed'
                              : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                          }`}
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => { setShowRemoveForm(false); setRemoveAmount(0); setNote(''); setRemoveError(null); }} 
                          className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                      {removeError && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <p className="text-xs text-red-500/80">{removeError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction History */}
              <div>
                <h4 className="text-sm font-light text-white/60 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Transaction History
                  <span className="text-[10px] text-white/30 font-light">({sortedTransactions.length} transactions)</span>
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sortedTransactions.map(tx => {
                    const date = new Date(tx.date);
                    const dateStr = formatDate(tx.date, 'long');
                    const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'add' ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            {tx.type === 'add' ? (
                              <PlusCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <MinusCircle className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-light text-white/80 max-w-[200px] truncate">
                              {tx.note}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-white/30 font-light">{dateStr}</p>
                              <span className="text-[6px] text-white/20">•</span>
                              <p className="text-[10px] text-white/30 font-light">{timeStr}</p>
                            </div>
                          </div>
                        </div>
                        <p className={`text-sm font-light ${tx.type === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.type === 'add' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                  {sortedTransactions.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-2 bg-white/[0.03] rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white/20" />
                      </div>
                      <p className="text-white/30 text-sm font-light">No transactions yet</p>
                      <p className="text-white/20 text-xs font-light mt-1">Add funds to start tracking</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Complete Goal Confirm Modal */}
      <CompleteGoalConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => {
          setShowCompleteConfirm(false);
          setPendingAddAmount(0);
          setPendingNote('');
        }}
        onConfirm={handleConfirmComplete}
        goalName={goal.name}
      />

      {/* Toast Notification */}
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